"""
Unit tests for FollowService.

Tests follow/unfollow operations, rate limiting, and count queries.
Uses factory functions for test data.
"""
import pytest
from unittest.mock import Mock
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.services.follow_service import FollowService
from tests.test_factories import create_user, create_follow


class TestFollowServiceFollow:
    """Test follow operations"""

    def test_follow_user(self, db_session: Session):
        """Test following a user"""
        service = FollowService(db_session)

        follower = create_user(db_session, username="follower")
        following = create_user(db_session, username="following")

        follow = service.follow_user(follower.id, following.id)

        assert follow.follower_id == follower.id
        assert follow.following_id == following.id

    def test_follow_self(self, db_session: Session):
        """Test that users cannot follow themselves"""
        service = FollowService(db_session)

        user = create_user(db_session)

        with pytest.raises(ValueError, match="Cannot follow yourself"):
            service.follow_user(user.id, user.id)

    def test_follow_nonexistent_user(self, db_session: Session):
        """Test following a user that doesn't exist"""
        service = FollowService(db_session)

        follower = create_user(db_session)

        with pytest.raises(ValueError, match="User not found"):
            service.follow_user(follower.id, 99999)

    def test_follow_duplicate(self, db_session: Session):
        """Test that duplicate follows are prevented"""
        service = FollowService(db_session)

        follower = create_user(db_session, username="follower")
        following = create_user(db_session, username="following")

        # First follow should succeed
        service.follow_user(follower.id, following.id)

        # Second follow should fail
        with pytest.raises(ValueError, match="Already following this user"):
            service.follow_user(follower.id, following.id)

    def test_follow_rate_limit(self, db_session: Session):
        """Test rate limiting (100 follows per day)"""
        service = FollowService(db_session)

        follower = create_user(db_session, username="follower")

        # Create 100 follows (use different following users)
        for i in range(100):
            following = create_user(db_session, username=f"user{i}")
            service.follow_user(follower.id, following.id)

        # 101st follow should fail
        user101 = create_user(db_session, username="user101")
        with pytest.raises(ValueError, match="Rate limit exceeded"):
            service.follow_user(follower.id, user101.id)


class TestFollowServiceUnfollow:
    """Test unfollow operations"""

    def test_unfollow_user(self, db_session: Session):
        """Test unfollowing a user"""
        service = FollowService(db_session)

        follower = create_user(db_session, username="follower")
        following = create_user(db_session, username="following")

        # Create follow
        service.follow_user(follower.id, following.id)

        # Unfollow
        result = service.unfollow_user(follower.id, following.id)

        assert result is True

    def test_unfollow_not_following(self, db_session: Session):
        """Test unfollowing a user you're not following"""
        service = FollowService(db_session)

        follower = create_user(db_session, username="follower")
        following = create_user(db_session, username="following")

        with pytest.raises(ValueError, match="Not following this user"):
            service.unfollow_user(follower.id, following.id)

    def test_unfollow_self(self, db_session: Session):
        """Test that users cannot unfollow themselves"""
        service = FollowService(db_session)

        user = create_user(db_session)

        with pytest.raises(ValueError, match="Cannot unfollow yourself"):
            service.unfollow_user(user.id, user.id)


class TestFollowServiceCounts:
    """Test follower/following count queries"""

    def test_get_follow_counts_zero(self, db_session: Session):
        """Test getting counts for user with no follows"""
        service = FollowService(db_session)

        user = create_user(db_session)

        counts = service.get_follow_counts(user.id)

        assert counts["followers_count"] == 0
        assert counts["following_count"] == 0

    def test_get_follow_counts_with_followers(self, db_session: Session):
        """Test getting counts with followers"""
        service = FollowService(db_session)

        user = create_user(db_session, username="popular")
        follower1 = create_user(db_session, username="follower1")
        follower2 = create_user(db_session, username="follower2")

        # Create follows
        create_follow(db_session, follower_id=follower1.id, following_id=user.id)
        create_follow(db_session, follower_id=follower2.id, following_id=user.id)

        counts = service.get_follow_counts(user.id)

        assert counts["followers_count"] == 2
        assert counts["following_count"] == 0

    def test_get_follow_counts_with_following(self, db_session: Session):
        """Test getting counts with following"""
        service = FollowService(db_session)

        user = create_user(db_session, username="active")
        following1 = create_user(db_session, username="following1")
        following2 = create_user(db_session, username="following2")

        # Create follows
        create_follow(db_session, follower_id=user.id, following_id=following1.id)
        create_follow(db_session, follower_id=user.id, following_id=following2.id)

        counts = service.get_follow_counts(user.id)

        assert counts["followers_count"] == 0
        assert counts["following_count"] == 2


class TestFollowServiceIsFollowing:
    """Test is_following helper method"""

    def test_is_following_true(self, db_session: Session):
        """Test is_following returns True when following"""
        service = FollowService(db_session)

        follower = create_user(db_session, username="follower")
        following = create_user(db_session, username="following")

        # Create follow
        create_follow(db_session, follower_id=follower.id, following_id=following.id)

        result = service.is_following(follower.id, following.id)

        assert result is True

    def test_is_following_false(self, db_session: Session):
        """Test is_following returns False when not following"""
        service = FollowService(db_session)

        follower = create_user(db_session, username="follower")
        following = create_user(db_session, username="following")

        result = service.is_following(follower.id, following.id)

        assert result is False

    def test_is_following_self(self, db_session: Session):
        """Test is_following returns False for self"""
        service = FollowService(db_session)

        user = create_user(db_session)

        result = service.is_following(user.id, user.id)

        assert result is False
