from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import Optional, List, Dict
from datetime import datetime

from app.models.notebook import Notebook
from app.models.notebook_cell import NotebookCell
from app.models.user import User
from app.models.like import Like
from app.models.comment import Comment
from app.schemas.notebook import NotebookCreate, NotebookUpdate, NotebookResponse


class NotebookService:
    """Service for notebook CRUD operations"""

    def __init__(self, db: Session):
        self.db = db

    def create_notebook(self, user_id: int, data: NotebookCreate) -> NotebookResponse:
        """Create a new notebook with an initial empty code cell"""
        # Create notebook
        notebook = Notebook(
            title=data.title,
            user_id=user_id,
            is_published=False
        )
        self.db.add(notebook)
        self.db.commit()
        self.db.refresh(notebook)

        # Add initial empty code cell
        initial_cell = NotebookCell(
            notebook_id=notebook.id,
            cell_type="code",
            content="",
            order_index=0
        )
        self.db.add(initial_cell)
        self.db.commit()
        self.db.refresh(notebook)

        # Get response data
        return self._to_response(notebook)

    def get_notebook(self, notebook_id: int) -> Optional[NotebookResponse]:
        """Get notebook by ID with cells"""
        notebook = (
            self.db.query(Notebook)
            .filter(Notebook.id == notebook_id)
            .first()
        )

        if not notebook:
            return None

        return self._to_response(notebook)

    def update_notebook(
        self,
        notebook_id: int,
        user_id: int,
        data: NotebookUpdate
    ) -> Optional[NotebookResponse]:
        """Update notebook (title or is_published) with ownership check"""
        notebook = (
            self.db.query(Notebook)
            .filter(Notebook.id == notebook_id)
            .first()
        )

        if not notebook:
            return None

        # Verify ownership
        if notebook.user_id != user_id:
            raise ValueError("User does not own this notebook")

        # Update fields
        notebook.title = data.title
        notebook.is_published = data.is_published

        self.db.commit()
        self.db.refresh(notebook)

        return self._to_response(notebook)

    def delete_notebook(self, notebook_id: int, user_id: int) -> bool:
        """Delete notebook if owned by user

        Cascade delete will handle cells, likes, and comments automatically.
        FK constraint will prevent deletion if notebook has been forked.
        """
        notebook = (
            self.db.query(Notebook)
            .filter(Notebook.id == notebook_id)
            .first()
        )

        if not notebook:
            return False

        # Verify ownership
        if notebook.user_id != user_id:
            raise ValueError("User does not own this notebook")

        # Delete will cascade to cells, likes, and comments
        # If notebook has forks, FK constraint will prevent deletion
        try:
            self.db.delete(notebook)
            self.db.commit()
            return True
        except Exception as e:
            self.db.rollback()
            if "foreign key constraint" in str(e).lower():
                raise ValueError("Cannot delete notebook with existing forks")
            raise

    def get_user_notebooks(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> List[NotebookResponse]:
        """Get user's notebooks (drafts and published)"""
        notebooks = (
            self.db.query(Notebook)
            .filter(Notebook.user_id == user_id)
            .order_by(Notebook.updated_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return [self._to_response(nb) for nb in notebooks]

    def get_published_notebook_counts(
        self,
        notebook_ids: List[int]
    ) -> Dict[int, dict]:
        """Get like and comment counts for multiple published notebooks"""
        if not notebook_ids:
            return {}

        # Get like counts
        like_counts = (
            self.db.query(
                Like.notebook_id,
                func.count(Like.id).label('count')
            )
            .filter(Like.notebook_id.in_(notebook_ids))
            .group_by(Like.notebook_id)
            .all()
        )

        # Get comment counts
        comment_counts = (
            self.db.query(
                Comment.notebook_id,
                func.count(Comment.id).label('count')
            )
            .filter(Comment.notebook_id.in_(notebook_ids))
            .group_by(Comment.notebook_id)
            .all()
        )

        # Build result dict
        result = {}
        for nid in notebook_ids:
            result[nid] = {
                'like_count': 0,
                'comment_count': 0
            }

        for notebook_id, count in like_counts:
            result[notebook_id]['like_count'] = count

        for notebook_id, count in comment_counts:
            result[notebook_id]['comment_count'] = count

        return result

    def _to_response(self, notebook: Notebook) -> NotebookResponse:
        """Convert notebook model to response schema"""
        # Load cells if not already loaded
        if not notebook.cells:
            cells = (
                self.db.query(NotebookCell)
                .filter(NotebookCell.notebook_id == notebook.id)
                .order_by(NotebookCell.order_index)
                .all()
            )
        else:
            cells = notebook.cells

        # Get counts
        like_count = (
            self.db.query(func.count(Like.id))
            .filter(Like.notebook_id == notebook.id)
            .scalar()
        ) or 0

        comment_count = (
            self.db.query(func.count(Comment.id))
            .filter(Comment.notebook_id == notebook.id)
            .scalar()
        ) or 0

        return NotebookResponse(
            id=notebook.id,
            title=notebook.title,
            user_id=notebook.user_id,
            is_published=notebook.is_published,
            created_at=notebook.created_at,
            updated_at=notebook.updated_at,
            like_count=like_count,
            comment_count=comment_count,
            cells=[{
                'id': cell.id,
                'cell_type': cell.cell_type,
                'content': cell.content,
                'order_index': cell.order_index
            } for cell in cells]
        )
