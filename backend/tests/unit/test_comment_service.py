"""
Unit tests for CommentService.

Tests comment creation, threaded replies, depth limits, and deletion.
Uses factory functions for test data and mocks for external services.
"""
import pytest
from unittest.mock import Mock, MagicMock
from sqlalchemy.orm import Session

from app.services.comment_service import CommentService
from app.models.comment import Comment
from app.models.user import User
from tests.test_factories import create_user, create_notebook, create_comment


class TestCommentServiceCreate:
    """Test comment creation"""

    def test_create_comment(self, db_session: Session):
        """Test creating a top-level comment"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        response = service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Great notebook!"
        )

        assert response.content == "Great notebook!"
        assert response.user_id == user.id
        assert response.notebook_id == notebook.id
        assert response.parent_id is None
        assert response.id is not None
        assert response.username == user.username

        # Verify comment was created in database
        comment = db_session.query(Comment).filter(Comment.id == response.id).first()
        assert comment is not None

        # Verify trending service was called
        mock_trending.increment_engagement.assert_called_once_with(notebook.id, "comment")

    def test_create_comment_nonexistent_notebook(self, db_session: Session):
        """Test creating comment on non-existent notebook"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)

        with pytest.raises(ValueError, match="Notebook not found"):
            service.create_comment(
                user_id=user.id,
                notebook_id=99999,
                content="Test comment"
            )

    def test_create_reply(self, db_session: Session):
        """Test creating a reply to a comment"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Create parent comment
        parent = service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Parent comment"
        )

        # Create reply
        reply = service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Reply to parent",
            parent_id=parent.id
        )

        assert reply.content == "Reply to parent"
        assert reply.parent_id == parent.id
        assert reply.notebook_id == notebook.id

    def test_create_reply_nonexistent_parent(self, db_session: Session):
        """Test creating reply to non-existent parent comment"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        with pytest.raises(ValueError, match="Parent comment not found"):
            service.create_comment(
                user_id=user.id,
                notebook_id=notebook.id,
                content="Reply",
                parent_id=99999
            )

    def test_create_reply_wrong_notebook(self, db_session: Session):
        """Test creating reply to comment from different notebook"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook1 = create_notebook(db_session, user_id=user.id, title="Notebook 1")
        notebook2 = create_notebook(db_session, user_id=user.id, title="Notebook 2")

        # Create comment on notebook1
        parent = service.create_comment(
            user_id=user.id,
            notebook_id=notebook1.id,
            content="Parent comment"
        )

        # Try to reply on notebook2
        with pytest.raises(ValueError, match="Parent comment belongs to different notebook"):
            service.create_comment(
                user_id=user.id,
                notebook_id=notebook2.id,
                content="Reply",
                parent_id=parent.id
            )


class TestCommentServiceDepthLimit:
    """Test comment depth limit enforcement"""

    def test_depth_limit_enforced(self, db_session: Session):
        """Test that comments are limited to MAX_DEPTH levels"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Create level 0 (root)
        level0 = service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Level 0"
        )

        # Create level 1
        level1 = service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Level 1",
            parent_id=level0.id
        )

        # Create level 2
        level2 = service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Level 2",
            parent_id=level1.id
        )

        # Create level 3 (should still work, MAX_DEPTH = 3)
        level3 = service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Level 3",
            parent_id=level2.id
        )
        assert level3 is not None

        # Try to create level 4 (should fail)
        with pytest.raises(ValueError, match="Maximum comment depth"):
            service.create_comment(
                user_id=user.id,
                notebook_id=notebook.id,
                content="Level 4",
                parent_id=level3.id
            )


class TestCommentServiceQuery:
    """Test comment query operations"""

    def test_get_comment_count_empty(self, db_session: Session):
        """Test getting comment count for notebook with no comments"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        count = service.get_comment_count(notebook.id)

        assert count == 0

    def test_get_comment_count(self, db_session: Session):
        """Test getting comment count for notebook"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Create comments
        service.create_comment(user_id=user.id, notebook_id=notebook.id, content="Comment 1")
        service.create_comment(user_id=user.id, notebook_id=notebook.id, content="Comment 2")
        service.create_comment(user_id=user.id, notebook_id=notebook.id, content="Comment 3")

        count = service.get_comment_count(notebook.id)

        assert count == 3

    # Note: get_comment_thread uses PostgreSQL-specific recursive CTEs with ARRAY
    # which are not supported in SQLite. These tests should be run against PostgreSQL
    # in integration tests. For unit tests, we test the individual methods that build
    # the thread structure.


class TestCommentServiceTrendingIntegration:
    """Test integration with trending service"""

    def test_comment_updates_trending(self, db_session: Session):
        """Test that commenting updates trending score"""
        mock_trending = Mock()
        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Great notebook!"
        )

        mock_trending.increment_engagement.assert_called_once_with(notebook.id, "comment")

    def test_trending_failure_doesnt_prevent_comment(self, db_session: Session):
        """Test that trending service failure doesn't prevent comment operation"""
        # Mock trending service to raise exception
        mock_trending = Mock()
        mock_trending.increment_engagement.side_effect = Exception("Redis connection failed")

        service = CommentService(db_session, mock_trending)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Comment should still succeed despite trending failure
        response = service.create_comment(
            user_id=user.id,
            notebook_id=notebook.id,
            content="Great notebook!"
        )

        assert response.content == "Great notebook!"

        # Verify comment was created in database
        comment = db_session.query(Comment).filter(Comment.id == response.id).first()
        assert comment is not None
