from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from datetime import datetime
import logging

from app.models.notebook import Notebook
from app.models.notebook_cell import NotebookCell
from app.models.dataset import Dataset
from app.services.storage_service import StorageService

logger = logging.getLogger(__name__)


class ForkService:
    """
    Service for notebook and dataset forking operations.

    FORK-01: Fork creates independent copy with full attribution tracking
    FORK-02: Dataset forking uses S3 server-side copy
    FORK-03: Forks have equal weightage in feed (no depth penalty)
    FORK-04: Delete protection for notebooks with forks
    FORK-05: Fork chain traversal via parent_id/root_id
    """

    def __init__(self, db: Session, storage_service: StorageService):
        self.db = db
        self.storage_service = storage_service

    def fork_notebook(self, notebook_id: int, user_id: int) -> Notebook:
        """
        Fork a notebook, creating an independent copy with all cells.

        Args:
            notebook_id: ID of the notebook to fork
            user_id: ID of the user creating the fork

        Returns:
            The forked Notebook object

        Raises:
            ValueError: If notebook not found
        """
        # Get original notebook
        original = (
            self.db.query(Notebook)
            .filter(Notebook.id == notebook_id)
            .first()
        )

        if not original:
            raise ValueError(f"Notebook {notebook_id} not found")

        # Create fork notebook
        fork = Notebook(
            title=f"{original.title} (fork)",
            user_id=user_id,
            is_published=False,  # Forks start as draft
            parent_id=notebook_id,  # Immediate parent
            root_id=original.root_id if original.root_id else notebook_id,  # Ultimate original
            is_archived=False,
            # Copy other fields
            output_s3_key=original.output_s3_key,
            output_version=original.output_version,
            output_url=original.output_url,
            compiled_at=original.compiled_at,
        )

        self.db.add(fork)
        self.db.commit()
        self.db.refresh(fork)

        # Copy all cells
        original_cells = (
            self.db.query(NotebookCell)
            .filter(NotebookCell.notebook_id == notebook_id)
            .order_by(NotebookCell.order_index)
            .all()
        )

        for cell in original_cells:
            new_cell = NotebookCell(
                notebook_id=fork.id,
                cell_type=cell.cell_type,
                content=cell.content,
                order_index=cell.order_index
            )
            self.db.add(new_cell)

        self.db.commit()

        # Fork dataset if original has one (via notebook_dataset association)
        if hasattr(original, 'dataset') and original.dataset:
            try:
                self.fork_dataset(original.dataset.id, user_id)
            except Exception as e:
                logger.error(f"Failed to fork dataset for notebook {notebook_id}: {e}")
                # Don't fail the fork if dataset copy fails

        self.db.refresh(fork)
        return fork

    def fork_dataset(self, dataset_id: int, user_id: int) -> Dataset:
        """
        Fork a dataset using S3 server-side copy.

        Args:
            dataset_id: ID of the dataset to fork
            user_id: ID of the user creating the fork

        Returns:
            The forked Dataset object

        Raises:
            ValueError: If dataset not found
        """
        # Get original dataset
        original = (
            self.db.query(Dataset)
            .filter(Dataset.id == dataset_id)
            .first()
        )

        if not original:
            raise ValueError(f"Dataset {dataset_id} not found")

        # Generate new S3 key
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        new_s3_key = f"datasets/{user_id}/{user_id}_{timestamp}_{original.original_filename}"

        # Server-side copy in S3/MinIO
        bucket = "notebooksocial"  # TODO: Get from settings
        try:
            self.storage_service.copy_object(
                source_key=original.s3_key,
                dest_key=new_s3_key,
                bucket=bucket
            )
        except Exception as e:
            logger.error(f"Failed to copy dataset {dataset_id} in S3: {e}")
            raise ValueError(f"Failed to copy dataset: {e}")

        # Create fork dataset record
        fork = Dataset(
            user_id=user_id,
            filename=new_s3_key,
            original_filename=original.original_filename,
            file_size_bytes=original.file_size_bytes,
            content_type=original.content_type,
            s3_key=new_s3_key,
            row_count=original.row_count,
            parent_id=dataset_id,  # Immediate parent
            root_id=original.root_id if original.root_id else dataset_id,  # Ultimate original
        )

        self.db.add(fork)
        self.db.commit()
        self.db.refresh(fork)

        return fork

    def get_fork_chain(self, notebook_id: int) -> List[Notebook]:
        """
        Get the full fork chain from original to current notebook.

        Args:
            notebook_id: ID of the notebook to get chain for

        Returns:
            List of notebooks from original to current (ordered)
        """
        chain = []
        current = (
            self.db.query(Notebook)
            .filter(Notebook.id == notebook_id)
            .first()
        )

        if not current:
            return chain

        # Walk up the parent chain
        while current:
            chain.append(current)
            if current.parent_id:
                current = (
                    self.db.query(Notebook)
                    .filter(Notebook.id == current.parent_id)
                    .first()
                )
            else:
                break

        # Reverse to show from original to current
        chain.reverse()
        return chain

    def get_forks(self, notebook_id: int, limit: int = 50) -> List[Notebook]:
        """
        Get all forks of a notebook.

        Args:
            notebook_id: ID of the notebook to get forks for
            limit: Maximum number of forks to return

        Returns:
            List of forked notebooks
        """
        forks = (
            self.db.query(Notebook)
            .filter(Notebook.parent_id == notebook_id)
            .order_by(Notebook.created_at.desc())
            .limit(limit)
            .all()
        )

        return forks

    def has_forks(self, notebook_id: int) -> bool:
        """
        Check if a notebook has any forks.

        Args:
            notebook_id: ID of the notebook to check

        Returns:
            True if forks exist, False otherwise
        """
        count = (
            self.db.query(func.count(Notebook.id))
            .filter(Notebook.parent_id == notebook_id)
            .scalar()
        )

        return count > 0

    def can_delete_notebook(self, notebook_id: int) -> bool:
        """
        Check if a notebook can be deleted (no forks exist).

        Args:
            notebook_id: ID of the notebook to check

        Returns:
            True if deletion is allowed, False if forks exist
        """
        return not self.has_forks(notebook_id)
