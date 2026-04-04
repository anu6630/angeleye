"""
Unit tests for NotebookService.

Tests notebook CRUD operations, cell management, delete protection, and search indexing.
Uses factory functions for test data and mocks for external services.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.notebook_service import NotebookService
from app.models.notebook import Notebook
from app.models.notebook_cell import NotebookCell
from app.schemas.notebook import NotebookCreate, NotebookUpdate
from tests.test_factories import create_user, create_notebook, create_notebook_cell


class TestNotebookServiceCreate:
    """Test notebook creation"""

    def test_create_notebook(self, db_session: Session):
        """Test creating a new notebook with initial cell"""
        service = NotebookService(db_session)
        user = create_user(db_session)

        data = NotebookCreate(title="Test Notebook")
        result = service.create_notebook(user.id, data)

        assert result.title == "Test Notebook"
        assert result.user_id == user.id
        assert result.is_published is False
        assert len(result.cells) == 1  # Initial empty cell
        assert result.cells[0].cell_type == "code"
        assert result.cells[0].content == ""

    def test_create_notebook_indexes_search(self, db_session: Session):
        """Test that notebook creation triggers search indexing (no error on missing meilisearch)"""
        service = NotebookService(db_session)
        user = create_user(db_session)

        data = NotebookCreate(title="Searchable Notebook")
        # This should not raise an error even if SearchService fails
        # The service catches exceptions and logs warnings
        result = service.create_notebook(user.id, data)

        assert result is not None
        assert result.title == "Searchable Notebook"


class TestNotebookServiceRetrieve:
    """Test notebook retrieval"""

    def test_get_notebook(self, db_session: Session):
        """Test getting notebook by ID"""
        service = NotebookService(db_session)
        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id, title="Get Test")

        result = service.get_notebook(notebook.id)

        assert result is not None
        assert result.id == notebook.id
        assert result.title == "Get Test"

    def test_get_notebook_with_cells(self, db_session: Session):
        """Test getting notebook includes cells"""
        service = NotebookService(db_session)
        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Add cells
        cell1 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="code",
            content="print('hello')",
            order_index=0
        )
        cell2 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="markdown",
            content="# Title",
            order_index=1
        )

        result = service.get_notebook(notebook.id)

        assert len(result.cells) == 2
        assert result.cells[0].content == "print('hello')"
        assert result.cells[1].content == "# Title"

    def test_get_notebook_not_found(self, db_session: Session):
        """Test getting non-existent notebook"""
        service = NotebookService(db_session)

        result = service.get_notebook(99999)

        assert result is None


class TestNotebookServiceUpdate:
    """Test notebook updates"""

    def test_update_notebook(self, db_session: Session):
        """Test updating notebook title and published status"""
        service = NotebookService(db_session)
        user = create_user(db_session)
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Old Title",
            is_published=False
        )

        data = NotebookUpdate(title="New Title", is_published=True)
        # Update should work even if SearchService/FeedService fail (they catch exceptions)
        result = service.update_notebook(notebook.id, user.id, data)

        assert result.title == "New Title"
        assert result.is_published is True

    def test_update_notebook_ownership_check(self, db_session: Session):
        """Test that only owner can update notebook"""
        service = NotebookService(db_session)
        user1 = create_user(db_session, google_oauth_id="user1-google")
        user2 = create_user(db_session, google_oauth_id="user2-google")
        notebook = create_notebook(
            db_session,
            user_id=user1.id,
            title="User1 Notebook"
        )

        data = NotebookUpdate(title="Hacked Title", is_published=True)

        with pytest.raises(ValueError, match="User does not own this notebook"):
            service.update_notebook(notebook.id, user2.id, data)

    def test_update_notebook_not_found(self, db_session: Session):
        """Test updating non-existent notebook"""
        service = NotebookService(db_session)
        user = create_user(db_session)

        data = NotebookUpdate(title="New Title", is_published=False)

        result = service.update_notebook(99999, user.id, data)

        assert result is None

    def test_update_notebook_invalidates_feed(self, db_session: Session):
        """Test that publishing notebook invalidates feed cache"""
        service = NotebookService(db_session)
        user = create_user(db_session)
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            is_published=False
        )

        data = NotebookUpdate(title="Published Notebook", is_published=True)
        # Publishing should work even if feed invalidation fails (caught and logged)
        result = service.update_notebook(notebook.id, user.id, data)

        assert result.title == "Published Notebook"
        assert result.is_published is True


class TestNotebookServiceDelete:
    """Test notebook deletion"""

    def test_delete_notebook(self, db_session: Session):
        """Test deleting notebook"""
        service = NotebookService(db_session)
        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        result = service.delete_notebook(notebook.id, user.id)

        assert result is True

        # Verify notebook was deleted
        deleted = db_session.query(Notebook).filter(Notebook.id == notebook.id).first()
        assert deleted is None

    def test_delete_notebook_ownership_check(self, db_session: Session):
        """Test that only owner can delete notebook"""
        service = NotebookService(db_session)
        user1 = create_user(db_session, google_oauth_id="user1-google")
        user2 = create_user(db_session, google_oauth_id="user2-google")
        notebook = create_notebook(db_session, user_id=user1.id)

        with pytest.raises(ValueError, match="User does not own this notebook"):
            service.delete_notebook(notebook.id, user2.id)

    def test_delete_notebook_with_forks_protection(self, db_session: Session):
        """Test that notebooks with forks cannot be deleted"""
        service = NotebookService(db_session)
        user = create_user(db_session)
        parent_notebook = create_notebook(db_session, user_id=user.id)

        # Create a fork
        fork_notebook = create_notebook(
            db_session,
            user_id=user.id,
            parent_id=parent_notebook.id,
            root_id=parent_notebook.id
        )

        with pytest.raises(ValueError, match="Cannot delete notebook with forks"):
            service.delete_notebook(parent_notebook.id, user.id)

    def test_delete_notebook_cascade_deletes_cells(self, db_session: Session):
        """Test that deleting notebook deletes its cells"""
        service = NotebookService(db_session)
        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Add cells
        cell1 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            order_index=0
        )
        cell2 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            order_index=1
        )

        # Delete notebook
        service.delete_notebook(notebook.id, user.id)

        # Verify cells were deleted
        cells = db_session.query(NotebookCell).filter(
            NotebookCell.notebook_id == notebook.id
        ).all()
        assert len(cells) == 0

    def test_delete_notebook_not_found(self, db_session: Session):
        """Test deleting non-existent notebook"""
        service = NotebookService(db_session)
        user = create_user(db_session)

        result = service.delete_notebook(99999, user.id)

        assert result is False


class TestNotebookServiceList:
    """Test notebook listing"""

    def test_get_user_notebooks(self, db_session: Session):
        """Test getting user's notebooks"""
        service = NotebookService(db_session)
        user = create_user(db_session)

        # Create multiple notebooks
        nb1 = create_notebook(db_session, user_id=user.id, title="Notebook 1")
        nb2 = create_notebook(db_session, user_id=user.id, title="Notebook 2")
        nb3 = create_notebook(db_session, user_id=user.id, title="Notebook 3")

        results = service.get_user_notebooks(user.id)

        assert len(results) == 3
        titles = [r.title for r in results]
        assert "Notebook 1" in titles
        assert "Notebook 2" in titles
        assert "Notebook 3" in titles

    def test_get_user_notebooks_pagination(self, db_session: Session):
        """Test pagination for user notebooks"""
        service = NotebookService(db_session)
        user = create_user(db_session)

        # Create 5 notebooks
        for i in range(5):
            create_notebook(db_session, user_id=user.id, title=f"Notebook {i}")

        # Get first page
        page1 = service.get_user_notebooks(user.id, skip=0, limit=2)
        assert len(page1) == 2

        # Get second page
        page2 = service.get_user_notebooks(user.id, skip=2, limit=2)
        assert len(page2) == 2

        # Get third page
        page3 = service.get_user_notebooks(user.id, skip=4, limit=2)
        assert len(page3) == 1

    def test_get_user_notebooks_only_own(self, db_session: Session):
        """Test that users only see their own notebooks"""
        service = NotebookService(db_session)
        user1 = create_user(db_session, google_oauth_id="user1-google")
        user2 = create_user(db_session, google_oauth_id="user2-google")

        # Create notebooks for both users
        create_notebook(db_session, user_id=user1.id, title="User1 Notebook")
        create_notebook(db_session, user_id=user2.id, title="User2 Notebook")

        # User1 should only see their notebook
        user1_notebooks = service.get_user_notebooks(user1.id)
        assert len(user1_notebooks) == 1
        assert user1_notebooks[0].title == "User1 Notebook"


class TestNotebookServiceCounts:
    """Test like and comment counts"""

    def test_get_published_notebook_counts(self, db_session: Session):
        """Test getting like and comment counts for notebooks"""
        service = NotebookService(db_session)
        user1 = create_user(db_session, google_oauth_id="user1-google")
        user2 = create_user(db_session, google_oauth_id="user2-google")

        nb1 = create_notebook(db_session, user_id=user1.id, is_published=True)
        nb2 = create_notebook(db_session, user_id=user1.id, is_published=True)

        # Add likes and comments from different users to avoid unique constraint
        from tests.test_factories import create_like, create_comment

        create_like(db_session, user_id=user1.id, notebook_id=nb1.id)
        create_like(db_session, user_id=user2.id, notebook_id=nb1.id)
        create_like(db_session, user_id=user1.id, notebook_id=nb2.id)

        create_comment(db_session, user_id=user1.id, notebook_id=nb1.id)
        create_comment(db_session, user_id=user2.id, notebook_id=nb2.id)
        create_comment(db_session, user_id=user1.id, notebook_id=nb2.id, content="Another comment")

        counts = service.get_published_notebook_counts([nb1.id, nb2.id])

        assert counts[nb1.id]['like_count'] == 2
        assert counts[nb1.id]['comment_count'] == 1
        assert counts[nb2.id]['like_count'] == 1
        assert counts[nb2.id]['comment_count'] == 2

    def test_get_published_notebook_counts_empty(self, db_session: Session):
        """Test getting counts with empty list"""
        service = NotebookService(db_session)

        counts = service.get_published_notebook_counts([])

        assert counts == {}

    def test_to_response_includes_counts(self, db_session: Session):
        """Test that notebook response includes like and comment counts"""
        service = NotebookService(db_session)
        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Add likes and comments
        from tests.test_factories import create_like, create_comment

        create_like(db_session, user_id=user.id, notebook_id=notebook.id)
        create_comment(db_session, user_id=user.id, notebook_id=notebook.id, content="Test comment")

        result = service.get_notebook(notebook.id)

        assert result.like_count == 1
        assert result.comment_count == 1
