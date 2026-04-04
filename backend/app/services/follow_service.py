from sqlalchemy.orm import Session
from typing import Optional, Dict
from datetime import datetime, timedelta
from app.models.follow import Follow
from app.models.user import User
from sqlalchemy import func, and_


class FollowService:
    """Service for follow operations (DISC-01, DISC-02)

    Implements one-way follow relationships (Twitter/Instagram style).
    Enforces rate limiting (100 follows/day per CONTEXT.md D-9).
    Provides count-only queries for followers/following (per CONTEXT.md D-10).
    """

    def __init__(self, db: Session):
        self.db = db

    def follow_user(self, follower_id: int, following_id: int) -> Follow:
        """Create a follow relationship (DISC-01)

        Args:
            follower_id: ID of the user who is following
            following_id: ID of the user being followed

        Returns:
            Follow object

        Raises:
            ValueError: If validation fails (self-follow, user not found, rate limit, duplicate)
        """
        # Prevent self-follow (CONTEXT.md D-9)
        if follower_id == following_id:
            raise ValueError("Cannot follow yourself")

        # Check if following user exists
        following_user = self.db.query(User).filter(User.id == following_id).first()
        if not following_user:
            raise ValueError("User not found")

        # Check rate limit: 100 follows per day (CONTEXT.md D-9)
        rate_limit_count = self.db.query(func.count(Follow.id)).filter(
            and_(
                Follow.follower_id == follower_id,
                Follow.created_at >= datetime.utcnow() - timedelta(days=1)
            )
        ).scalar()

        if rate_limit_count >= 100:
            raise ValueError("Rate limit exceeded: 100 follows per day")

        # Check for duplicate follow
        existing_follow = self.db.query(Follow).filter(
            and_(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id
            )
        ).first()

        if existing_follow:
            raise ValueError("Already following this user")

        # Create follow relationship
        follow = Follow(
            follower_id=follower_id,
            following_id=following_id
        )
        self.db.add(follow)
        self.db.commit()
        self.db.refresh(follow)

        return follow

    def unfollow_user(self, follower_id: int, following_id: int) -> bool:
        """Remove a follow relationship

        Args:
            follower_id: ID of the user who is following
            following_id: ID of the user to unfollow

        Returns:
            True if successful

        Raises:
            ValueError: If not following this user
        """
        # Prevent self-unfollow (shouldn't happen but defensive)
        if follower_id == following_id:
            raise ValueError("Cannot unfollow yourself")

        # Find follow relationship
        follow = self.db.query(Follow).filter(
            and_(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id
            )
        ).first()

        if not follow:
            raise ValueError("Not following this user")

        # Delete follow relationship
        self.db.delete(follow)
        self.db.commit()

        return True

    def get_follow_counts(self, user_id: int) -> Dict[str, int]:
        """Get follower and following counts for a user (CONTEXT.md D-10)

        Returns counts only, not full user lists. Full list browsing deferred to v2.

        Args:
            user_id: ID of the user

        Returns:
            Dict with followers_count and following_count
        """
        # Count followers (users who follow this user)
        followers_count = self.db.query(func.count(Follow.id)).filter(
            Follow.following_id == user_id
        ).scalar()

        # Count following (users this user follows)
        following_count = self.db.query(func.count(Follow.id)).filter(
            Follow.follower_id == user_id
        ).scalar()

        return {
            "followers_count": followers_count or 0,
            "following_count": following_count or 0
        }

    def is_following(self, follower_id: int, following_id: int) -> bool:
        """Check if follower_id is following following_id

        Args:
            follower_id: ID of the potential follower
            following_id: ID of the potential followee

        Returns:
            True if following, False otherwise
        """
        follow = self.db.query(Follow).filter(
            and_(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id
            )
        ).first()

        return follow is not None
