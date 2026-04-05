"""
Unit tests for FeedService.

Tests personalized feed generation, trending fallback, and engagement tracking.
Uses factory functions for test data and mocks for external services.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.feed_service import FeedService
from tests.test_factories import create_user, create_notebook, create_follow, create_like


class TestFeedServicePersonalized:
    """Test personalized feed generation"""

    @patch('app.services.feed_service.get_redis_client')
    @patch('app.services.feed_service.TrendingService')
    @patch('app.services.feed_service.FollowService')
    def test_get_personalized_feed_authenticated(
        self, mock_follow_service, mock_trending_service, mock_redis, db_session: Session
    ):
        """Test getting personalized feed for authenticated user"""
        # Setup mocks
        mock_redis_instance = MagicMock()
        mock_redis_instance.lrange.return_value = []
        mock_redis.return_value = mock_redis_instance

        mock_trending_instance = MagicMock()
        mock_trending_service.return_value = mock_trending_instance

        mock_follow_instance = MagicMock()
        mock_follow_service.return_value = mock_follow_instance

        service = FeedService(db_session)

        user = create_user(db_session)

        # Get personalized feed
        feed = service.get_personalized_feed(user_id=user.id, limit=10)

        assert "items" in feed
        assert "next_cursor" in feed
        assert "has_more" in feed

    @patch('app.services.feed_service.get_redis_client')
    @patch('app.services.feed_service.TrendingService')
    @patch('app.services.feed_service.FollowService')
    def test_get_personalized_feed_unauthenticated(
        self, mock_follow_service, mock_trending_service, mock_redis, db_session: Session
    ):
        """Test getting feed for unauthenticated user (trending only)"""
        # Setup mocks
        mock_redis_instance = MagicMock()
        mock_trending_instance = MagicMock()
        mock_trending_instance.get_trending_notebooks.return_value = []
        mock_trending_service.return_value = mock_trending_instance
        mock_redis.return_value = mock_redis_instance

        mock_follow_instance = MagicMock()
        mock_follow_service.return_value = mock_follow_instance

        service = FeedService(db_session)

        # Get feed without user_id (unauthenticated)
        feed = service.get_personalized_feed(user_id=None, limit=10)

        assert "items" in feed
        assert "next_cursor" in feed
        assert "has_more" in feed

        # Verify trending was called (fallback for unauthenticated)
        mock_trending_instance.get_trending_notebooks.assert_called()


class TestFeedServiceEngagement:
    """Test engagement tracking"""

    @patch('app.services.feed_service.get_redis_client')
    def test_record_view(self, mock_redis, db_session: Session):
        """Test recording notebook view"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = FeedService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Record view - should not raise
        service.record_view(notebook.id, user.id)

        # Test passes if no exception is raised

    @patch('app.services.feed_service.get_redis_client')
    def test_record_view_anonymous(self, mock_redis, db_session: Session):
        """Test recording view for anonymous user"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = FeedService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Record view without user_id - should not raise
        service.record_view(notebook.id, None)

        # Test passes if no exception is raised


class TestFeedServiceCache:
    """Test feed caching operations"""

    @patch('app.services.feed_service.get_redis_client')
    @patch('app.services.feed_service.TrendingService')
    @patch('app.services.feed_service.FollowService')
    def test_feed_cache_hit(
        self, mock_follow_service, mock_trending_service, mock_redis, db_session: Session
    ):
        """Test that cached feed is returned when available"""
        # Setup mocks
        mock_redis_instance = MagicMock()
        mock_redis_instance.lrange.return_value = [b"1", b"2", b"3"]
        mock_redis.return_value = mock_redis_instance

        mock_trending_instance = MagicMock()
        mock_trending_service.return_value = mock_trending_instance

        mock_follow_instance = MagicMock()
        mock_follow_service.return_value = mock_follow_instance

        service = FeedService(db_session)

        user = create_user(db_session)
        notebook1 = create_notebook(db_session, user_id=user.id, title="Notebook 1")
        notebook2 = create_notebook(db_session, user_id=user.id, title="Notebook 2")
        notebook3 = create_notebook(db_session, user_id=user.id, title="Notebook 3")

        # Get feed (should use cache)
        feed = service.get_personalized_feed(user_id=user.id, limit=3)

        # Verify cache was checked
        mock_redis_instance.lrange.assert_called_once()

    @patch('app.services.feed_service.get_redis_client')
    @patch('app.services.feed_service.TrendingService')
    @patch('app.services.feed_service.FollowService')
    def test_feed_cache_miss(
        self, mock_follow_service, mock_trending_service, mock_redis, db_session: Session
    ):
        """Test that feed is generated on cache miss"""
        # Setup mocks
        mock_redis_instance = MagicMock()
        mock_redis_instance.lrange.return_value = []  # Cache miss
        mock_redis.return_value = mock_redis_instance

        mock_trending_instance = MagicMock()
        mock_trending_instance.get_trending_notebooks.return_value = []
        mock_trending_service.return_value = mock_trending_instance

        mock_follow_instance = MagicMock()
        mock_follow_service.return_value = mock_follow_instance

        service = FeedService(db_session)

        user = create_user(db_session)

        # Get feed (cache miss, should generate)
        feed = service.get_personalized_feed(user_id=user.id, limit=10)

        # Verify trending was called as fallback
        mock_trending_instance.get_trending_notebooks.assert_called()


class TestFeedServiceInvalidation:
    """Test feed cache invalidation"""

    @patch('app.services.feed_service.get_redis_client')
    def test_invalidate_user_feed(self, mock_redis, db_session: Session):
        """Test invalidating user's feed cache"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = FeedService(db_session)

        user = create_user(db_session)

        # Invalidate feed - should not raise
        service.invalidate_user_feed(user.id)

        # Method completed successfully


class TestFeedServicePagination:
    """Test cursor-based pagination"""

    @patch('app.services.feed_service.get_redis_client')
    @patch('app.services.feed_service.TrendingService')
    @patch('app.services.feed_service.FollowService')
    def test_pagination_with_cursor(
        self, mock_follow_service, mock_trending_service, mock_redis, db_session: Session
    ):
        """Test pagination using cursor"""
        # Setup mocks
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        mock_trending_instance = MagicMock()
        mock_trending_instance.get_trending_notebooks.return_value = []
        mock_trending_service.return_value = mock_trending_instance

        mock_follow_instance = MagicMock()
        mock_follow_service.return_value = mock_follow_instance

        service = FeedService(db_session)

        user = create_user(db_session)

        # Get feed with cursor
        cursor = "2026-01-01T00:00:00Z"
        feed = service.get_personalized_feed(user_id=user.id, limit=10, cursor=cursor)

        assert "items" in feed
        assert "next_cursor" in feed

        # With cursor, cache should be bypassed
        mock_redis_instance.lrange.assert_not_called()


class TestFeedServiceTrendingFallback:
    """Test trending fallback for various scenarios"""

    @patch('app.services.feed_service.get_redis_client')
    @patch('app.services.feed_service.TrendingService')
    @patch('app.services.feed_service.FollowService')
    def test_zero_follows_fallback_to_trending(
        self, mock_follow_service, mock_trending_service, mock_redis, db_session: Session
    ):
        """Test that users with 0 follows get trending feed"""
        # Setup mocks
        mock_redis_instance = MagicMock()
        mock_redis_instance.lrange.return_value = []
        mock_redis.return_value = mock_redis_instance

        mock_trending_instance = MagicMock()
        mock_trending_instance.get_trending_notebooks.return_value = []
        mock_trending_service.return_value = mock_trending_instance

        mock_follow_instance = MagicMock()
        mock_follow_instance.return_value = mock_follow_instance

        service = FeedService(db_session)

        user = create_user(db_session)

        # Get personalized feed (user has 0 follows)
        feed = service.get_personalized_feed(user_id=user.id, limit=10)

        # Verify trending was called as fallback
        mock_trending_instance.get_trending_notebooks.assert_called()
