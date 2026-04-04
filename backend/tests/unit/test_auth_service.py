"""
Unit tests for AuthService.

Tests OAuth flow, user creation, token validation, and session management.
Uses factory functions for test data and mocks for external services.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.auth_service import AuthService
from app.models.user import User
from app.models.profile import Profile
from tests.test_factories import create_user


class TestAuthServiceOAuth:
    """Test OAuth user creation and retrieval"""

    def test_create_oauth_user_google(self, db_session: Session):
        """Test creating a new user via Google OAuth"""
        service = AuthService(db_session)

        user = service.create_oauth_user(
            provider="google",
            oauth_id="google-12345",
            email="test@example.com",
            name="Test User"
        )

        assert user is not None
        assert user.email == "test@example.com"
        assert user.google_oauth_id == "google-12345"
        assert user.facebook_oauth_id is None
        assert user.is_verified is True  # OAuth users are pre-verified
        assert user.username is not None

        # Verify profile was created
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        assert profile is not None

    def test_create_oauth_user_facebook(self, db_session: Session):
        """Test creating a new user via Facebook OAuth"""
        service = AuthService(db_session)

        user = service.create_oauth_user(
            provider="facebook",
            oauth_id="facebook-67890",
            email="facebook@example.com",
            name="Facebook User"
        )

        assert user is not None
        assert user.email == "facebook@example.com"
        assert user.facebook_oauth_id == "facebook-67890"
        assert user.google_oauth_id is None

    def test_create_oauth_user_links_existing_account(self, db_session: Session):
        """Test that OAuth links to existing account if email exists"""
        service = AuthService(db_session)

        # Create user with email but no Facebook OAuth
        existing_user = create_user(
            db_session,
            email="existing@example.com",
            google_oauth_id="existing-google-123",
            facebook_oauth_id=None
        )

        # Link Google OAuth to existing account
        user = service.create_oauth_user(
            provider="google",
            oauth_id="google-new-123",
            email="existing@example.com",
            name="Existing User"
        )

        assert user.id == existing_user.id
        assert user.google_oauth_id == "google-new-123"

    def test_get_user_by_oauth_id_google(self, db_session: Session):
        """Test retrieving user by Google OAuth ID"""
        service = AuthService(db_session)

        # Create user with Google OAuth
        created_user = create_user(
            db_session,
            google_oauth_id="google-test-123",
            facebook_oauth_id=None
        )

        # Retrieve by OAuth ID
        found_user = service.get_user_by_oauth_id("google", "google-test-123")

        assert found_user is not None
        assert found_user.id == created_user.id
        assert found_user.google_oauth_id == "google-test-123"

    def test_get_user_by_oauth_id_facebook(self, db_session: Session):
        """Test retrieving user by Facebook OAuth ID"""
        service = AuthService(db_session)

        # Create user with Facebook OAuth
        created_user = create_user(
            db_session,
            google_oauth_id=None,
            facebook_oauth_id="facebook-test-456"
        )

        # Retrieve by OAuth ID
        found_user = service.get_user_by_oauth_id("facebook", "facebook-test-456")

        assert found_user is not None
        assert found_user.id == created_user.id
        assert found_user.facebook_oauth_id == "facebook-test-456"

    def test_get_user_by_oauth_id_not_found(self, db_session: Session):
        """Test retrieving non-existent user by OAuth ID"""
        service = AuthService(db_session)

        found_user = service.get_user_by_oauth_id("google", "nonexistent-id")

        assert found_user is None


class TestAuthServiceUserManagement:
    """Test user retrieval and profile management"""

    def test_get_user_by_email(self, db_session: Session):
        """Test retrieving user by email"""
        service = AuthService(db_session)

        created_user = create_user(
            db_session,
            email="emailtest@example.com",
            google_oauth_id="emailtest-google"
        )

        found_user = service.get_user_by_email("emailtest@example.com")

        assert found_user is not None
        assert found_user.id == created_user.id

    def test_get_user_by_email_not_found(self, db_session: Session):
        """Test retrieving non-existent user by email"""
        service = AuthService(db_session)

        found_user = service.get_user_by_email("nonexistent@example.com")

        assert found_user is None

    def test_get_user_by_username(self, db_session: Session):
        """Test retrieving user by username"""
        service = AuthService(db_session)

        created_user = create_user(
            db_session,
            username="usernametest_123",
            google_oauth_id="usernametest-google"
        )

        found_user = service.get_user_by_username("usernametest_123")

        assert found_user is not None
        assert found_user.id == created_user.id

    def test_get_user_by_username_not_found(self, db_session: Session):
        """Test retrieving non-existent user by username"""
        service = AuthService(db_session)

        found_user = service.get_user_by_username("nonexistent_user")

        assert found_user is None

    def test_update_user_profile(self, db_session: Session):
        """Test updating user profile"""
        service = AuthService(db_session)

        user = create_user(db_session, google_oauth_id="update-profile-google")
        original_username = user.username

        # Create profile for user
        from app.models.profile import Profile
        profile = Profile(user_id=user.id, avatar_url="https://example.com/old.jpg", bio="Old bio")
        db_session.add(profile)
        db_session.commit()

        updated_user = service.update_user_profile(
            user_id=user.id,
            username="new_username",
            avatar_url="https://example.com/new_avatar.jpg",
            bio="New bio"
        )

        assert updated_user is not None
        assert updated_user.username == "new_username"
        assert updated_user.username != original_username

        # Check profile was updated
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        assert profile.avatar_url == "https://example.com/new_avatar.jpg"
        assert profile.bio == "New bio"

    def test_update_user_profile_username_taken(self, db_session: Session):
        """Test updating profile with already taken username"""
        service = AuthService(db_session)

        user1 = create_user(db_session, username="user1", google_oauth_id="user1-google")
        user2 = create_user(db_session, username="user2", google_oauth_id="user2-google")

        # Create profiles for both users
        from app.models.profile import Profile
        profile1 = Profile(user_id=user1.id)
        profile2 = Profile(user_id=user2.id)
        db_session.add_all([profile1, profile2])
        db_session.commit()

        # Try to update user2 with user1's username
        result = service.update_user_profile(
            user_id=user2.id,
            username="user1"
        )

        assert result is None  # Username conflict

    def test_update_user_profile_nonexistent_user(self, db_session: Session):
        """Test updating profile for non-existent user"""
        service = AuthService(db_session)

        result = service.update_user_profile(
            user_id=99999,
            username="some_username"
        )

        assert result is None

    def test_generate_username_from_email(self, db_session: Session):
        """Test username generation from email"""
        service = AuthService(db_session)

        # Test basic email
        username1 = service._generate_username_from_email("test@example.com")
        assert username1 == "test"

        # Test email with dots and dashes
        username2 = service._generate_username_from_email("first.last@example.com")
        assert "first_last" in username2

        # Test username uniqueness - should add suffix if taken
        existing_user = create_user(db_session, username="existing", google_oauth_id="existing-google")
        username3 = service._generate_username_from_email("existing@example.com")
        assert username3 != "existing"
        assert "_1" in username3


class TestAuthServiceSessionManagement:
    """Test session caching and management"""

    @patch('app.services.auth_service.cache')
    def test_cache_user_session(self, mock_cache: Mock, db_session: Session):
        """Test caching user session in Redis"""
        mock_cache.set.return_value = True
        service = AuthService(db_session)

        result = service.cache_user_session(
            user_id=1,
            session_data={"user_id": 1, "role": "user"},
            ttl=1800
        )

        assert result is True
        mock_cache.set.assert_called_once_with("session:1", {"user_id": 1, "role": "user"}, 1800)

    @patch('app.services.auth_service.cache')
    def test_get_user_session(self, mock_cache: Mock, db_session: Session):
        """Test retrieving cached user session"""
        mock_cache.get.return_value = {"user_id": 1, "role": "user"}
        service = AuthService(db_session)

        result = service.get_user_session(1)

        assert result == {"user_id": 1, "role": "user"}
        mock_cache.get.assert_called_once_with("session:1")

    @patch('app.services.auth_service.cache')
    def test_get_user_session_not_found(self, mock_cache: Mock, db_session: Session):
        """Test retrieving non-existent cached session"""
        mock_cache.get.return_value = None
        service = AuthService(db_session)

        result = service.get_user_session(1)

        assert result is None

    @patch('app.services.auth_service.cache')
    def test_clear_user_session(self, mock_cache: Mock, db_session: Session):
        """Test clearing user session from cache"""
        mock_cache.delete.return_value = True
        service = AuthService(db_session)

        result = service.clear_user_session(1)

        assert result is True
        mock_cache.delete.assert_called_once_with("session:1")

    @patch('app.services.auth_service.cache')
    def test_clear_user_session_not_found(self, mock_cache: Mock, db_session: Session):
        """Test clearing non-existent session"""
        mock_cache.delete.return_value = False
        service = AuthService(db_session)

        result = service.clear_user_session(999)

        assert result is False


class TestAuthTokenStorage:
    """Test OAuth token storage (placeholder tests)"""

    def test_store_oauth_token(self, db_session: Session):
        """Test storing OAuth tokens (currently placeholder)"""
        service = AuthService(db_session)

        # This is a placeholder method - should not raise errors
        service.store_oauth_token(
            user_id=1,
            provider="google",
            access_token="test_access_token",
            refresh_token="test_refresh_token"
        )

        # No assertion - just verify it doesn't crash
        assert True
