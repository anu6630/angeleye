from sqlalchemy.orm import Session
from typing import Optional, Tuple
from app.models.user import User
from app.models.profile import Profile
from app.core.security import encrypt_token, decrypt_token
from app.schemas.user import UserCreate
from datetime import datetime

class AuthService:
    """Service for authentication operations"""

    def __init__(self, db: Session):
        self.db = db

    def get_user_by_oauth_id(self, provider: str, oauth_id: str) -> Optional[User]:
        """Get user by OAuth provider ID"""
        if provider == 'google':
            return self.db.query(User).filter(User.google_oauth_id == oauth_id).first()
        elif provider == 'facebook':
            return self.db.query(User).filter(User.facebook_oauth_id == oauth_id).first()
        return None

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()

    def get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username"""
        return self.db.query(User).filter(User.username == username).first()

    def create_oauth_user(
        self,
        provider: str,
        oauth_id: str,
        email: str,
        name: Optional[str] = None
    ) -> User:
        """Create a new user from OAuth data"""
        # Check if email already exists (user might have signed up with different provider)
        existing_user = self.get_user_by_email(email)
        if existing_user:
            # Link the OAuth provider to existing account
            if provider == 'google':
                existing_user.google_oauth_id = oauth_id
            elif provider == 'facebook':
                existing_user.facebook_oauth_id = oauth_id
            self.db.commit()
            self.db.refresh(existing_user)
            return existing_user

        # Create new user
        user_data = {
            "email": email,
            "username": self._generate_username_from_email(email),
            "google_oauth_id": oauth_id if provider == 'google' else None,
            "facebook_oauth_id": oauth_id if provider == 'facebook' else None,
            "is_active": True,
            "is_verified": True,  # OAuth users are pre-verified
        }

        user = User(**user_data)
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Create empty profile (will be filled in wizard per D-01, D-02)
        profile = Profile(user_id=user.id)
        self.db.add(profile)
        self.db.commit()

        return user

    def update_user_profile(
        self,
        user_id: int,
        username: str,
        avatar_url: Optional[str] = None,
        bio: Optional[str] = None
    ) -> User:
        """Update user profile (completing the wizard)"""
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return None

        # Update username
        if username and username != user.username:
            # Check if username is taken
            if self.get_user_by_username(username):
                return None
            user.username = username

        # Update profile
        profile = self.db.query(Profile).filter(Profile.user_id == user_id).first()
        if profile:
            if avatar_url is not None:
                profile.avatar_url = avatar_url
            if bio is not None:
                profile.bio = bio
            profile.updated_at = datetime.utcnow()

        user.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(user)

        return user

    def _generate_username_from_email(self, email: str) -> str:
        """Generate a unique username from email"""
        base_username = email.split('@')[0].lower().replace('.', '_').replace('-', '_')
        username = base_username[:50]  # Max length

        # Make unique
        counter = 1
        while self.get_user_by_username(username):
            suffix = f"_{counter}"
            username = base_username[:50-len(suffix)] + suffix
            counter += 1

        return username

    def store_oauth_token(
        self,
        user_id: int,
        provider: str,
        access_token: str,
        refresh_token: Optional[str] = None
    ) -> None:
        """Store encrypted OAuth tokens (SEC-06, D-04, D-28)"""
        # For MVP, we're storing tokens in a simple approach
        # In production, this should use a separate secure storage mechanism
        # For now, we'll store them encrypted in a token field or cache
        # This is a placeholder - implement based on your token storage strategy
        pass
