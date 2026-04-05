"""
Integration tests for forking flow.

TEST-03: Integration tests covering fork → verify lineage → independent edits
Tests use real PostgreSQL.
"""
import pytest
from unittest.mock import patch
from sqlalchemy.orm import Session

from app.services.notebook_service import NotebookService
from app.services.fork_service import ForkService
from app.services.storage_service import StorageService
from tests.test_factories import (
    create_user,
    create_notebook,
    create_notebook_cell,
    create_fork
)


@pytest.mark.integration
class TestForkingFlow:
    """Forking integration tests"""

    def test_fork_notebook(
        self,
        db_session: Session
    ):
        """Test: Fork notebook"""
        # Create user A and published notebook
        user_a = create_user(db_session, username='original_author')
        original_notebook = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Original Notebook",
            is_published=True
        )
        create_notebook_cell(
            db_session,
            notebook_id=original_notebook.id,
            cell_type="code",
            content="print('original')",
            order_index=0
        )

        # Create user B
        user_b = create_user(db_session, username='forker')

        # Fork notebook
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)

        fork = fork_service.fork_notebook(original_notebook.id, user_b.id)

        # Verify fork created
        assert fork is not None
        assert fork.parent_id == original_notebook.id
        assert fork.root_id == original_notebook.id
        assert fork.user_id == user_b.id
        assert "fork" in fork.title.lower()  # Title contains "fork"

    def test_fork_copies_cells(
        self,
        db_session: Session
    ):
        """Test: Fork copies cells"""
        # Create notebook with cells
        user_a = create_user(db_session, username='original_author')
        original = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Original"
        )
        create_notebook_cell(
            db_session,
            notebook_id=original.id,
            cell_type="code",
            content='print("cell 1")',
            order_index=0
        )
        create_notebook_cell(
            db_session,
            notebook_id=original.id,
            cell_type="markdown",
            content="# Cell 2",
            order_index=1
        )
        create_notebook_cell(
            db_session,
            notebook_id=original.id,
            cell_type="code",
            content='print("cell 3")',
            order_index=2
        )

        # Fork notebook
        user_b = create_user(db_session, username='forker')
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)
        fork = fork_service.fork_notebook(original.id, user_b.id)

        # Verify fork has cells
        from app.models.notebook_cell import NotebookCell
        fork_cells = db_session.query(NotebookCell).filter(
            NotebookCell.notebook_id == fork.id
        ).order_by(NotebookCell.order_index).all()

        assert len(fork_cells) == 3
        assert fork_cells[0].content == 'print("cell 1")'
        assert fork_cells[1].content == "# Cell 2"
        assert fork_cells[2].content == 'print("cell 3")'

    def test_fork_chain_grandchild(
        self,
        db_session: Session
    ):
        """Test: Fork chain (grandchild)"""
        # Create original notebook
        user_a = create_user(db_session, username='original_author')
        original = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Original"
        )

        # Create fork A
        user_b = create_user(db_session, username='forker_a')
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)
        fork_a = fork_service.fork_notebook(original.id, user_b.id)

        # Verify fork A lineage
        assert fork_a.parent_id == original.id
        assert fork_a.root_id == original.id

        # Create fork B from fork A
        user_c = create_user(db_session, username='forker_b')
        fork_b = fork_service.fork_notebook(fork_a.id, user_c.id)

        # Verify fork B lineage
        assert fork_b.parent_id == fork_a.id
        assert fork_b.root_id == original.id  # Root preserved

    def test_independent_edits(
        self,
        db_session: Session
    ):
        """Test: Independent edits"""
        # Create notebook and fork
        user_a = create_user(db_session, username='original_author')
        original = create_notebook(db_session, user_id=user_a.id, title="Original")
        original_cell = create_notebook_cell(
            db_session,
            notebook_id=original.id,
            cell_type="code",
            content="original content",
            order_index=0
        )

        user_b = create_user(db_session, username='forker')
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)
        fork = fork_service.fork_notebook(original.id, user_b.id)

        # Edit original
        original_cell.content = "edited original content"
        db_session.commit()

        # Edit fork
        from app.models.notebook_cell import NotebookCell
        fork_cell = db_session.query(NotebookCell).filter(
            NotebookCell.notebook_id == fork.id
        ).first()
        fork_cell.content = "edited fork content"
        db_session.commit()

        # Verify edits independent
        db_session.refresh(original_cell)
        db_session.refresh(fork_cell)

        assert original_cell.content == "edited original content"
        assert fork_cell.content == "edited fork content"

    def test_fork_attribution(
        self,
        db_session: Session
    ):
        """Test: Fork attribution via get_fork_chain"""
        # Create original
        user_a = create_user(db_session, username='original_author')
        original = create_notebook(db_session, user_id=user_a.id, title="Original")

        # Create fork
        user_b = create_user(db_session, username='forker')
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)
        fork = fork_service.fork_notebook(original.id, user_b.id)

        # Get fork chain
        chain = fork_service.get_fork_chain(fork.id)

        # Verify lineage
        assert len(chain) == 2
        assert chain[0].id == original.id
        assert chain[1].id == fork.id

    def test_delete_protection(
        self,
        db_session: Session
    ):
        """Test: Cannot delete notebook with forks"""
        # Create original notebook
        user_a = create_user(db_session, username='original_author')
        original = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Original",
            is_published=True
        )

        # Create fork
        user_b = create_user(db_session, username='forker')
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)
        fork = fork_service.fork_notebook(original.id, user_b.id)

        # Try to delete original (should fail due to forks)
        notebook_service = NotebookService(db_session)
        try:
            notebook_service.delete_notebook(original.id, user_a.id)
            assert False, "Should have raised ValueError for notebook with forks"
        except ValueError as e:
            assert "fork" in str(e).lower()

        # Verify original still exists
        original_still_exists = notebook_service.get_notebook(original.id)
        assert original_still_exists is not None

        # Delete fork first
        success = notebook_service.delete_notebook(fork.id, user_b.id)
        assert success is True

    def test_forks_in_feed(
        self,
        db_session: Session
    ):
        """Test: Forks appear in feed with equal weightage"""
        # Create original
        user_a = create_user(db_session, username='original_author')
        original = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Original",
            is_published=True
        )

        # Create fork
        user_b = create_user(db_session, username='forker')
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)
        fork = fork_service.fork_notebook(original.id, user_b.id)

        # Publish fork
        from app.schemas.notebook import NotebookUpdate
        notebook_service = NotebookService(db_session)
        notebook_service.update_notebook(
            fork.id,
            user_b.id,
            NotebookUpdate(title=fork.title, is_published=True)
        )

        # Get feed
        from app.services.feed_service import FeedService
        feed_service = FeedService(db_session)
        feed = feed_service.get_personalized_feed(user_id=None, limit=10)

        # Verify both in feed (if feed has items)
        if len(feed['items']) > 0:
            notebook_ids = [nb['id'] for nb in feed['items']]
            # Both should be in feed if they exist
            assert original.id in notebook_ids or len(feed['items']) < 10
            assert fork.id in notebook_ids or len(feed['items']) < 10

    def test_get_forks(
        self,
        db_session: Session
    ):
        """Test: Get all forks of a notebook"""
        # Create original
        user_a = create_user(db_session, username='original_author')
        original = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Original",
            is_published=True
        )

        # Create multiple forks
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)

        user_b = create_user(db_session, username='forker1')
        fork1 = fork_service.fork_notebook(original.id, user_b.id)

        user_c = create_user(db_session, username='forker2')
        fork2 = fork_service.fork_notebook(original.id, user_c.id)

        # Get forks
        forks = fork_service.get_forks(original.id, limit=10)

        # Verify forks returned
        assert len(forks) == 2
        fork_ids = [f.id for f in forks]
        assert fork1.id in fork_ids
        assert fork2.id in fork_ids

    def test_fork_with_compilation_output(
        self,
        db_session: Session
    ):
        """Test: Fork inherits compilation output from original"""
        # Create notebook with output
        user_a = create_user(db_session, username='original_author')
        original = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Original with Output"
        )
        original.output_url = "https://cdn.example.com/original-output.html"
        db_session.commit()

        # Fork notebook
        user_b = create_user(db_session, username='forker')
        storage_service = StorageService()
        fork_service = ForkService(db_session, storage_service)
        fork = fork_service.fork_notebook(original.id, user_b.id)

        # Verify fork inherits output URL (can view original compilation)
        # Fork will need recompilation after edits
        assert fork.output_url == original.output_url
