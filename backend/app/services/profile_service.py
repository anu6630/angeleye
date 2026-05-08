from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.user import User
from app.models.profile import Profile
from app.schemas.profile import ProfileUpdate
from sqlalchemy import func

class ProfileService:
    """Service for profile operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_profile_by_user_id(self, user_id: int) -> Optional[Profile]:
        """Get profile by user ID"""
        return self.db.query(Profile).filter(Profile.user_id == user_id).first()

    def get_user_with_profile(self, user_id: int) -> Optional[User]:
        """Get user with profile data"""
        return (
            self.db.query(User)
            .filter(User.id == user_id)
            .first()
        )

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username (for public profile viewing)"""
        return (
            self.db.query(User)
            .filter(User.username == username)
            .first()
        )

    def update_profile(
        self,
        user_id: int,
        profile_data: ProfileUpdate
    ) -> Optional[User]:
        """Update user profile (PROF-05, D-07, D-08)"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # Update username if provided
        if profile_data.username and profile_data.username != user.username:
            # Check if username is already taken
            existing = self.db.query(User).filter(User.username == profile_data.username).first()
            if existing:
                return None
            user.username = profile_data.username

        # Update profile if exists, create if not
        profile = self.db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            profile = Profile(user_id=user_id)
            self.db.add(profile)

        if profile_data.avatar_url is not None:
            profile.avatar_url = str(profile_data.avatar_url) if profile_data.avatar_url else None
            if profile_data.avatar_url:
                profile.avatar_s3_key = None
                profile.avatar_thumbnail_s3_key = None
                profile.avatar_uploaded_at = None
                profile.avatar_content_type = None
        if profile_data.bio is not None:
            profile.bio = profile_data.bio

        self.db.commit()
        self.db.refresh(user)
        self.db.refresh(profile)

        return user

    def get_published_notebook_count(self, user_id: int) -> int:
        """Get count of published notebooks for user (PROF-03)

        Note: For Phase 1, this returns 0 as notebooks don't exist yet.
        This will be implemented in Phase 2 when notebooks are created.
        """
        # TODO: Implement in Phase 2 when notebooks table exists
        # return self.db.query(Notebook).filter(
        #     Notebook.user_id == user_id,
        #     Notebook.is_published == True
        # ).count()
        return 0

    def get_likes_received_count(self, user_id: int) -> int:
        """Get count of likes received by user (PROF-04)

        Note: For Phase 1, this returns 0 as likes don't exist yet.
        This will be implemented in Phase 2 when likes are created.
        """
        # TODO: Implement in Phase 2 when likes table exists
        # return self.db.query(Like).join(Notebook).filter(
        #     Notebook.user_id == user_id
        # ).count()
        return 0

    def list_user_notebooks(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> List[dict]:
        """List user's published notebooks (PROF-06)

        Note: For Phase 1, this returns empty list as notebooks don't exist yet.
        This will be implemented in Phase 2 when notebooks are created.
        """
        # TODO: Implement in Phase 2 when notebooks table exists
        # notebooks = self.db.query(Notebook).filter(
        #     Notebook.user_id == user_id,
        #     Notebook.is_published == True
        # ).order_by(Notebook.created_at.desc()).offset(skip).limit(limit).all()
        # return [self._notebook_to_dict(n) for n in notebooks]
        return []

    def get_profile_stats(self, user_id: int) -> dict:
        """Get profile statistics (PROF-03, PROF-04, PROF-06)"""
        return {
            "published_notebook_count": self.get_published_notebook_count(user_id),
            "likes_received_count": self.get_likes_received_count(user_id)
        }
