"""
Unit tests for LikeService.

Tests like/unlike toggle operations, like counting, and trending integration.
Uses factory functions for test data and mocks for external services.
"""
import pytest
from unittest.mock import Mock, MagicMock
from sqlalchemy.orm import Session

from app.services.like_service import LikeService
from app.models.like import Like
from tests.test_factories import create_user, create_notebook


class TestLikeServiceToggle:
    """Test like/unlike toggle operations"""

    def test_like_notebook(self, db_session: Session):
        """Test liking a notebook (first toggle)"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        response = service.toggle_like(user.id, notebook.id)

        assert response.notebook_id == notebook.id
        assert response.user_id == user.id
        assert response.id is not None

        # Verify like was created in database
        like = db_session.query(Like).filter(
            Like.user_id == user.id,
            Like.notebook_id == notebook.id
        ).first()
        assert like is not None

        # Verify trending service was called
        mock_trending.increment_engagement.assert_called_once_with(notebook.id, "like")

    def test_unlike_notebook(self, db_session: Session):
        """Test unliking a notebook (second toggle)"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # First toggle creates like
        service.toggle_like(user.id, notebook.id)

        # Second toggle removes like
        response = service.toggle_like(user.id, notebook.id)

        assert response.notebook_id == notebook.id
        assert response.user_id == user.id

        # Verify like was deleted from database
        like = db_session.query(Like).filter(
            Like.user_id == user.id,
            Like.notebook_id == notebook.id
        ).first()
        assert like is None

    def test_like_nonexistent_notebook(self, db_session: Session):
        """Test liking a notebook that doesn't exist"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user = create_user(db_session)

        with pytest.raises(ValueError, match="Notebook not found"):
            service.toggle_like(user.id, 99999)


class TestLikeServiceQuery:
    """Test like query operations"""

    def test_get_notebook_likes(self, db_session: Session):
        """Test getting all likes for a notebook"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user1 = create_user(db_session, username="user1")
        user2 = create_user(db_session, username="user2")
        notebook = create_notebook(db_session, user_id=user1.id)

        # Create likes
        service.toggle_like(user1.id, notebook.id)
        service.toggle_like(user2.id, notebook.id)

        likes = service.get_notebook_likes(notebook.id)

        assert len(likes) == 2
        assert any(like.user_id == user1.id for like in likes)
        assert any(like.user_id == user2.id for like in likes)

    def test_get_user_liked_notebooks(self, db_session: Session):
        """Test getting list of notebooks user has liked"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user = create_user(db_session)
        notebook1 = create_notebook(db_session, user_id=user.id, title="Notebook 1")
        notebook2 = create_notebook(db_session, user_id=user.id, title="Notebook 2")
        notebook3 = create_notebook(db_session, user_id=user.id, title="Notebook 3")

        # Like notebook1 and notebook2
        service.toggle_like(user.id, notebook1.id)
        service.toggle_like(user.id, notebook2.id)

        liked_ids = service.get_user_liked_notebooks(user.id)

        assert len(liked_ids) == 2
        assert notebook1.id in liked_ids
        assert notebook2.id in liked_ids
        assert notebook3.id not in liked_ids

    def test_get_like_count(self, db_session: Session):
        """Test getting like count for a notebook"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user1 = create_user(db_session, username="user1")
        user2 = create_user(db_session, username="user2")
        user3 = create_user(db_session, username="user3")
        notebook = create_notebook(db_session, user_id=user1.id)

        # Create likes
        service.toggle_like(user1.id, notebook.id)
        service.toggle_like(user2.id, notebook.id)
        service.toggle_like(user3.id, notebook.id)

        count = service.get_like_count(notebook.id)

        assert count == 3

    def test_get_like_count_empty(self, db_session: Session):
        """Test getting like count for notebook with no likes"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        count = service.get_like_count(notebook.id)

        assert count == 0


class TestLikeServiceUniqueConstraint:
    """Test unique constraint on likes"""

    def test_duplicate_like_prevented_by_toggle(self, db_session: Session):
        """Test that toggle prevents duplicate likes"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # First toggle creates like
        service.toggle_like(user.id, notebook.id)

        # Verify like exists
        count = service.get_like_count(notebook.id)
        assert count == 1

        # Second toggle removes like (not creates duplicate)
        service.toggle_like(user.id, notebook.id)

        # Verify like was removed
        count = service.get_like_count(notebook.id)
        assert count == 0


class TestLikeServiceTrendingIntegration:
    """Test integration with trending service"""

    def test_like_updates_trending(self, db_session: Session):
        """Test that liking updates trending score"""
        mock_trending = Mock()
        service = LikeService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        service.toggle_like(user.id, notebook.id)

        mock_trending.increment_engagement.assert_called_once_with(notebook.id, "like")

    def test_trending_failure_doesnt_prevent_like(self, db_session: Session):
        """Test that trending service failure doesn't prevent like operation"""
        # Mock trending service to raise exception
        mock_trending = Mock()
        mock_trending.increment_engagement.side_effect = Exception("Redis connection failed")

        service = LikeService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Like should still succeed despite trending failure
        response = service.toggle_like(user.id, notebook.id)

        assert response.notebook_id == notebook.id

        # Verify like was created in database
        like = db_session.query(Like).filter(
            Like.user_id == user.id,
            Like.notebook_id == notebook.id
        ).first()
        assert like is not None
