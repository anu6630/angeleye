"""
Unit tests for ProfileService.

Tests profile CRUD operations, avatar updates, and profile completion.
Uses factory functions for test data.
"""
import pytest
from sqlalchemy.orm import Session

from app.services.profile_service import ProfileService
from app.schemas.profile import ProfileUpdate
from tests.test_factories import create_user


class TestProfileServiceGetProfile:
    """Test profile retrieval"""

    def test_get_profile_by_user_id(self, db_session: Session):
        """Test getting profile by user ID"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        # Create profile if it doesn't exist
        from app.models.profile import Profile
        if not user.profile:
            profile = Profile(user_id=user.id)
            db_session.add(profile)
            db_session.commit()
            db_session.refresh(user)

        profile = service.get_profile_by_user_id(user.id)

        assert profile is not None
        assert profile.user_id == user.id

    def test_get_user_with_profile(self, db_session: Session):
        """Test getting user with profile data"""
        service = ProfileService(db_session)

        user = create_user(db_session, username="testuser")

        user_with_profile = service.get_user_with_profile(user.id)

        assert user_with_profile is not None
        assert user_with_profile.id == user.id
        assert user_with_profile.username == "testuser"

    def test_get_user_by_username(self, db_session: Session):
        """Test getting user by username"""
        service = ProfileService(db_session)

        user = create_user(db_session, username="testuser")

        found_user = service.get_user_by_username("testuser")

        assert found_user is not None
        assert found_user.id == user.id
        assert found_user.username == "testuser"

    def test_get_user_by_username_not_found(self, db_session: Session):
        """Test getting user by username that doesn't exist"""
        service = ProfileService(db_session)

        found_user = service.get_user_by_username("nonexistent")

        assert found_user is None


class TestProfileServiceUpdate:
    """Test profile update operations"""

    def test_update_profile_username(self, db_session: Session):
        """Test updating username"""
        service = ProfileService(db_session)

        user = create_user(db_session, username="oldusername")

        profile_data = ProfileUpdate(username="newusername")
        updated_user = service.update_profile(user.id, profile_data)

        assert updated_user is not None
        assert updated_user.username == "newusername"

    def test_update_profile_duplicate_username(self, db_session: Session):
        """Test that duplicate username is prevented"""
        service = ProfileService(db_session)

        user1 = create_user(db_session, username="user1")
        user2 = create_user(db_session, username="user2")

        # Try to update user2's username to user1's username
        profile_data = ProfileUpdate(username="user1")
        result = service.update_profile(user2.id, profile_data)

        # Should return None (username already taken)
        assert result is None

    def test_update_profile_bio(self, db_session: Session):
        """Test updating bio"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        profile_data = ProfileUpdate(bio="This is my bio")
        updated_user = service.update_profile(user.id, profile_data)

        assert updated_user is not None
        assert updated_user.profile.bio == "This is my bio"

    def test_update_profile_avatar_url(self, db_session: Session):
        """Test updating avatar URL"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        profile_data = ProfileUpdate(avatar_url="https://example.com/avatar.jpg")
        updated_user = service.update_profile(user.id, profile_data)

        assert updated_user is not None
        assert updated_user.profile.avatar_url == "https://example.com/avatar.jpg"

    def test_update_profile_creates_profile_if_missing(self, db_session: Session):
        """Test that profile is created if it doesn't exist"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        # Delete profile if it exists
        if user.profile:
            db_session.delete(user.profile)
            db_session.commit()

        # Update should create profile
        profile_data = ProfileUpdate(bio="New bio")
        updated_user = service.update_profile(user.id, profile_data)

        assert updated_user is not None
        assert updated_user.profile is not None
        assert updated_user.profile.bio == "New bio"

    def test_update_profile_nonexistent_user(self, db_session: Session):
        """Test updating profile for non-existent user"""
        service = ProfileService(db_session)

        profile_data = ProfileUpdate(bio="Test bio")
        result = service.update_profile(99999, profile_data)

        assert result is None


class TestProfileServiceStats:
    """Test profile statistics"""

    def test_get_published_notebook_count(self, db_session: Session):
        """Test getting published notebook count"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        count = service.get_published_notebook_count(user.id)

        # Returns 0 per TODO in service
        assert count == 0

    def test_get_likes_received_count(self, db_session: Session):
        """Test getting likes received count"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        count = service.get_likes_received_count(user.id)

        # Returns 0 per TODO in service
        assert count == 0

    def test_get_profile_stats(self, db_session: Session):
        """Test getting complete profile stats"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        stats = service.get_profile_stats(user.id)

        assert "published_notebook_count" in stats
        assert "likes_received_count" in stats
        assert stats["published_notebook_count"] == 0
        assert stats["likes_received_count"] == 0


class TestProfileServiceListNotebooks:
    """Test listing user's notebooks"""

    def test_list_user_notebooks(self, db_session: Session):
        """Test listing user's published notebooks"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        notebooks = service.list_user_notebooks(user.id)

        # Returns empty list per TODO in service
        assert notebooks == []

    def test_list_user_notebooks_with_pagination(self, db_session: Session):
        """Test pagination parameters for notebook listing"""
        service = ProfileService(db_session)

        user = create_user(db_session)

        # Test with limit and offset
        notebooks = service.list_user_notebooks(user.id, skip=10, limit=20)

        assert notebooks == []
