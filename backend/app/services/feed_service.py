from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import func, and_
from sqlalchemy.orm import Session

from app.models.notebook import Notebook
from app.models.user import User
from app.models.like import Like
from app.models.comment import Comment
from app.models.follow import Follow
from app.models.feed_event import FeedEvent
from app.core.redis_client import get_redis_client
from app.services.trending_service import TrendingService
from app.services.follow_service import FollowService


class FeedService:
    """Service for personalized feed operations with Redis caching

    Implements personalized feed algorithm per CONTEXT.md D-12:
    - Feed = followed users' content + trending content
    - Prioritizes followed content, fills rest with trending
    - 0 follows = 100% trending (cold start fallback)

    Caching strategy per CONTEXT.md D-23:
    - Feed results cached in Redis for 1 minute
    - Lazy invalidation on publish/update events
    """

    # Redis key prefixes
    KEY_FEED_USER = "feed:user:{}"
    KEY_NOTEBOOK_VIEWS = "notebook:{}:views"

    # Cache TTL (60 seconds per CONTEXT.md D-23)
    FEED_CACHE_TTL = 60

    def __init__(self, db: Session):
        """Initialize FeedService

        Args:
            db: Database session for querying notebooks and relationships
        """
        self.db = db
        self.redis = get_redis_client()
        self.follow_service = FollowService(db)
        self.trending_service = TrendingService(db)

    def get_personalized_feed(
        self,
        user_id: Optional[int],
        limit: int = 50,
        cursor: Optional[str] = None
    ) -> dict:
        """Get personalized feed mixing followed content with trending

        Per CONTEXT.md D-12: Personalized feed = followed + trending
        - If user has follows: prioritize followed content, fill rest with trending
        - If user has 0 follows: return 100% trending (cold start fallback)
        - If not authenticated: return trending feed

        Args:
            user_id: Optional user ID for personalization (None = not authenticated)
            limit: Number of items to return (max 100)
            cursor: ISO format timestamp for pagination

        Returns:
            Dict with items (list of notebooks), next_cursor, has_more
        """
        # Cap limit
        limit = min(limit, 100)

        # If not authenticated, return trending feed
        if user_id is None:
            return self.get_trending_feed(limit, cursor, None)

        # Try cache first (only if no cursor for pagination)
        cache_key = self.KEY_FEED_USER.format(user_id)
        if cursor is None:
            try:
                cached_ids = self.redis.lrange(cache_key, 0, limit - 1)
                if cached_ids:
                    # Cache hit - fetch notebooks and return
                    notebook_ids = [int(nid) for nid in cached_ids]
                    notebooks = self._get_notebooks_by_ids(notebook_ids)
                    return {
                        "items": [self._notebook_to_dict(nb, user_id) for nb in notebooks],
                        "next_cursor": None,
                        "has_more": False
                    }
            except Exception:
                # Redis error - fall through to generate feed
                pass

        # Cache miss or cursor provided - build feed
        # Get followed users' IDs
        following_data = self.follow_service.get_follow_counts(user_id)
        following_count = following_data.get("following_count", 0)

        # Cold start fallback: 0 follows = 100% trending
        if following_count == 0:
            return self.get_trending_feed(limit, cursor, user_id)

        # Get followed notebooks
        followed_notebooks = self._get_followed_notebooks(user_id, limit)

        # Get trending notebooks
        trending_notebook_ids = self.trending_service.get_trending_notebooks(limit=limit)
        trending_notebooks = self._get_notebooks_by_ids(trending_notebook_ids)

        # Merge and deduplicate (followed content has priority)
        seen_ids = {nb.id for nb in followed_notebooks}
        feed_notebooks = followed_notebooks.copy()

        for nb in trending_notebooks:
            if nb.id not in seen_ids:
                feed_notebooks.append(nb)
                seen_ids.add(nb.id)

        # Sort by: priority (followed=2, trending=1) then created_at DESC
        def sort_key(nb):
            priority = 2 if any(nb.id == fn.id for fn in followed_notebooks) else 1
            return (priority, nb.created_at)

        feed_notebooks.sort(key=sort_key, reverse=True)

        # Apply cursor pagination
        if cursor:
            try:
                cursor_time = datetime.fromisoformat(cursor.replace('Z', '+00:00'))
                feed_notebooks = [nb for nb in feed_notebooks if nb.created_at < cursor_time]
            except ValueError:
                pass  # Invalid cursor

        # Limit results
        has_more = len(feed_notebooks) > limit
        feed_notebooks = feed_notebooks[:limit]

        # Cache result (store notebook IDs)
        if cursor is None and feed_notebooks:
            try:
                notebook_ids = [str(nb.id) for nb in feed_notebooks]
                # Delete old cache and push new list
                self.redis.delete(cache_key)
                if notebook_ids:
                    self.redis.lpush(cache_key, *notebook_ids)
                    self.redis.expire(cache_key, self.FEED_CACHE_TTL)
            except Exception:
                pass  # Redis failure shouldn't break the feed

        # Record feed events for future ML (async, don't fail on error)
        for nb in feed_notebooks:
            try:
                self._record_feed_event(user_id, nb.id, "impression")
            except Exception:
                pass  # Event logging failure shouldn't break the feed

        # Build response
        return {
            "items": [self._notebook_to_dict(nb, user_id) for nb in feed_notebooks],
            "next_cursor": feed_notebooks[-1].created_at.isoformat() if feed_notebooks and has_more else None,
            "has_more": has_more
        }

    def get_trending_feed(
        self,
        limit: int = 50,
        cursor: Optional[str] = None,
        viewer_id: Optional[int] = None
    ) -> dict:
        """Get trending notebooks feed

        Args:
            limit: Number of items to return (max 100)
            cursor: ISO format timestamp for pagination

        Returns:
            Dict with items (list of notebooks), next_cursor, has_more
        """
        limit = min(limit, 100)

        # Get trending notebook IDs
        trending_ids = self.trending_service.get_trending_notebooks(limit=limit + 1)

        # Fetch full notebooks
        notebooks = self._get_notebooks_by_ids(trending_ids)

        # DISC-01: Mix in discovery (most recent notebooks that might not be trending yet)
        if cursor is None:
            # Refresh session to ensure we see the latest commits (DISC-01, DISC-02)
            self.db.expire_all()
            
            from sqlalchemy.orm import joinedload
            recent_notebooks = (
                self.db.query(Notebook)
                .options(joinedload(Notebook.user))
                .filter(Notebook.is_published == True, Notebook.is_archived == False)
                .order_by(Notebook.created_at.desc())
                .limit(10) # Increased limit to ensure discovery even with many rapid posts
                .all()
            )
            
            # Add recent notebooks to the top if not already there
            # Ensure seen_ids check works with dicts (already in result format)
            seen_ids = set()
            for nb in notebooks:
                if isinstance(nb, dict):
                    seen_ids.add(nb.get('id'))
                elif hasattr(nb, 'id'):
                    seen_ids.add(nb.id)
            
            discovery_items = []
            for rnb in recent_notebooks:
                if rnb.id not in seen_ids:
                    discovery_items.append(rnb)

            notebooks = discovery_items + notebooks

        # Apply cursor pagination
        if cursor:
            try:
                cursor_time = datetime.fromisoformat(cursor.replace('Z', '+00:00'))
                notebooks = [nb for nb in notebooks if nb.created_at < cursor_time]
            except ValueError:
                pass  # Invalid cursor

        # Limit results
        has_more = len(notebooks) > limit
        notebooks = notebooks[:limit]

        return {
            "items": [self._notebook_to_dict(nb) for nb in notebooks],
            "next_cursor": notebooks[-1].created_at.isoformat() if notebooks and has_more else None,
            "has_more": has_more
        }

    def invalidate_user_feed(self, user_id: int) -> None:
        """Invalidate feed cache for all followers of a user

        Called when a user publishes or updates a notebook.
        Per CONTEXT.md D-27: Cache invalidation on notebook publish/update.

        Args:
            user_id: ID of user whose followers' caches should be invalidated
        """
        # Get all followers of this user
        followers = (
            self.db.query(Follow.follower_id)
            .filter(Follow.following_id == user_id)
            .all()
        )

        # Delete feed cache for each follower
        for follower in followers:
            cache_key = self.KEY_FEED_USER.format(follower.follower_id)
            try:
                self.redis.delete(cache_key)
            except Exception:
                pass  # Redis failure shouldn't break operations
        
        # Also invalidate the user's own feed cache (DISC-01)
        try:
            self.redis.delete(self.KEY_FEED_USER.format(user_id))
        except Exception:
            pass

    def get_engagement_metrics(self, notebook_ids: List[int]) -> Dict[int, Dict[str, int]]:
        """Get engagement metrics for multiple notebooks

        Per CONTEXT.md D-30: Engagement metrics displayed (likes, comments, views).
        Fetches from Redis for real-time accuracy, falls back to DB if Redis fails.

        Args:
            notebook_ids: List of notebook IDs to get metrics for

        Returns:
            Dict mapping notebook_id to {likes: int, comments: int, views: int}
        """
        if not notebook_ids:
            return {}

        metrics = {}

        # Try to get metrics from Redis first
        try:
            for nid in notebook_ids:
                # Get likes from trending score hash
                score_key = TrendingService.KEY_NOTEBOOK_SCORE.format(nid)
                engagement_str = self.redis.hget(score_key, "engagement")

                # Get views from views hash
                views_key = self.KEY_NOTEBOOK_VIEWS.format(nid)
                views = int(self.redis.hget(views_key, "count") or 0)

                # Parse engagement to get likes + comments
                # engagement = (likes * 2) + (comments * 3)
                # We'll fetch exact counts from DB for accuracy
                metrics[nid] = {
                    "likes": 0,
                    "comments": 0,
                    "views": views
                }
        except Exception:
            # Redis failure - fall back to DB only
            metrics = {}

        # Fill in exact like/comment counts from DB
        db_counts = self._get_counts_for_notebooks(notebook_ids)

        for nid in notebook_ids:
            if nid not in metrics:
                metrics[nid] = {"likes": 0, "comments": 0, "views": 0}
            metrics[nid]["likes"] = db_counts.get(nid, {}).get("like_count", 0)
            metrics[nid]["comments"] = db_counts.get(nid, {}).get("comment_count", 0)

        return metrics

    def record_view(
        self,
        notebook_id: int,
        user_id: Optional[int] = None
    ) -> None:
        """Record a view event for a notebook

        Per CONTEXT.md D-31: View tracking via Redis, batch synced to DB.
        Increments view counter in Redis and creates FeedEvent if user_id provided.

        Args:
            notebook_id: ID of notebook being viewed
            user_id: Optional user ID who viewed the notebook
        """
        # Increment view counter in Redis
        try:
            views_key = self.KEY_NOTEBOOK_VIEWS.format(notebook_id)
            self.redis.hincrby(views_key, "count", 1)

            # Update engagement score for trending
            self.trending_service.increment_engagement(notebook_id, "view")
        except Exception:
            pass  # Redis failure shouldn't break the view

        # Record feed event if user authenticated
        if user_id:
            self._record_feed_event(user_id, notebook_id, "view")

    def _get_counts_for_notebooks(self, notebook_ids: List[int]) -> Dict[int, Dict[str, int]]:
        """Get like and comment counts for a list of notebooks

        Args:
            notebook_ids: List of notebook IDs

        Returns:
            Dict mapping notebook_id to {like_count, comment_count}
        """
        if not notebook_ids:
            return {}

        # Get like counts
        like_counts = (
            self.db.query(
                Like.notebook_id,
                func.count(Like.id).label('count')
            )
            .filter(Like.notebook_id.in_(notebook_ids))
            .group_by(Like.notebook_id)
            .all()
        )

        # Get comment counts
        comment_counts = (
            self.db.query(
                Comment.notebook_id,
                func.count(Comment.id).label('count')
            )
            .filter(Comment.notebook_id.in_(notebook_ids))
            .group_by(Comment.notebook_id)
            .all()
        )

        # Build result dict
        result = {}
        for nid in notebook_ids:
            result[nid] = {
                'like_count': 0,
                'comment_count': 0
            }

        for notebook_id, count in like_counts:
            result[notebook_id]['like_count'] = count

        for notebook_id, count in comment_counts:
            result[notebook_id]['comment_count'] = count

        return result

    def _get_followed_notebooks(self, user_id: int, limit: int = 50) -> List[Notebook]:
        """Get notebooks from users that user_id follows

        Args:
            user_id: ID of user whose follow graph to query
            limit: Maximum number of notebooks to return

        Returns:
            List of Notebook objects
        """
        # Get followed user IDs
        followed_ids = (
            self.db.query(Follow.following_id)
            .filter(Follow.follower_id == user_id)
            .limit(100)
            .all()
        )

        if not followed_ids:
            return []

        followed_ids = [f.following_id for f in followed_ids]

        # Query notebooks from followed users
        notebooks = (
            self.db.query(Notebook)
            .filter(
                Notebook.user_id.in_(followed_ids),
                Notebook.is_published == True,
                Notebook.is_archived == False
            )
            .order_by(Notebook.created_at.desc())
            .limit(limit)
            .all()
        )

        return notebooks

    def _get_notebooks_by_ids(self, notebook_ids: List[int]) -> List[Notebook]:
        """Get notebook objects by IDs

        Args:
            notebook_ids: List of notebook IDs

        Returns:
            List of Notebook objects (excluding deleted ones)
        """
        if not notebook_ids:
            return []

        notebooks = (
            self.db.query(Notebook)
            .filter(
                Notebook.id.in_(notebook_ids),
                Notebook.is_published == True,
                Notebook.is_archived == False
            )
            .all()
        )

        # Sort by original order (trending order)
        notebook_dict = {nb.id: nb for nb in notebooks}
        sorted_notebooks = []

        for nid in notebook_ids:
            if nid in notebook_dict:
                sorted_notebooks.append(notebook_dict[nid])

        return sorted_notebooks

    def _notebook_to_dict(
        self,
        notebook: Notebook,
        viewer_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Convert notebook to dict for API response

        Args:
            notebook: Notebook object
            viewer_id: Optional user ID viewing the notebook

        Returns:
            Dict representation of notebook
        """
        # Get basic info
        username = None
        avatar_url = None
        
        if hasattr(notebook, 'user') and notebook.user:
            username = getattr(notebook.user, 'username', None)
            avatar_url = getattr(notebook.user, 'avatar_url', None)
            
        from app.services.banner_service import build_banner_urls
        _banner_full, banner_thumbnail_url = build_banner_urls(notebook)

        result = {
            "id": notebook.id,
            "title": notebook.title,
            "user_id": notebook.user_id,
            "username": username,
            "avatar_url": avatar_url,
            "banner_thumbnail_url": banner_thumbnail_url,
            "output_url": notebook.output_url,
            "created_at": notebook.created_at.isoformat() if notebook.created_at else None,
            "updated_at": notebook.updated_at.isoformat() if notebook.updated_at else None,
            "like_count": 0,
            "comment_count": 0,
            "view_count": 0
        }

        # Get engagement metrics
        metrics = self.get_engagement_metrics([notebook.id])
        if notebook.id in metrics:
            result["like_count"] = metrics[notebook.id]["likes"]
            result["comment_count"] = metrics[notebook.id]["comments"]
            result["view_count"] = metrics[notebook.id]["views"]

        return result

    def _record_feed_event(
        self,
        user_id: int,
        notebook_id: int,
        event_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record a feed event for future ML analysis

        Per CONTEXT.md D-15: Event logging for ML foundation.
        Errors are suppressed - event logging failure shouldn't break operations.

        Args:
            user_id: ID of user who triggered event
            notebook_id: ID of notebook that was interacted with
            event_type: Type of event ("view", "like", "comment", "impression")
            metadata: Optional additional event data
        """
        try:
            event = FeedEvent(
                user_id=user_id,
                notebook_id=notebook_id,
                event_type=event_type,
                metadata=metadata or {}
            )
            self.db.add(event)
            self.db.commit()
        except Exception:
            pass  # Event logging failure shouldn't break operations
