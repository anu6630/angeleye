from sqlalchemy.orm import Session
from typing import Optional, List
from app.models.user import User
from app.models.profile import Profile
from app.schemas.profile import ProfileUpdate
from app.services.search_service import SearchService
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

        SearchService(self.db).index_user(user)

        return user

    def get_published_notebook_count(self, user_id: int) -> int:
        """Get count of published notebooks for user (PROF-03)"""
        from app.models.notebook import Notebook
        return self.db.query(Notebook).filter(
            Notebook.user_id == user_id,
            Notebook.is_published == True,
            Notebook.is_archived == False
        ).count()

    def get_likes_received_count(self, user_id: int) -> int:
        """Get count of likes received by user (PROF-04)"""
        from app.models.like import Like
        from app.models.notebook import Notebook
        return self.db.query(Like).join(Notebook).filter(
            Notebook.user_id == user_id
        ).count()

    def get_saved_notebook_count(self, user_id: int) -> int:
        """Get count of notebooks saved by user"""
        from app.models.notebook_save import NotebookSave
        return self.db.query(NotebookSave).filter(
            NotebookSave.user_id == user_id
        ).count()

    def get_group_count(self, user_id: int) -> int:
        """Get count of groups user is a member of"""
        from app.models.group import GroupMembership
        return self.db.query(GroupMembership).filter(
            GroupMembership.user_id == user_id
        ).count()

    def list_user_notebooks(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 20
    ) -> List[dict]:
        """List user's published notebooks (PROF-06)"""
        from app.models.notebook import Notebook
        notebooks = self.db.query(Notebook).filter(
            Notebook.user_id == user_id,
            Notebook.is_published == True,
            Notebook.is_archived == False
        ).order_by(Notebook.created_at.desc()).offset(skip).limit(limit).all()
        # Basic dict conversion for now
        return [{
            "id": n.id,
            "title": n.title,
            "created_at": n.created_at,
            "like_count": 0, # Should be fetched if needed
            "comment_count": 0
        } for n in notebooks]

    def get_profile_stats(self, user_id: int) -> dict:
        """Get profile statistics (PROF-03, PROF-04, PROF-06)"""
        return {
            "published_notebook_count": self.get_published_notebook_count(user_id),
            "likes_received_count": self.get_likes_received_count(user_id),
            "saved_notebook_count": self.get_saved_notebook_count(user_id),
            "group_count": self.get_group_count(user_id)
        }
