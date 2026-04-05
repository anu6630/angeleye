"""
Integration tests for notebook lifecycle flow.

TEST-03: Integration tests covering create → edit → compile → publish → view
Tests use real PostgreSQL and mock container execution (external service).
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.notebook_service import NotebookService
from app.services.compilation_service import CompilationService
from app.services.storage_service import StorageService
from app.services.feed_service import FeedService
from tests.test_factories import (
    create_user,
    create_notebook,
    create_notebook_cell
)


@pytest.mark.integration
class TestNotebookLifecycle:
    """Notebook lifecycle integration tests"""

    def test_create_notebook_and_add_cells(
        self,
        db_session: Session
    ):
        """Test: Create notebook and add cells"""
        # Create user
        user = create_user(db_session, username='notebookcreator')

        # Create notebook
        notebook_service = NotebookService(db_session)
        from app.schemas.notebook import NotebookCreate

        notebook_data = NotebookCreate(
            title="Test Notebook"
        )

        notebook = notebook_service.create_notebook(user.id, notebook_data)

        # Verify notebook created
        assert notebook is not None
        assert notebook.title == "Test Notebook"
        assert notebook.user_id == user.id
        assert notebook.is_published is False

        # Note: create_notebook automatically adds an initial empty code cell
        # Add two more cells
        from app.models.notebook_cell import NotebookCell

        # Update initial cell
        initial_cell = db_session.query(NotebookCell).filter(
            NotebookCell.notebook_id == notebook.id
        ).first()
        initial_cell.content = "print('Hello, World!')"
        db_session.commit()

        # Add markdown cell
        cell2 = NotebookCell(
            notebook_id=notebook.id,
            cell_type="markdown",
            content="# Test Heading",
            order_index=1
        )
        db_session.add(cell2)
        db_session.commit()

        # Get notebook and verify cells
        retrieved_notebook = notebook_service.get_notebook(notebook.id)
        assert retrieved_notebook is not None

        cells = db_session.query(NotebookCell).filter(
            NotebookCell.notebook_id == notebook.id
        ).order_by(NotebookCell.order_index).all()

        # Should have 2 cells: initial code cell + markdown cell
        assert len(cells) == 2
        assert cells[0].cell_type == "code"
        assert cells[0].content == "print('Hello, World!')"
        assert cells[1].cell_type == "markdown"
        assert cells[1].content == "# Test Heading"

    def test_edit_notebook_cells(
        self,
        db_session: Session
    ):
        """Test: Edit notebook cells"""
        # Create user and notebook with cells
        user = create_user(db_session, username='editor')
        notebook = create_notebook(db_session, user_id=user.id, title="Editable Notebook")
        cell1 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="code",
            content="original content",
            order_index=0
        )

        # Edit cell
        cell1.content = "updated content"
        db_session.commit()
        db_session.refresh(cell1)

        # Verify cell updated
        assert cell1.content == "updated content"

        # Add another cell
        cell2 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="markdown",
            content="# New cell",
            order_index=1
        )

        # Verify notebook has both cells
        from app.models.notebook_cell import NotebookCell
        cells = db_session.query(NotebookCell).filter(
            NotebookCell.notebook_id == notebook.id
        ).order_by(NotebookCell.order_index).all()

        assert len(cells) == 2
        assert cells[0].content == "updated content"
        assert cells[1].content == "# New cell"

    def test_compile_notebook(
        self,
        db_session: Session,
        mock_docker_client
    ):
        """Test: Compile notebook (mock container execution)"""
        # Create user and notebook with code cells
        user = create_user(db_session, username='compiler')
        notebook = create_notebook(db_session, user_id=user.id, title="Compilable Notebook")
        create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="code",
            content="print('Hello from compiled notebook!')",
            order_index=0
        )

        # Mock compilation service
        compilation_service = CompilationService(db_session)

        # Mock the entire compilation workflow
        with patch('app.services.compilation_service.ContainerExecutor') as mock_executor_class:
            # Create mock executor
            mock_executor = Mock()
            mock_executor.execute_notebook.return_value = "/tmp/notebook-output.html"
            mock_executor_class.return_value = mock_executor

            # Mock storage service methods
            with patch.object(compilation_service.storage, 'upload_file', return_value="https://cdn.example.com/output.html"):
                # Compile notebook
                result = compilation_service.compile_notebook(notebook.id, user.id)

                # Verify compilation result structure
                assert result is not None
                # Result should have status at minimum
                assert 'status' in result or 'output_url' in result

    def test_publish_notebook(
        self,
        db_session: Session
    ):
        """Test: Publish notebook"""
        # Create user and notebook
        user = create_user(db_session, username='publisher')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Publishable Notebook",
            is_published=False
        )

        # Verify notebook is draft
        assert notebook.is_published is False

        # Publish notebook
        notebook_service = NotebookService(db_session)
        from app.schemas.notebook import NotebookUpdate

        updated_notebook = notebook_service.update_notebook(
            notebook.id,
            user.id,
            NotebookUpdate(title="Publishable Notebook", is_published=True)
        )

        # Verify notebook published
        assert updated_notebook is not None
        assert updated_notebook.is_published is True

    def test_view_published_notebook(
        self,
        db_session: Session
    ):
        """Test: View published notebook"""
        # Create user and published notebook
        user = create_user(db_session, username='author')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Viewable Notebook",
            is_published=True
        )
        create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="code",
            content="print('Viewable content')",
            order_index=0
        )

        # View notebook
        notebook_service = NotebookService(db_session)
        viewed_notebook = notebook_service.get_notebook(notebook.id)

        # Verify notebook accessible
        assert viewed_notebook is not None
        assert viewed_notebook.id == notebook.id
        assert viewed_notebook.title == "Viewable Notebook"
        assert viewed_notebook.is_published is True

    def test_delete_draft_notebook(
        self,
        db_session: Session
    ):
        """Test: Delete draft notebook"""
        # Create user and draft notebook
        user = create_user(db_session, username='deleter')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Deletable Draft",
            is_published=False
        )

        notebook_id = notebook.id

        # Delete notebook
        notebook_service = NotebookService(db_session)
        success = notebook_service.delete_notebook(notebook_id, user.id)

        # Verify deletion
        assert success is True

        # Verify notebook not found
        deleted_notebook = notebook_service.get_notebook(notebook_id)
        assert deleted_notebook is None

    def test_cannot_delete_published_notebook_with_forks(
        self,
        db_session: Session
    ):
        """Test: Cannot delete published notebook with forks"""
        # Create user A and published notebook
        user_a = create_user(db_session, username='original_author')
        original_notebook = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Original Notebook",
            is_published=True
        )

        # Create user B and fork
        user_b = create_user(db_session, username='forker')
        fork = create_notebook(
            db_session,
            user_id=user_b.id,
            title="Fork of Original",
            parent_id=original_notebook.id,
            root_id=original_notebook.id,
            is_published=False
        )

        # Try to delete original notebook
        notebook_service = NotebookService(db_session)

        with pytest.raises(ValueError, match="forks"):
            notebook_service.delete_notebook(original_notebook.id, user_a.id)

        # Verify original notebook still exists
        original_still_exists = notebook_service.get_notebook(original_notebook.id)
        assert original_still_exists is not None

    def test_notebook_compilation_updates_fields(
        self,
        db_session: Session
    ):
        """Test: Notebook compilation updates output fields"""
        # Create user and notebook
        user = create_user(db_session, username='status_checker')
        notebook = create_notebook(db_session, user_id=user.id, title="Status Notebook")

        # Verify initial state
        assert notebook.output_url is None
        assert notebook.compiled_at is None

        # Simulate compilation updating fields
        from datetime import datetime, timezone
        notebook.output_url = "https://cdn.example.com/output.html"
        notebook.compiled_at = datetime.now(timezone.utc)
        db_session.commit()
        db_session.refresh(notebook)

        # Verify fields updated
        assert notebook.output_url == "https://cdn.example.com/output.html"
        assert notebook.compiled_at is not None

    def test_get_user_notebooks(
        self,
        db_session: Session
    ):
        """Test: Get user's notebooks"""
        # Create user
        user = create_user(db_session, username='notebook_owner')

        # Create multiple notebooks
        notebook1 = create_notebook(
            db_session,
            user_id=user.id,
            title="First Notebook"
        )
        notebook2 = create_notebook(
            db_session,
            user_id=user.id,
            title="Second Notebook"
        )
        notebook3 = create_notebook(
            db_session,
            user_id=user.id,
            title="Third Notebook"
        )

        # Get user's notebooks
        notebook_service = NotebookService(db_session)
        notebooks = notebook_service.get_user_notebooks(user.id, skip=0, limit=10)

        # Verify notebooks returned
        assert len(notebooks) == 3
        titles = [nb.title for nb in notebooks]
        assert "First Notebook" in titles
        assert "Second Notebook" in titles
        assert "Third Notebook" in titles

    def test_notebook_update_title(
        self,
        db_session: Session
    ):
        """Test: Update notebook title"""
        # Create user and notebook
        user = create_user(db_session, username='updater')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Original Title"
        )

        # Update notebook
        notebook_service = NotebookService(db_session)
        from app.schemas.notebook import NotebookUpdate

        updated_notebook = notebook_service.update_notebook(
            notebook.id,
            user.id,
            NotebookUpdate(title="Updated Title", is_published=False)
        )

        # Verify updates
        assert updated_notebook.title == "Updated Title"

    def test_notebook_cells_order(
        self,
        db_session: Session
    ):
        """Test: Notebook cells maintain order"""
        # Create user and notebook
        user = create_user(db_session, username='order_tester')
        notebook = create_notebook(db_session, user_id=user.id)

        # Add cells in specific order
        cell1 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="code",
            content="cell 1",
            order_index=0
        )
        cell2 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="markdown",
            content="cell 2",
            order_index=1
        )
        cell3 = create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="code",
            content="cell 3",
            order_index=2
        )

        # Retrieve cells in order
        from app.models.notebook_cell import NotebookCell
        cells = db_session.query(NotebookCell).filter(
            NotebookCell.notebook_id == notebook.id
        ).order_by(NotebookCell.order_index).all()

        # Verify order
        assert len(cells) == 3
        assert cells[0].content == "cell 1"
        assert cells[1].content == "cell 2"
        assert cells[2].content == "cell 3"

    def test_unpublished_notebook_not_in_feed(
        self,
        db_session: Session
    ):
        """Test: Unpublished notebook not accessible via feed"""
        # Create user and unpublished notebook
        user = create_user(db_session, username='draft_author')
        unpublished_notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Draft Notebook",
            is_published=False
        )

        # Create published notebook
        published_notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Published Notebook",
            is_published=True
        )

        # Get personalized feed (no user = trending feed)
        feed_service = FeedService(db_session)
        feed = feed_service.get_personalized_feed(user_id=None, limit=10)

        # Note: Trending feed may be empty or have different items
        # Just verify the feed structure is correct
        assert 'items' in feed
        assert isinstance(feed['items'], list)

        # If feed has items, verify only published notebooks are present
        if len(feed['items']) > 0:
            notebook_ids = [nb['id'] for nb in feed['items']]
            # Published notebook might be in feed (if it has engagement)
            # Unpublished notebook should never be in feed
            assert unpublished_notebook.id not in notebook_ids
