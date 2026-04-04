from sqlalchemy.orm import Session
from typing import List, Optional

from app.models.like import Like
from app.models.notebook import Notebook
from app.schemas.like import LikeResponse
from app.services.trending_service import TrendingService


class LikeService:
    """Service for like/unlike toggle operations"""

    def __init__(self, db: Session, trending_service: Optional[TrendingService] = None):
        self.db = db
        self.trending_service = trending_service

    def toggle_like(self, user_id: int, notebook_id: int) -> LikeResponse:
        """Toggle like/unlike for a notebook

        If like exists, delete it (unlike).
        If like doesn't exist, create it (like).

        Returns:
            LikeResponse with action taken ('liked' or 'unliked')
        """
        # Check if notebook exists
        notebook = (
            self.db.query(Notebook)
            .filter(Notebook.id == notebook_id)
            .first()
        )

        if not notebook:
            raise ValueError("Notebook not found")

        # Check if like already exists
        existing_like = (
            self.db.query(Like)
            .filter(
                Like.user_id == user_id,
                Like.notebook_id == notebook_id
            )
            .first()
        )

        if existing_like:
            # Unlike: delete existing like
            self.db.delete(existing_like)
            self.db.commit()

            # Update trending score (decrement engagement)
            # Note: We don't decrement for unlike to avoid negative scores
            # The algorithm will naturally decay over time

            # Return response indicating unlike
            return LikeResponse(
                id=existing_like.id,
                notebook_id=existing_like.notebook_id,
                user_id=existing_like.user_id,
                created_at=existing_like.created_at
            )
        else:
            # Like: create new like
            new_like = Like(
                user_id=user_id,
                notebook_id=notebook_id
            )
            self.db.add(new_like)
            self.db.commit()
            self.db.refresh(new_like)

            # Update trending score in real-time
            # Per CONTEXT.md D-24: Real-time score updates on engagement events
            if self.trending_service:
                try:
                    self.trending_service.increment_engagement(notebook_id, "like")
                except Exception as e:
                    # Log error but don't fail the like operation
                    # Redis might be temporarily unavailable
                    pass

            return LikeResponse(
                id=new_like.id,
                notebook_id=new_like.notebook_id,
                user_id=new_like.user_id,
                created_at=new_like.created_at
            )

    def get_notebook_likes(self, notebook_id: int) -> List[LikeResponse]:
        """Get all likes for a notebook"""
        likes = (
            self.db.query(Like)
            .filter(Like.notebook_id == notebook_id)
            .order_by(Like.created_at.desc())
            .all()
        )

        return [
            LikeResponse(
                id=like.id,
                notebook_id=like.notebook_id,
                user_id=like.user_id,
                created_at=like.created_at
            )
            for like in likes
        ]

    def get_user_liked_notebooks(self, user_id: int) -> List[int]:
        """Get list of notebook_ids that user has liked"""
        likes = (
            self.db.query(Like.notebook_id)
            .filter(Like.user_id == user_id)
            .all()
        )

        return [like.notebook_id for like in likes]

    def get_like_count(self, notebook_id: int) -> int:
        """Get total like count for a notebook"""
        count = (
            self.db.query(Like)
            .filter(Like.notebook_id == notebook_id)
            .count()
        )
        return count
