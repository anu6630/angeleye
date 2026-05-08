"""
Unit tests for ForkService.

Tests forking logic, lineage tracking, delete protection, and dataset forking.
"""
import pytest
from unittest.mock import Mock, MagicMock
from sqlalchemy.orm import Session

from app.services.fork_service import ForkService
from app.models.notebook import Notebook
from tests.test_factories import create_user, create_notebook, create_notebook_cell, create_fork


class TestForkServiceNotebook:
    """Test notebook forking"""

    def test_fork_notebook(self, db_session: Session):
        """Test creating a fork of a notebook"""
        mock_storage = Mock()
        service = ForkService(db_session, mock_storage)

        user = create_user(db_session)
        original = create_notebook(db_session, user_id=user.id, title="Original")
        create_notebook_cell(db_session, notebook_id=original.id, content="cell1", order_index=0)
        create_notebook_cell(db_session, notebook_id=original.id, content="cell2", order_index=1)

        fork = service.fork_notebook(original.id, user.id)

        assert fork.parent_id == original.id
        assert fork.root_id == original.id
        assert fork.title == "Original (fork)"
        assert fork.is_published is False
        assert len(fork.cells) == 2

    def test_fork_notebook_sets_root_id(self, db_session: Session):
        """Test that fork preserves root_id from parent chain"""
        mock_storage = Mock()
        service = ForkService(db_session, mock_storage)

        user = create_user(db_session)
        original = create_notebook(db_session, user_id=user.id)

        fork = service.fork_notebook(original.id, user.id)

        # First fork should have root_id = original.id
        assert fork.root_id == original.id

    def test_fork_notebook_not_found(self, db_session: Session):
        """Test forking non-existent notebook"""
        mock_storage = Mock()
        service = ForkService(db_session, mock_storage)
        user = create_user(db_session)

        with pytest.raises(ValueError, match="Notebook 99999 not found"):
            service.fork_notebook(99999, user.id)

    def test_fork_preserves_chain(self, db_session: Session):
        """Test that fork chain is preserved across multiple forks"""
        mock_storage = Mock()
        service = ForkService(db_session, mock_storage)

        user = create_user(db_session)
        original = create_notebook(db_session, user_id=user.id, title="Original")

        # First fork
        fork1 = service.fork_notebook(original.id, user.id)
        assert fork1.root_id == original.id

        # Fork of fork
        fork2 = service.fork_notebook(fork1.id, user.id)
        assert fork2.root_id == original.id  # Still points to original
        assert fork2.parent_id == fork1.id

    def test_get_fork_chain(self, db_session: Session):
        """Test getting fork chain from notebook"""
        mock_storage = Mock()
        service = ForkService(db_session, mock_storage)

        user = create_user(db_session)
        original = create_notebook(db_session, user_id=user.id)
        fork1 = service.fork_notebook(original.id, user.id)
        fork2 = service.fork_notebook(fork1.id, user.id)

        chain = service.get_fork_chain(fork2.id)

        assert len(chain) == 3
        assert chain[0].id == original.id
        assert chain[1].id == fork1.id
        assert chain[2].id == fork2.id

    def test_get_fork_chain_original(self, db_session: Session):
        """Test getting fork chain for original notebook"""
        mock_storage = Mock()
        service = ForkService(db_session, mock_storage)

        user = create_user(db_session)
        original = create_notebook(db_session, user_id=user.id)

        chain = service.get_fork_chain(original.id)

        assert len(chain) == 1
        assert chain[0].id == original.id

    def test_fork_copies_cells(self, db_session: Session):
        """Test that fork copies all cells from parent"""
        mock_storage = Mock()
        service = ForkService(db_session, mock_storage)

        user = create_user(db_session)
        original = create_notebook(db_session, user_id=user.id)
        create_notebook_cell(db_session, notebook_id=original.id, cell_type="code", content="code1", order_index=0)
        create_notebook_cell(db_session, notebook_id=original.id, cell_type="markdown", content="md1", order_index=1)
        create_notebook_cell(db_session, notebook_id=original.id, cell_type="code", content="code2", order_index=2)

        fork = service.fork_notebook(original.id, user.id)

        assert len(fork.cells) == 3
        assert fork.cells[0].content == "code1"
        assert fork.cells[1].content == "md1"
        assert fork.cells[2].content == "code2"


class TestForkServiceDeleteProtection:
    """Test delete protection for notebooks with forks"""

    def test_delete_protected_notebook_with_forks(self, db_session: Session):
        """Test that notebooks with forks cannot be deleted"""
        mock_storage = Mock()
        fork_service = ForkService(db_session, mock_storage)

        from app.services.notebook_service import NotebookService
        notebook_service = NotebookService(db_session)

        user = create_user(db_session)
        original = create_notebook(db_session, user_id=user.id)

        # Create a fork
        fork = fork_service.fork_notebook(original.id, user.id)

        # Try to delete original - should fail
        with pytest.raises(ValueError, match="Cannot delete notebook with forks"):
            notebook_service.delete_notebook(original.id, user.id)

    def test_fork_can_be_deleted(self, db_session: Session):
        """Test that forks can be deleted independently"""
        mock_storage = Mock()
        fork_service = ForkService(db_session, mock_storage)

        from app.services.notebook_service import NotebookService
        notebook_service = NotebookService(db_session)

        user = create_user(db_session)
        original = create_notebook(db_session, user_id=user.id)
        fork = fork_service.fork_notebook(original.id, user.id)

        # Fork should be deletable
        result = notebook_service.delete_notebook(fork.id, user.id)
        assert result is True


class TestForkServiceDataset:
    """Test dataset forking"""

    def test_fork_dataset(self, db_session: Session):
        """Test forking a dataset"""
        mock_storage = Mock()
        mock_storage.copy_s3_object = MagicMock()
        service = ForkService(db_session, mock_storage)

        user = create_user(db_session)

        # Create a dataset using the model directly
        from app.models.dataset import Dataset
        original_dataset = Dataset(
            user_id=user.id,
            filename="data.csv",
            original_filename="data.csv",
            file_size_bytes=1000,
            content_type="text/csv",
            s3_key="datasets/original/data.csv",
            row_count=10
        )
        db_session.add(original_dataset)
        db_session.commit()
        db_session.refresh(original_dataset)

        fork_dataset = service.fork_dataset(original_dataset.id, user.id)

        assert fork_dataset.parent_id == original_dataset.id
        assert fork_dataset.root_id == original_dataset.id
        assert fork_dataset.filename == "data.csv"
        mock_storage.copy_s3_object.assert_called_once()

    def test_fork_dataset_not_found(self, db_session: Session):
        """Test forking non-existent dataset"""
        mock_storage = Mock()
        service = ForkService(db_session, mock_storage)
        user = create_user(db_session)

        with pytest.raises(ValueError, match="Dataset 99999 not found"):
            service.fork_dataset(99999, user.id)
