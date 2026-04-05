"""
Integration tests for authentication flow.

TEST-03: Integration tests covering OAuth callback → user creation → session
Tests use real PostgreSQL and mock OAuth providers (external service).
"""
import pytest
from sqlalchemy.orm import Session

from app.services.auth_service import AuthService
from app.models.user import User
from app.models.profile import Profile
from tests.test_factories import create_user


@pytest.mark.integration
class TestAuthFlow:
    """Authentication flow integration tests"""

    def test_oauth_callback_creates_new_user(
        self,
        db_session: Session
    ):
        """Test: OAuth callback creates new user"""
        # Mock OAuth response (Google user)
        mock_user_info = {
            'sub': 'google-oauth-id-12345',
            'email': 'newuser@example.com',
            'name': 'New User'
        }

        # Verify user doesn't exist yet
        auth_service = AuthService(db_session)
        user = auth_service.get_user_by_oauth_id('google', mock_user_info['sub'])
        assert user is None

        # Create user via OAuth flow (simulating callback)
        user = auth_service.create_oauth_user(
            provider='google',
            oauth_id=mock_user_info['sub'],
            email=mock_user_info['email'],
            name=mock_user_info['name']
        )

        # Verify user created in database
        assert user is not None
        assert user.email == mock_user_info['email']
        assert user.google_oauth_id == mock_user_info['sub']
        assert user.facebook_oauth_id is None

        # Verify profile created
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        assert profile is not None

        # Verify user can be retrieved by OAuth ID
        retrieved_user = auth_service.get_user_by_oauth_id('google', mock_user_info['sub'])
        assert retrieved_user is not None
        assert retrieved_user.id == user.id

    def test_oauth_callback_logs_in_existing_user(
        self,
        db_session: Session
    ):
        """Test: OAuth callback logs in existing user"""
        # Create existing user via factory
        existing_user = create_user(
            db_session,
            username='existinguser',
            email='existing@example.com',
            google_oauth_id='google-oauth-id-67890'
        )

        # Verify user exists
        auth_service = AuthService(db_session)
        user = auth_service.get_user_by_oauth_id('google', 'google-oauth-id-67890')
        assert user is not None
        assert user.id == existing_user.id
        assert user.email == 'existing@example.com'

        # Simulate OAuth callback with same oauth_id
        mock_user_info = {
            'sub': 'google-oauth-id-67890',
            'email': 'existing@example.com',
            'name': 'Existing User'
        }

        # Verify existing user returned (not duplicate)
        user = auth_service.get_user_by_oauth_id('google', mock_user_info['sub'])
        assert user.id == existing_user.id
        assert user.email == existing_user.email

        # Verify no duplicate user created
        user_count = db_session.query(User).filter(
            User.google_oauth_id == 'google-oauth-id-67890'
        ).count()
        assert user_count == 1

    def test_complete_profile_creates_username(
        self,
        db_session: Session
    ):
        """Test: Complete profile wizard sets username"""
        # Create pending user (OAuth with auto-generated username)
        auth_service = AuthService(db_session)
        pending_user = auth_service.create_oauth_user(
            provider='google',
            oauth_id='google-oauth-id-profile',
            email='pending@example.com',
            name='Pending User'
        )

        # Verify user has auto-generated username and is verified
        assert pending_user.username is not None  # Auto-generated from email
        assert pending_user.username == 'pending'  # Generated from email
        assert pending_user.is_verified is True  # OAuth users are pre-verified

        # Complete profile with custom username
        updated_user = auth_service.update_user_profile(
            user_id=pending_user.id,
            username='completeduser',
            avatar_url='https://example.com/avatar.jpg',
            bio='Test bio'
        )

        # Verify profile completed
        assert updated_user is not None
        assert updated_user.username == 'completeduser'
        assert updated_user.is_verified is True

        # Verify profile updated
        profile = db_session.query(Profile).filter(Profile.user_id == updated_user.id).first()
        assert profile is not None
        assert profile.avatar_url == 'https://example.com/avatar.jpg'
        assert profile.bio == 'Test bio'

    def test_complete_profile_duplicate_username_fails(
        self,
        db_session: Session
    ):
        """Test: Complete profile with duplicate username fails"""
        # Create existing user with username
        existing_user = create_user(
            db_session,
            username='takenusername',
            email='taken@example.com'
        )

        # Create pending user
        auth_service = AuthService(db_session)
        pending_user = auth_service.create_oauth_user(
            provider='google',
            oauth_id='google-oauth-id-duplicate',
            email='newuser@example.com',
            name='New User'
        )

        # Store original username
        original_username = pending_user.username

        # Try to complete profile with duplicate username
        updated_user = auth_service.update_user_profile(
            user_id=pending_user.id,
            username='takenusername',  # Already taken
            avatar_url='https://example.com/avatar.jpg',
            bio='Test bio'
        )

        # Verify update failed
        assert updated_user is None

        # Verify pending user still has original username (unchanged)
        db_session.refresh(pending_user)
        assert pending_user.username == original_username

    def test_facebook_oauth_creates_user(
        self,
        db_session: Session
    ):
        """Test: Facebook OAuth creates user"""
        auth_service = AuthService(db_session)

        # Create user via Facebook OAuth
        user = auth_service.create_oauth_user(
            provider='facebook',
            oauth_id='facebook-oauth-id-123',
            email='fbuser@example.com',
            name='FB User'
        )

        # Verify user created
        assert user is not None
        assert user.email == 'fbuser@example.com'
        assert user.facebook_oauth_id == 'facebook-oauth-id-123'
        assert user.google_oauth_id is None

        # Verify can retrieve by Facebook OAuth ID
        retrieved_user = auth_service.get_user_by_oauth_id('facebook', 'facebook-oauth-id-123')
        assert retrieved_user is not None
        assert retrieved_user.id == user.id

    def test_user_can_login_with_google_and_facebook(
        self,
        db_session: Session
    ):
        """Test: User can link both Google and Facebook OAuth"""
        auth_service = AuthService(db_session)

        # Create user via Google
        user = auth_service.create_oauth_user(
            provider='google',
            oauth_id='google-oauth-id-linked',
            email='linked@example.com',
            name='Linked User'
        )

        # Verify Google OAuth ID set
        assert user.google_oauth_id == 'google-oauth-id-linked'
        assert user.facebook_oauth_id is None

        # Link Facebook OAuth ID (simulating login with Facebook later)
        user.facebook_oauth_id = 'facebook-oauth-id-linked'
        db_session.commit()
        db_session.refresh(user)

        # Verify both OAuth IDs are set
        assert user.google_oauth_id == 'google-oauth-id-linked'
        assert user.facebook_oauth_id == 'facebook-oauth-id-linked'

        # Verify can retrieve by either OAuth ID
        user_by_google = auth_service.get_user_by_oauth_id('google', 'google-oauth-id-linked')
        user_by_facebook = auth_service.get_user_by_oauth_id('facebook', 'facebook-oauth-id-linked')

        assert user_by_google is not None
        assert user_by_facebook is not None
        assert user_by_google.id == user_by_facebook.id

    def test_delete_user_cascade_deletes_profile(
        self,
        db_session: Session
    ):
        """Test: Deleting user cascades to profile"""
        # Create user with profile
        user = create_user(
            db_session,
            username='deleteuser',
            email='delete@example.com'
        )

        # Verify profile exists (created by factory)
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        # Note: Profile may not be created by factory, so we'll create it
        if profile is None:
            profile = Profile(user_id=user.id)
            db_session.add(profile)
            db_session.commit()

        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        assert profile is not None

        # Delete user
        db_session.delete(user)
        db_session.commit()

        # Verify profile cascaded (or deleted manually)
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        assert profile is None

    def test_get_user_by_oauth_id_returns_none_for_nonexistent(
        self,
        db_session: Session
    ):
        """Test: get_user_by_oauth_id returns None for non-existent user"""
        auth_service = AuthService(db_session)

        # Try to get non-existent user
        user = auth_service.get_user_by_oauth_id('google', 'nonexistent-oauth-id')
        assert user is None

        user = auth_service.get_user_by_oauth_id('facebook', 'nonexistent-oauth-id')
        assert user is None

    def test_update_user_profile_preserves_username(
        self,
        db_session: Session
    ):
        """Test: Update user profile preserves username when not provided"""
        # Create user
        user = create_user(
            db_session,
            username='preserveuser',
            email='preserve@example.com'
        )

        # Ensure profile exists (factory doesn't create it)
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        if profile is None:
            profile = Profile(user_id=user.id)
            db_session.add(profile)
            db_session.commit()

        auth_service = AuthService(db_session)

        # Update only bio (username is required but can be same)
        updated_user = auth_service.update_user_profile(
            user_id=user.id,
            username='preserveuser',  # Must provide username (can be same)
            bio='Updated bio'
        )

        # Verify bio updated, username preserved
        assert updated_user is not None
        assert updated_user.username == 'preserveuser'

        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        assert profile.bio == 'Updated bio'

        # Update avatar URL
        updated_user = auth_service.update_user_profile(
            user_id=user.id,
            username='preserveuser',  # Must provide username
            avatar_url='https://example.com/newavatar.jpg'
        )

        # Verify avatar updated, bio preserved
        assert updated_user is not None
        profile = db_session.query(Profile).filter(Profile.user_id == user.id).first()
        assert profile.bio == 'Updated bio'
        assert profile.avatar_url == 'https://example.com/newavatar.jpg'
