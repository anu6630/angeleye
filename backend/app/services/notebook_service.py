import logging
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

logger = logging.getLogger(__name__)


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

        # Sync to search index (Per CONTEXT.md D-19: Real-time sync on every save)
        try:
            from app.services.search_service import SearchService
            SearchService(self.db).index_notebook(notebook)
        except Exception as e:
            logger.warning(f"Failed to index notebook {notebook.id} in Meilisearch: {e}")

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
        """Update notebook (title or is_published) with ownership check

        Per CONTEXT.md D-27: Invalidate follower feed caches on publish/update
        """
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

        # Track if this is a publish event or title change
        is_publishing = not notebook.is_published and data.is_published
        is_content_change = notebook.title != data.title

        # Update fields
        notebook.title = data.title
        notebook.is_published = data.is_published

        self.db.commit()
        self.db.refresh(notebook)

        # Invalidate follower caches if published or content changed
        if is_publishing or is_content_change or notebook.is_published:
            try:
                from app.services.feed_service import FeedService
                FeedService(self.db).invalidate_user_feed(user_id)
            except Exception as e:
                logger.warning(f"Failed to invalidate feed cache for user {user_id}: {e}")

        # Sync to search index (Per CONTEXT.md D-19: Real-time sync on every update)
        try:
            from app.services.search_service import SearchService
            SearchService(self.db).index_notebook(notebook)
        except Exception as e:
            logger.warning(f"Failed to index notebook {notebook.id} in Meilisearch: {e}")

        return self._to_response(notebook)

    def delete_notebook(self, notebook_id: int, user_id: int) -> bool:
        """Delete notebook if owned by user

        Cascade delete will handle cells, likes, and comments automatically.
        Checks for forks before deletion (FORK-04: delete protection).

        Args:
            notebook_id: ID of notebook to delete
            user_id: ID of user requesting deletion

        Returns:
            True if deleted successfully

        Raises:
            ValueError: If user doesn't own notebook or if forks exist
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

        # Check for forks (FORK-04: Delete protection)
        fork_count = (
            self.db.query(func.count(Notebook.id))
            .filter(Notebook.parent_id == notebook_id)
            .scalar()
        )

        if fork_count and fork_count > 0:
            raise ValueError("Cannot delete notebook with forks. Use archive instead.")

        # Delete will cascade to cells, likes, and comments
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
