"""
Unit tests for TrendingService.

Tests engagement score calculation, time decay, and Redis caching.
Uses factory functions for test data and mocks for external services.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.services.trending_service import TrendingService
from tests.test_factories import create_user, create_notebook, create_like, create_comment, create_notebook_cell


def make_aware(dt: datetime) -> datetime:
    """Convert naive datetime to timezone-aware datetime"""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class TestTrendingServiceEngagement:
    """Test engagement score calculation"""

    @patch('app.services.trending_service.datetime')
    @patch('app.services.trending_service.get_redis_client')
    def test_calculate_engagement_score_no_engagement(self, mock_redis, mock_datetime, db_session: Session):
        """Test calculating engagement score for notebook with no likes/comments"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)
        # Ensure created_at is timezone-aware
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        score = service.calculate_engagement_score(notebook.id)

        assert score["notebook_id"] == notebook.id
        assert score["engagement"] == 0
        assert score["like_count"] == 0
        assert score["comment_count"] == 0
        assert score["decayed_score"] >= 0

    @patch('app.services.trending_service.datetime')
    @patch('app.services.trending_service.get_redis_client')
    def test_calculate_engagement_score_with_likes(self, mock_redis, mock_datetime, db_session: Session):
        """Test calculating engagement score with likes"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user1 = create_user(db_session, username="user1")
        user2 = create_user(db_session, username="user2")
        notebook = create_notebook(db_session, user_id=user1.id)
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        # Create likes (weight = 2 each)
        create_like(db_session, user_id=user1.id, notebook_id=notebook.id)
        create_like(db_session, user_id=user2.id, notebook_id=notebook.id)

        score = service.calculate_engagement_score(notebook.id)

        # engagement = (2 likes * 2) = 4
        assert score["engagement"] == 4
        assert score["like_count"] == 2
        assert score["comment_count"] == 0

    @patch('app.services.trending_service.get_redis_client')
    def test_calculate_engagement_score_with_comments(self, mock_redis, db_session: Session):
        """Test calculating engagement score with comments"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user1 = create_user(db_session, username="user1")
        user2 = create_user(db_session, username="user2")
        notebook = create_notebook(db_session, user_id=user1.id)
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        # Create comments (weight = 3 each)
        create_comment(db_session, user_id=user1.id, notebook_id=notebook.id, content="Comment 1")
        create_comment(db_session, user_id=user2.id, notebook_id=notebook.id, content="Comment 2")

        score = service.calculate_engagement_score(notebook.id)

        # engagement = (2 comments * 3) = 6
        assert score["engagement"] == 6
        assert score["like_count"] == 0
        assert score["comment_count"] == 2

    @patch('app.services.trending_service.get_redis_client')
    def test_calculate_engagement_score_mixed(self, mock_redis, db_session: Session):
        """Test calculating engagement score with likes and comments"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user1 = create_user(db_session, username="user1")
        user2 = create_user(db_session, username="user2")
        user3 = create_user(db_session, username="user3")
        notebook = create_notebook(db_session, user_id=user1.id)
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        # Create engagement
        create_like(db_session, user_id=user1.id, notebook_id=notebook.id)
        create_like(db_session, user_id=user2.id, notebook_id=notebook.id)
        create_comment(db_session, user_id=user3.id, notebook_id=notebook.id, content="Comment")

        score = service.calculate_engagement_score(notebook.id)

        # engagement = (2 likes * 2) + (1 comment * 3) = 7
        assert score["engagement"] == 7
        assert score["like_count"] == 2
        assert score["comment_count"] == 1


class TestTrendingServiceTimeDecay:
    """Test time decay calculation"""

    @patch('app.services.trending_service.get_redis_client')
    def test_calculate_decay_fresh_notebook(self, mock_redis, db_session: Session):
        """Test time decay for fresh notebook (age = 0)"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)
        # Set created_at to now
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        score = service.calculate_engagement_score(notebook.id)

        # Fresh notebook should have low decay
        # decayed_score = engagement / pow((age_hours + 2), 1.5)
        # For engagement = 0: decayed_score = 0 / 2.83 = 0
        assert score["age_hours"] >= 0
        # Should be fresh (less than 1 hour)
        assert score["age_hours"] < 24  # Within last day

    @patch('app.services.trending_service.get_redis_client')
    def test_calculate_decay_old_notebook(self, mock_redis, db_session: Session):
        """Test time decay for old notebook"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)
        # Set created_at to 5 days ago
        notebook.created_at = make_aware(notebook.created_at) - timedelta(days=5)
        db_session.commit()

        score = service.calculate_engagement_score(notebook.id)

        # Old notebook should have higher decay (lower score)
        assert score["age_hours"] >= 120  # At least 5 days


class TestTrendingServiceRedis:
    """Test Redis caching operations"""

    @patch('app.services.trending_service.get_redis_client')
    def test_update_notebook_score(self, mock_redis, db_session: Session):
        """Test updating notebook score in Redis"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        # Update score
        service.update_notebook_score(notebook.id)

        # Verify Redis operations were called
        assert mock_redis_instance.hset.called or mock_redis_instance.hincrby.called
        assert mock_redis_instance.zadd.called

    @patch('app.services.trending_service.get_redis_client')
    def test_increment_engagement_like(self, mock_redis, db_session: Session):
        """Test incrementing engagement for like event"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        # Increment engagement for like
        service.increment_engagement(notebook.id, "like")

        # Verify HINCRBY was called with weight = 2
        mock_redis_instance.hincrby.assert_called_once()

        # Get the call arguments
        call_args = mock_redis_instance.hincrby.call_args
        # Should increment by WEIGHT_LIKE = 2
        assert call_args[0][2] == service.WEIGHT_LIKE

    @patch('app.services.trending_service.get_redis_client')
    def test_increment_engagement_comment(self, mock_redis, db_session: Session):
        """Test incrementing engagement for comment event"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        # Increment engagement for comment
        service.increment_engagement(notebook.id, "comment")

        # Verify HINCRBY was called with weight = 3
        mock_redis_instance.hincrby.assert_called_once()

        # Get the call arguments
        call_args = mock_redis_instance.hincrby.call_args
        # Should increment by WEIGHT_COMMENT = 3
        assert call_args[0][2] == service.WEIGHT_COMMENT

    @patch('app.services.trending_service.get_redis_client')
    def test_increment_engagement_view(self, mock_redis, db_session: Session):
        """Test incrementing engagement for view event"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        # Increment engagement for view
        service.increment_engagement(notebook.id, "view")

        # Verify HINCRBYFLOAT was called with weight = 0.05
        mock_redis_instance.hincrbyfloat.assert_called_once()

        # Get the call arguments
        call_args = mock_redis_instance.hincrbyfloat.call_args
        # Should increment by WEIGHT_VIEW = 0.05
        assert abs(call_args[0][2] - service.WEIGHT_VIEW) < 0.001

    @patch('app.services.trending_service.get_redis_client')
    def test_increment_engagement_invalid_type(self, mock_redis, db_session: Session):
        """Test incrementing engagement with invalid type"""
        mock_redis_instance = MagicMock()
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)
        notebook.created_at = make_aware(notebook.created_at)
        db_session.commit()

        # Should raise ValueError for invalid type
        with pytest.raises(ValueError, match="Unknown event type"):
            service.increment_engagement(notebook.id, "invalid_type")


class TestTrendingServiceGetTrending:
    """Test getting trending notebooks"""

    @patch('app.services.trending_service.get_redis_client')
    def test_get_trending_notebooks_from_cache(self, mock_redis, db_session: Session):
        """Test getting trending notebook IDs from Redis cache"""
        mock_redis_instance = MagicMock()

        # Mock Redis ZREVRANGE response (notebook IDs sorted by score)
        mock_redis_instance.zrevrange.return_value = [
            "notebook:1",
            "notebook:2",
            "notebook:3"
        ]

        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        # Create notebooks
        user = create_user(db_session)
        notebook1 = create_notebook(db_session, user_id=user.id, title="Notebook 1")
        notebook2 = create_notebook(db_session, user_id=user.id, title="Notebook 2")
        notebook3 = create_notebook(db_session, user_id=user.id, title="Notebook 3")

        trending_ids = service.get_trending_notebooks(limit=3)

        assert len(trending_ids) == 3
        assert 1 in trending_ids
        assert 2 in trending_ids
        assert 3 in trending_ids

    @patch('app.services.trending_service.get_redis_client')
    def test_get_trending_notebooks_empty(self, mock_redis, db_session: Session):
        """Test getting trending when cache is empty"""
        mock_redis_instance = MagicMock()
        mock_redis_instance.zrevrange.return_value = []
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        trending_ids = service.get_trending_notebooks(limit=10)

        assert trending_ids == []

    @patch('app.services.trending_service.get_redis_client')
    def test_get_trending_notebooks_limit(self, mock_redis, db_session: Session):
        """Test limit parameter for trending notebooks"""
        mock_redis_instance = MagicMock()

        # Mock Redis ZREVRANGE response
        def mock_zrevrange(key, start, stop, **kwargs):
            # Return different number of IDs based on stop
            count = stop - start + 1
            return [f"notebook:{i}" for i in range(1, count + 1)]

        mock_redis_instance.zrevrange.side_effect = mock_zrevrange
        mock_redis.return_value = mock_redis_instance

        service = TrendingService(db_session)

        # Create notebooks
        user = create_user(db_session)
        for i in range(5):
            create_notebook(db_session, user_id=user.id, title=f"Notebook {i+1}")

        # Get limited results
        trending_ids = service.get_trending_notebooks(limit=3)
        assert len(trending_ids) == 3
