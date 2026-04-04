from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime

from app.models.comment import Comment
from app.models.notebook import Notebook
from app.models.user import User
from app.schemas.comment import CommentCreate, CommentResponse
from app.services.trending_service import TrendingService


class CommentService:
    """Service for threaded comment operations with depth limit"""

    MAX_DEPTH = 3

    def __init__(self, db: Session, trending_service: Optional[TrendingService] = None):
        self.db = db
        self.trending_service = trending_service

    def create_comment(
        self,
        user_id: int,
        notebook_id: int,
        content: str,
        parent_id: Optional[int] = None
    ) -> CommentResponse:
        """Create a comment with optional parent (threaded replies)

        Validates depth limit (max 3 levels) if parent_id is provided.
        """
        # Verify notebook exists
        notebook = (
            self.db.query(Notebook)
            .filter(Notebook.id == notebook_id)
            .first()
        )

        if not notebook:
            raise ValueError("Notebook not found")

        # Validate parent_id if provided
        if parent_id:
            parent_comment = (
                self.db.query(Comment)
                .filter(Comment.id == parent_id)
                .first()
            )

            if not parent_comment:
                raise ValueError("Parent comment not found")

            if parent_comment.notebook_id != notebook_id:
                raise ValueError("Parent comment belongs to different notebook")

            # Check depth limit
            parent_depth = self._get_comment_depth(parent_id)
            if parent_depth >= self.MAX_DEPTH:
                raise ValueError(
                    f"Maximum comment depth ({self.MAX_DEPTH}) exceeded"
                )

        # Create comment
        comment = Comment(
            user_id=user_id,
            notebook_id=notebook_id,
            parent_id=parent_id,
            content=content
        )
        self.db.add(comment)
        self.db.commit()
        self.db.refresh(comment)

        # Update trending score in real-time
        # Per CONTEXT.md D-24: Real-time score updates on engagement events
        if self.trending_service:
            try:
                self.trending_service.increment_engagement(notebook_id, "comment")
            except Exception as e:
                # Log error but don't fail the comment operation
                # Redis might be temporarily unavailable
                pass

        # Get user info for response
        user = self.db.query(User).filter(User.id == user_id).first()

        return CommentResponse(
            id=comment.id,
            notebook_id=comment.notebook_id,
            user_id=comment.user_id,
            parent_id=comment.parent_id,
            content=comment.content,
            created_at=comment.created_at,
            updated_at=comment.updated_at,
            username=user.username if user else "Unknown",
            avatar_url=user.profile.avatar_url if user and user.profile else None
        )

    def get_comment_thread(
        self,
        notebook_id: int,
        max_depth: int = 3
    ) -> List[CommentResponse]:
        """Get threaded comments using recursive CTE query

        Returns root comments with nested replies.
        """
        # Recursive CTE query to get comment tree
        query = text("""
            WITH RECURSIVE comment_tree AS (
                -- Base case: root comments (no parent)
                SELECT
                    c.id,
                    c.user_id,
                    c.notebook_id,
                    c.parent_id,
                    c.content,
                    c.created_at,
                    c.updated_at,
                    0 as depth,
                    ARRAY[c.id] as path
                FROM comments c
                WHERE c.notebook_id = :notebook_id AND c.parent_id IS NULL

                UNION ALL

                -- Recursive case: child comments
                SELECT
                    c.id,
                    c.user_id,
                    c.notebook_id,
                    c.parent_id,
                    c.content,
                    c.created_at,
                    c.updated_at,
                    ct.depth + 1 as depth,
                    ct.path || c.id as path
                FROM comments c
                JOIN comment_tree ct ON c.parent_id = ct.id
                WHERE ct.depth < :max_depth
            )
            SELECT
                id, user_id, notebook_id, parent_id,
                content, created_at, updated_at, depth, path
            FROM comment_tree
            ORDER BY path
        """)

        result = self.db.execute(
            query,
            {"notebook_id": notebook_id, "max_depth": max_depth}
        )

        comments = []
        for row in result:
            comments.append({
                'id': row[0],
                'user_id': row[1],
                'notebook_id': row[2],
                'parent_id': row[3],
                'content': row[4],
                'created_at': row[5],
                'updated_at': row[6],
                'depth': row[7],
                'path': row[8]
            })

        # Build tree structure in Python
        return self._build_tree(comments)

    def get_comment_count(self, notebook_id: int) -> int:
        """Get total comment count for a notebook"""
        count = (
            self.db.query(Comment)
            .filter(Comment.notebook_id == notebook_id)
            .count()
        )
        return count

    def _get_comment_depth(self, comment_id: int) -> int:
        """Get depth of a comment by traversing parents"""
        depth = 0
        current_id = comment_id

        while current_id:
            comment = (
                self.db.query(Comment.parent_id)
                .filter(Comment.id == current_id)
                .first()
            )

            if not comment:
                break

            if comment.parent_id is None:
                break

            depth += 1
            current_id = comment.parent_id

        return depth

    def _build_tree(self, comments: List[dict]) -> List[CommentResponse]:
        """Build tree structure from flat comment list

        Returns root comments with nested replies.
        """
        # Get all user IDs for batch loading
        user_ids = list(set(c['user_id'] for c in comments))
        users = (
            self.db.query(User)
            .filter(User.id.in_(user_ids))
            .all()
        )
        user_map = {u.id: u for u in users}

        # Create CommentResponse objects
        comment_map = {}
        for c in comments:
            user = user_map.get(c['user_id'])
            comment_response = CommentResponse(
                id=c['id'],
                notebook_id=c['notebook_id'],
                user_id=c['user_id'],
                parent_id=c['parent_id'],
                content=c['content'],
                created_at=c['created_at'],
                updated_at=c['updated_at'],
                username=user.username if user else "Unknown",
                avatar_url=user.profile.avatar_url if user and user.profile else None,
                replies=[]  # Will be populated
            )
            comment_map[c['id']] = comment_response

        # Build tree structure
        root_comments = []
        for comment_id, comment in comment_map.items():
            if comment.parent_id is None:
                # Root comment
                root_comments.append(comment)
            elif comment.parent_id in comment_map:
                # Add to parent's replies
                parent = comment_map[comment.parent_id]
                if parent.replies is None:
                    parent.replies = []
                parent.replies.append(comment)

        return root_comments
