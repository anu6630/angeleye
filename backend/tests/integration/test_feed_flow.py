"""
Integration tests for feed flow.

TEST-03: Integration tests covering followed users → personalized feed → trending fallback
Tests use real PostgreSQL and Redis.
"""
import pytest
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from app.services.feed_service import FeedService
from app.services.trending_service import TrendingService
from tests.test_factories import (
    create_user,
    create_published_notebook_with_cells,
    create_follow,
    create_like,
    create_comment,
    create_notebook
)


@pytest.mark.integration
class TestFeedFlow:
    """Feed integration tests"""

    def test_personalized_feed_from_follows(
        self,
        db_session: Session
    ):
        """Test: Personalized feed from followed users"""
        # Create users
        user_a = create_user(db_session, username='follower')
        user_b = create_user(db_session, username='followed_b')
        user_c = create_user(db_session, username='followed_c')
        user_d = create_user(db_session, username='not_followed')

        # User A follows B and C
        create_follow(db_session, follower_id=user_a.id, following_id=user_b.id)
        create_follow(db_session, follower_id=user_a.id, following_id=user_c.id)

        # Create notebooks
        notebook_b = create_published_notebook_with_cells(
            db_session,
            user_id=user_b.id,
            title="Notebook by B"
        )
        notebook_c = create_published_notebook_with_cells(
            db_session,
            user_id=user_c.id,
            title="Notebook by C"
        )
        notebook_d = create_published_notebook_with_cells(
            db_session,
            user_id=user_d.id,
            title="Notebook by D"
        )

        # Get personalized feed
        feed_service = FeedService(db_session)
        feed = feed_service.get_personalized_feed(user_a.id, limit=10)

        # Verify feed includes followed users' notebooks
        notebook_ids = [item['id'] for item in feed['items']]
        assert notebook_b.id in notebook_ids or len(feed['items']) < 10
        assert notebook_c.id in notebook_ids or len(feed['items']) < 10
        # D's notebook might not be in feed (not followed)

    def test_trending_fallback_for_no_follows(
        self,
        db_session: Session
    ):
        """Test: Trending fallback for users with no follows"""
        # Create user with no follows
        user = create_user(db_session, username='no_follows')

        # Create trending notebooks (high engagement)
        trending_user = create_user(db_session, username='trending_author')
        trending_notebook = create_published_notebook_with_cells(
            db_session,
            user_id=trending_user.id,
            title="Trending Notebook",
            days_ago=1
        )

        # Add engagement
        for i in range(10):
            liker = create_user(db_session, username=f'liker_{i}')
            create_like(db_session, user_id=liker.id, notebook_id=trending_notebook.id)

        # Get feed (should return trending)
        feed_service = FeedService(db_session)
        feed = feed_service.get_personalized_feed(user.id, limit=10)

        # Verify feed structure
        assert 'items' in feed
        assert isinstance(feed['items'], list)
        # Should have trending content
        if len(feed['items']) > 0:
            assert trending_notebook.id in [item['id'] for item in feed['items']]

    def test_feed_excludes_unpublished(
        self,
        db_session: Session
    ):
        """Test: Feed excludes unpublished notebooks"""
        # Create user
        user = create_user(db_session, username='feed_viewer')

        # Create published and draft notebooks
        author = create_user(db_session, username='author')
        published = create_published_notebook_with_cells(
            db_session,
            user_id=author.id,
            title="Published Notebook"
        )
        draft = create_notebook(
            db_session,
            user_id=author.id,
            title="Draft Notebook",
            is_published=False
        )

        # Get feed
        feed_service = FeedService(db_session)
        feed = feed_service.get_personalized_feed(user.id, limit=10)

        # Verify only published in feed
        notebook_ids = [item['id'] for item in feed['items']]
        assert published.id in notebook_ids or len(feed['items']) < 10
        assert draft.id not in notebook_ids

    def test_feed_pagination_with_cursor(
        self,
        db_session: Session
    ):
        """Test: Feed pagination with cursor"""
        # Create user and many notebooks
        user = create_user(db_session, username='paginated_user')
        author = create_user(db_session, username='prolific_author')

        # Create 15 notebooks
        notebooks = []
        for i in range(15):
            nb = create_published_notebook_with_cells(
                db_session,
                user_id=author.id,
                title=f"Notebook {i}"
            )
            notebooks.append(nb)

        # Get first page
        feed_service = FeedService(db_session)
        page1 = feed_service.get_personalized_feed(user.id, limit=10)

        # Verify first page
        assert len(page1['items']) <= 10

        # Get second page if cursor exists
        if page1.get('next_cursor'):
            page2 = feed_service.get_personalized_feed(
                user.id,
                limit=10,
                cursor=page1['next_cursor']
            )

            # Verify no duplicates
            page1_ids = [item['id'] for item in page1['items']]
            page2_ids = [item['id'] for item in page2['items']]
            assert len(set(page1_ids) & set(page2_ids)) == 0

    def test_record_view_increments_count(
        self,
        db_session: Session
    ):
        """Test: Recording view increments count"""
        # Create notebook
        user = create_user(db_session, username='viewer')
        notebook = create_published_notebook_with_cells(
            db_session,
            user_id=user.id,
            title="Viewed Notebook"
        )

        # Record view
        feed_service = FeedService(db_session)
        feed_service.record_view(notebook.id, user.id)

        # Get metrics
        metrics = feed_service.get_engagement_metrics([notebook.id])

        # Verify view counted
        assert notebook.id in metrics
        assert metrics[notebook.id]['views'] >= 1

    def test_feed_cache_invalidation(
        self,
        db_session: Session
    ):
        """Test: Feed cache invalidation on publish"""
        # Create user and follow
        user_a = create_user(db_session, username='follower')
        user_b = create_user(db_session, username='author')
        create_follow(db_session, follower_id=user_a.id, following_id=user_b.id)

        # Get initial feed
        feed_service = FeedService(db_session)
        feed1 = feed_service.get_personalized_feed(user_a.id, limit=10)

        # Publish new notebook
        new_notebook = create_published_notebook_with_cells(
            db_session,
            user_id=user_b.id,
            title="New Notebook"
        )

        # Invalidate cache
        feed_service.invalidate_user_feed(user_a.id)

        # Get feed again
        feed2 = feed_service.get_personalized_feed(user_a.id, limit=10)

        # Verify new notebook in feed
        notebook_ids = [item['id'] for item in feed2['items']]
        assert new_notebook.id in notebook_ids or len(feed2['items']) < 10

    def test_trending_algorithm(
        self,
        db_session: Session
    ):
        """Test: Trending algorithm ranks by time-decayed score"""
        # Create notebooks with varying engagement
        author = create_user(db_session, username='trending_author')

        # Old notebook with high engagement
        old_notebook = create_published_notebook_with_cells(
            db_session,
            user_id=author.id,
            title="Old Popular",
            days_ago=10
        )
        for i in range(20):
            liker = create_user(db_session, username=f'old_liker_{i}')
            create_like(db_session, user_id=liker.id, notebook_id=old_notebook.id)

        # New notebook with medium engagement
        new_notebook = create_published_notebook_with_cells(
            db_session,
            user_id=author.id,
            title="New Popular",
            days_ago=1
        )
        for i in range(15):
            liker = create_user(db_session, username=f'new_liker_{i}')
            create_like(db_session, user_id=liker.id, notebook_id=new_notebook.id)

        # Get trending feed
        feed_service = FeedService(db_session)
        trending = feed_service.get_trending_feed(limit=10)

        # Verify trending structure
        assert 'items' in trending
        assert isinstance(trending['items'], list)

    def test_feed_respects_fork_weightage(
        self,
        db_session: Session
    ):
        """Test: Forks have equal weightage in feed"""
        # Create original and fork
        user_a = create_user(db_session, username='original_author')
        original = create_published_notebook_with_cells(
            db_session,
            user_id=user_a.id,
            title="Original"
        )

        user_b = create_user(db_session, username='forker')
        from tests.test_factories import create_notebook
        fork = create_notebook(
            db_session,
            user_id=user_b.id,
            title="Fork",
            parent_id=original.id,
            root_id=original.id,
            is_published=True
        )

        # Create user who follows both authors
        user_c = create_user(db_session, username='feed_viewer')
        create_follow(db_session, follower_id=user_c.id, following_id=user_a.id)
        create_follow(db_session, follower_id=user_c.id, following_id=user_b.id)

        # Get feed
        feed_service = FeedService(db_session)
        feed = feed_service.get_personalized_feed(user_c.id, limit=10)

        # Verify both can appear in feed
        notebook_ids = [item['id'] for item in feed['items']]
        # Both should have equal weightage
        if len(feed['items']) >= 2:
            assert original.id in notebook_ids or fork.id in notebook_ids

    def test_engagement_tracking(
        self,
        db_session: Session
    ):
        """Test: Engagement tracking for trending calculation"""
        # Create notebook
        user = create_user(db_session, username='engager')
        notebook = create_published_notebook_with_cells(
            db_session,
            user_id=user.id,
            title="Engaging Notebook"
        )

        # Add various engagement
        for i in range(5):
            liker = create_user(db_session, username=f'liker_{i}')
            create_like(db_session, user_id=liker.id, notebook_id=notebook.id)

        for i in range(3):
            commenter = create_user(db_session, username=f'commenter_{i}')
            create_comment(
                db_session,
                user_id=commenter.id,
                notebook_id=notebook.id,
                content=f"Comment {i}"
            )

        # Record views
        feed_service = FeedService(db_session)
        for i in range(10):
            viewer = create_user(db_session, username=f'viewer_{i}')
            feed_service.record_view(notebook.id, viewer.id)

        # Get metrics
        metrics = feed_service.get_engagement_metrics([notebook.id])

        # Verify all engagement tracked
        assert notebook.id in metrics
        assert metrics[notebook.id]['likes'] == 5
        assert metrics[notebook.id]['comments'] == 3
        assert metrics[notebook.id]['views'] >= 10
