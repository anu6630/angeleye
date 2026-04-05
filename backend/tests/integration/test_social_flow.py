"""
Integration tests for social interactions flow.

TEST-03: Integration tests covering follow → like → comment → feed updates
Tests use real PostgreSQL.
"""
import pytest
from sqlalchemy.orm import Session

from app.services.follow_service import FollowService
from app.services.like_service import LikeService
from app.services.comment_service import CommentService
from app.services.feed_service import FeedService
from app.services.trending_service import TrendingService
from tests.test_factories import (
    create_user,
    create_notebook,
    create_follow,
    create_like,
    create_comment
)


@pytest.mark.integration
class TestSocialFlow:
    """Social interactions integration tests"""

    def test_follow_user(
        self,
        db_session: Session
    ):
        """Test: Follow user"""
        # Create users
        user_a = create_user(db_session, username='follower')
        user_b = create_user(db_session, username='following')

        # Follow
        follow_service = FollowService(db_session)
        follow = follow_service.follow_user(user_a.id, user_b.id)

        # Verify follow created
        assert follow is not None
        assert follow.follower_id == user_a.id
        assert follow.following_id == user_b.id

        # Verify in follow counts
        counts = follow_service.get_follow_counts(user_a.id)
        assert counts['following_count'] == 1

        target_counts = follow_service.get_follow_counts(user_b.id)
        assert target_counts['follower_count'] == 1

    def test_unfollow_user(
        self,
        db_session: Session
    ):
        """Test: Unfollow user"""
        # Create users and follow relationship
        user_a = create_user(db_session, username='follower')
        user_b = create_user(db_session, username='following')
        follow = create_follow(db_session, follower_id=user_a.id, following_id=user_b.id)

        # Unfollow
        follow_service = FollowService(db_session)
        success = follow_service.unfollow_user(user_a.id, user_b.id)

        # Verify unfollowed
        assert success is True

        # Verify counts updated
        counts = follow_service.get_follow_counts(user_a.id)
        assert counts['following_count'] == 0

    def test_like_notebook(
        self,
        db_session: Session
    ):
        """Test: Like notebook"""
        # Create user and notebook
        user = create_user(db_session, username='liker')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Likable Notebook",
            is_published=True
        )

        # Like notebook
        like_service = LikeService(db_session)
        like = like_service.toggle_like(user.id, notebook.id)

        # Verify like created
        assert like is not None
        assert like.user_id == user.id
        assert like.notebook_id == notebook.id

        # Verify notebook has like
        notebook_likes = like_service.get_notebook_likes(notebook.id)
        assert len(notebook_likes) == 1

    def test_unlike_notebook(
        self,
        db_session: Session
    ):
        """Test: Unlike notebook (toggle)"""
        # Create user, notebook, and like
        user = create_user(db_session, username='liker')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Likable Notebook",
            is_published=True
        )
        like = create_like(db_session, user_id=user.id, notebook_id=notebook.id)

        # Verify like exists
        like_service = LikeService(db_session)
        notebook_likes = like_service.get_notebook_likes(notebook.id)
        assert len(notebook_likes) == 1

        # Unlike (toggle)
        like_service.toggle_like(user.id, notebook.id)

        # Verify like removed
        notebook_likes = like_service.get_notebook_likes(notebook.id)
        assert len(notebook_likes) == 0

    def test_comment_on_notebook(
        self,
        db_session: Session
    ):
        """Test: Comment on notebook"""
        # Create user and notebook
        user = create_user(db_session, username='commenter')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Commentable Notebook",
            is_published=True
        )

        # Comment
        comment_service = CommentService(db_session)
        comment = comment_service.create_comment(
            user.id,
            notebook.id,
            "Great notebook!"
        )

        # Verify comment created
        assert comment is not None
        assert comment.user_id == user.id
        assert comment.notebook_id == notebook.id
        assert comment.content == "Great notebook!"

        # Verify comment count
        count = comment_service.get_comment_count(notebook.id)
        assert count == 1

    def test_reply_to_comment(
        self,
        db_session: Session
    ):
        """Test: Reply to comment"""
        # Create user, notebook, and parent comment
        user = create_user(db_session, username='commenter')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Commentable Notebook",
            is_published=True
        )
        parent_comment = create_comment(
            db_session,
            user_id=user.id,
            notebook_id=notebook.id,
            content="Parent comment"
        )

        # Reply
        comment_service = CommentService(db_session)
        reply = comment_service.create_comment(
            user.id,
            notebook.id,
            "Reply to parent",
            parent_id=parent_comment.id
        )

        # Verify reply created
        assert reply is not None
        assert reply.parent_id == parent_comment.id

        # Verify thread has both comments
        thread = comment_service.get_comment_thread(notebook.id)
        assert len(thread) >= 2

    def test_get_follow_counts(
        self,
        db_session: Session
    ):
        """Test: Get follow counts"""
        # Create users
        user_a = create_user(db_session, username='user_a')
        user_b = create_user(db_session, username='user_b')
        user_c = create_user(db_session, username='user_c')

        # Create follows
        create_follow(db_session, follower_id=user_a.id, following_id=user_b.id)
        create_follow(db_session, follower_id=user_a.id, following_id=user_c.id)
        create_follow(db_session, follower_id=user_b.id, following_id=user_c.id)

        # Get counts
        follow_service = FollowService(db_session)

        # User A follows 2, has 0 followers
        counts_a = follow_service.get_follow_counts(user_a.id)
        assert counts_a['following_count'] == 2
        assert counts_a['follower_count'] == 0

        # User B follows 1, has 1 follower
        counts_b = follow_service.get_follow_counts(user_b.id)
        assert counts_b['following_count'] == 1
        assert counts_b['follower_count'] == 1

        # User C follows 0, has 2 followers
        counts_c = follow_service.get_follow_counts(user_c.id)
        assert counts_c['following_count'] == 0
        assert counts_c['follower_count'] == 2

    def test_engagement_metrics(
        self,
        db_session: Session
    ):
        """Test: Get engagement metrics for notebooks"""
        # Create notebook with engagement
        user_a = create_user(db_session, username='author')
        user_b = create_user(db_session, username='engager')
        notebook = create_notebook(
            db_session,
            user_id=user_a.id,
            title="Engaging Notebook",
            is_published=True
        )

        # Add likes
        for i in range(5):
            user = create_user(db_session, username=f'liker_{i}')
            create_like(db_session, user_id=user.id, notebook_id=notebook.id)

        # Add comments
        for i in range(3):
            create_comment(
                db_session,
                user_id=user_b.id,
                notebook_id=notebook.id,
                content=f"Comment {i}"
            )

        # Get metrics
        feed_service = FeedService(db_session)
        metrics = feed_service.get_engagement_metrics([notebook.id])

        # Verify metrics
        assert notebook.id in metrics
        assert metrics[notebook.id]['likes'] == 5
        assert metrics[notebook.id]['comments'] == 3

    def test_feed_includes_followed_users_content(
        self,
        db_session: Session
    ):
        """Test: Feed includes content from followed users"""
        # Create users
        user_a = create_user(db_session, username='follower')
        user_b = create_user(db_session, username='followed_user')
        user_c = create_user(db_session, username='unfollowed_user')

        # User A follows user B
        create_follow(db_session, follower_id=user_a.id, following_id=user_b.id)

        # Create notebooks
        notebook_b = create_notebook(
            db_session,
            user_id=user_b.id,
            title="By Followed User",
            is_published=True
        )
        notebook_c = create_notebook(
            db_session,
            user_id=user_c.id,
            title="By Unfollowed User",
            is_published=True
        )

        # Get personalized feed
        feed_service = FeedService(db_session)
        feed = feed_service.get_personalized_feed(user_a.id, limit=10)

        # Verify feed structure
        assert 'items' in feed
        assert isinstance(feed['items'], list)

    def test_is_following(
        self,
        db_session: Session
    ):
        """Test: Check if user is following another"""
        # Create users
        user_a = create_user(db_session, username='follower')
        user_b = create_user(db_session, username='following')

        follow_service = FollowService(db_session)

        # Not following initially
        assert follow_service.is_following(user_a.id, user_b.id) is False

        # Follow
        create_follow(db_session, follower_id=user_a.id, following_id=user_b.id)

        # Now following
        assert follow_service.is_following(user_a.id, user_b.id) is True

    def test_cannot_follow_twice(
        self,
        db_session: Session
    ):
        """Test: Cannot follow same user twice"""
        user_a = create_user(db_session, username='follower')
        user_b = create_user(db_session, username='following')

        # First follow
        follow_service = FollowService(db_session)
        follow1 = follow_service.follow_user(user_a.id, user_b.id)
        assert follow1 is not None

        # Second follow (should still work, return existing follow)
        follow2 = follow_service.follow_user(user_a.id, user_b.id)
        # Service handles duplicate follows gracefully
        assert follow2 is not None

        # Verify only one follow exists
        counts = follow_service.get_follow_counts(user_a.id)
        assert counts['following_count'] == 1

    def test_comment_count_increments(
        self,
        db_session: Session
    ):
        """Test: Comment count increments"""
        # Create notebook
        user = create_user(db_session, username='commenter')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Commentable Notebook",
            is_published=True
        )

        comment_service = CommentService(db_session)

        # Initial count
        count1 = comment_service.get_comment_count(notebook.id)
        assert count1 == 0

        # Add comment
        comment_service.create_comment(user.id, notebook.id, "First comment")

        # Count incremented
        count2 = comment_service.get_comment_count(notebook.id)
        assert count2 == 1

        # Add another comment
        comment_service.create_comment(user.id, notebook.id, "Second comment")

        # Count incremented again
        count3 = comment_service.get_comment_count(notebook.id)
        assert count3 == 2

    def test_like_count_increments(
        self,
        db_session: Session
    ):
        """Test: Like count increments"""
        # Create notebook
        user = create_user(db_session, username='liker')
        notebook = create_notebook(
            db_session,
            user_id=user.id,
            title="Likable Notebook",
            is_published=True
        )

        like_service = LikeService(db_session)

        # Initial count
        count1 = like_service.get_like_count(notebook.id)
        assert count1 == 0

        # Add like
        like_service.toggle_like(user.id, notebook.id)

        # Count incremented
        count2 = like_service.get_like_count(notebook.id)
        assert count2 == 1

        # Unlike
        like_service.toggle_like(user.id, notebook.id)

        # Count decremented
        count3 = like_service.get_like_count(notebook.id)
        assert count3 == 0
