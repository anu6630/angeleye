from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime

from app.models.notebook import Notebook
from app.models.user import User
from app.models.like import Like
from app.models.comment import Comment


class FeedService:
    """Service for feed operations with cursor-based pagination"""

    def __init__(self, db: Session):
        self.db = db

    def get_feed(
        self,
        cursor: Optional[str] = None,
        limit: int = 20
    ) -> dict:
        """Get published notebooks with cursor-based pagination

        Args:
            cursor: ISO format timestamp string for pagination
            limit: Number of items to return (max 50)

        Returns:
            Dict with items (list of notebooks), next_cursor, has_more
        """
        # Cap limit to prevent excessive queries
        limit = min(limit, 50)

        # Build base query with joins
        query = (
            self.db.query(
                Notebook.id,
                Notebook.title,
                Notebook.created_at,
                Notebook.updated_at,
                User.id.label('user_id'),
                User.username,
                User.avatar_url
            )
            .join(User, Notebook.user_id == User.id)
            .filter(Notebook.is_published == True)
        )

        # Apply cursor filter if provided
        if cursor:
            try:
                cursor_time = datetime.fromisoformat(cursor.replace('Z', '+00:00'))
                query = query.filter(Notebook.created_at < cursor_time)
            except ValueError:
                # Invalid cursor, start from beginning
                pass

        # Order by created_at DESC (newest first)
        query = query.order_by(Notebook.created_at.desc())

        # Get one extra item to check if there are more
        items_plus_one = query.limit(limit + 1).all()

        # Split into items and check for more
        has_more = len(items_plus_one) > limit
        items = items_plus_one[:limit]

        # Build response with counts
        notebook_ids = [item.id for item in items]
        counts = self._get_counts_for_notebooks(notebook_ids)

        # Build items list
        feed_items = []
        for item in items:
            feed_items.append({
                'id': item.id,
                'title': item.title,
                'username': item.username,
                'avatar_url': item.avatar_url,
                'like_count': counts.get(item.id, {}).get('like_count', 0),
                'comment_count': counts.get(item.id, {}).get('comment_count', 0),
                'created_at': item.created_at
            })

        # Set next cursor
        next_cursor = None
        if items and has_more:
            # Use created_at of last item as next cursor
            next_cursor = items[-1].created_at.isoformat()

        return {
            'items': feed_items,
            'next_cursor': next_cursor,
            'has_more': has_more
        }

    def _get_counts_for_notebooks(self, notebook_ids: List[int]) -> dict:
        """Get like and comment counts for a list of notebooks"""
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
