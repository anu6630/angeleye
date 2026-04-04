from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.notebook import Notebook
from app.models.like import Like
from app.models.comment import Comment
from app.models.feed_event import FeedEvent
from app.core.redis_client import get_redis_client


class TrendingService:
    """Service for time-decayed trending algorithm with Redis caching

    Implements engagement-based trending with time decay per CONTEXT.md D-11:
    - engagement = (likes * 2) + (comments * 3) + (views * 0.05)
    - decayed_score = engagement / pow((age_hours + 2), 1.5)

    Forks are treated equally (no distinction in algorithm).
    """

    # Engagement weights per CONTEXT.md D-11
    WEIGHT_LIKE = 2
    WEIGHT_COMMENT = 3
    WEIGHT_VIEW = 0.05

    # Time decay exponent per CONTEXT.md D-11
    DECAY_EXPONENT = 1.5

    # Redis key prefixes
    KEY_NOTEBOOK_SCORE = "notebook:{}:score"
    KEY_TRENDING_ALL = "trending:all"
    KEY_CACHE_BOOTSTRAPPED = "cache:bootstrapped"

    def __init__(self, db: Session):
        """Initialize TrendingService

        Args:
            db: Database session for querying engagement data
        """
        self.db = db
        self.redis = get_redis_client()

    def calculate_engagement_score(self, notebook_id: int) -> Dict[str, Any]:
        """Calculate engagement score and time-decayed score for a notebook

        Args:
            notebook_id: ID of notebook to score

        Returns:
            Dict with engagement (int), decayed_score (float), age_hours (float), notebook_id (int)

        Raises:
            ValueError: If notebook not found
        """
        # Query notebook with engagement counts
        result = (
            self.db.query(
                Notebook.id,
                Notebook.created_at,
                func.count(func.distinct(Like.id)).label('like_count'),
                func.count(func.distinct(Comment.id)).label('comment_count')
            )
            .outerjoin(Like, Notebook.id == Like.notebook_id)
            .outerjoin(Comment, Notebook.id == Comment.notebook_id)
            .filter(Notebook.id == notebook_id)
            .group_by(Notebook.id, Notebook.created_at)
            .first()
        )

        if not result:
            raise ValueError(f"Notebook {notebook_id} not found")

        notebook_id, created_at, like_count, comment_count = result

        # Calculate engagement: (likes * 2) + (comments * 3)
        # Views not yet tracked, so formula is: engagement = (likes * 2) + (comments * 3)
        engagement = (like_count * self.WEIGHT_LIKE) + (comment_count * self.WEIGHT_COMMENT)

        # Calculate age in hours
        now = datetime.now(timezone.utc)
        age_hours = (now - created_at).total_seconds() / 3600

        # Calculate time-decayed score: engagement / pow((age_hours + 2), 1.5)
        decayed_score = engagement / pow((age_hours + 2), self.DECAY_EXPONENT)

        return {
            "notebook_id": notebook_id,
            "engagement": engagement,
            "decayed_score": decayed_score,
            "age_hours": age_hours,
            "like_count": like_count,
            "comment_count": comment_count
        }

    def update_notebook_score(self, notebook_id: int) -> None:
        """Update notebook's score in Redis cache

        Calculates score and stores in:
        - HASH: notebook:{id}:score (with 24h expiration)
        - ZSET: trending:all (ranked by decayed_score)

        Args:
            notebook_id: ID of notebook to update

        Raises:
            ValueError: If notebook not found
        """
        # Calculate score
        score_data = self.calculate_engagement_score(notebook_id)

        # Store in Redis hash
        hash_key = self.KEY_NOTEBOOK_SCORE.format(notebook_id)
        score_hash = {
            "engagement": str(score_data["engagement"]),
            "decayed_score": str(score_data["decayed_score"]),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        self.redis.hset(hash_key, mapping=score_hash)

        # Set expiration on hash (24 hours)
        self.redis.expire(hash_key, 86400)

        # Update trending ZSET
        self.redis.zadd(
            self.KEY_TRENDING_ALL,
            {f"notebook:{notebook_id}": score_data["decayed_score"]}
        )

    def increment_engagement(self, notebook_id: int, event_type: str) -> None:
        """Increment engagement score in real-time

        Updates engagement hash and recalculates decayed score inline.
        Called immediately after like/comment events.

        Args:
            notebook_id: ID of notebook to update
            event_type: Type of event ("like", "comment", "view")
        """
        # Determine weight
        if event_type == "like":
            weight = self.WEIGHT_LIKE
        elif event_type == "comment":
            weight = self.WEIGHT_COMMENT
        elif event_type == "view":
            weight = self.WEIGHT_VIEW
        else:
            raise ValueError(f"Unknown event type: {event_type}")

        # Increment engagement hash
        hash_key = self.KEY_NOTEBOOK_SCORE.format(notebook_id)
        new_engagement = self.redis.hincrby(hash_key, "engagement", weight)

        # Get notebook age for decay recalculation
        notebook = (
            self.db.query(Notebook.created_at)
            .filter(Notebook.id == notebook_id)
            .first()
        )

        if not notebook:
            return  # Notebook might have been deleted

        # Calculate age and decayed score
        now = datetime.now(timezone.utc)
        age_hours = (now - notebook.created_at).total_seconds() / 3600
        decayed_score = new_engagement / pow((age_hours + 2), self.DECAY_EXPONENT)

        # Update hash with new decayed score
        self.redis.hset(hash_key, "decayed_score", str(decayed_score))
        self.redis.hset(hash_key, "updated_at", datetime.now(timezone.utc).isoformat())

        # Update ZSET
        self.redis.zadd(
            self.KEY_TRENDING_ALL,
            {f"notebook:{notebook_id}": decayed_score}
        )

    def get_trending_notebooks(self, limit: int = 50) -> List[int]:
        """Get trending notebook IDs ordered by decayed score

        Args:
            limit: Maximum number of notebook IDs to return (default 50)

        Returns:
            List of notebook IDs ordered by decayed score DESC
        """
        # Query Redis ZSET in descending order
        result = self.redis.zrevrange(
            self.KEY_TRENDING_ALL,
            0,
            limit - 1,
            withscores=False
        )

        # Extract notebook IDs from "notebook:{id}" strings
        notebook_ids = []
        for item in result:
            # item is "notebook:{id}"
            try:
                notebook_id = int(item.split(":")[1])
                notebook_ids.append(notebook_id)
            except (IndexError, ValueError):
                continue

        return notebook_ids

    def recalculate_all_scores(self) -> None:
        """Recalculate scores for all published notebooks

        Updates Redis cache with fresh scores from database.
        Called by Celery beat task every 2 minutes.
        """
        # Query all published notebooks
        notebooks = (
            self.db.query(Notebook.id)
            .filter(
                Notebook.is_published == True,
                Notebook.is_archived == False
            )
            .all()
        )

        # Recalculate each notebook's score
        count = 0
        for notebook in notebooks:
            try:
                self.update_notebook_score(notebook.id)
                count += 1
            except ValueError:
                # Notebook might have been deleted
                continue

        return count

    def bootstrap_cache(self) -> None:
        """Bootstrap Redis cache from database

        Populates trending:all ZSET with all published notebooks if cache is empty.
        Should be called on application startup.
        """
        # Check if already bootstrapped
        bootstrapped = self.redis.exists(self.KEY_CACHE_BOOTSTRAPPED)

        if bootstrapped:
            return  # Already bootstrapped

        # Populate cache from database
        count = self.recalculate_all_scores()

        # Set bootstrap flag (expires in 24 hours)
        self.redis.setex(self.KEY_CACHE_BOOTSTRAPPED, 86400, "true")

        return count

    def record_event(
        self,
        user_id: int,
        notebook_id: int,
        event_type: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """Record feed event for future ML analysis

        Creates FeedEvent record in database. If event is a view,
        also updates engagement score in real-time.

        Per CONTEXT.md D-15: Event logging for ML foundation.
        Per CONTEXT.md D-24: Real-time score updates on engagement events.

        Args:
            user_id: ID of user who triggered event
            notebook_id: ID of notebook that was interacted with
            event_type: Type of event ("view", "like", "comment", "share", "fork")
            metadata: Optional additional event data
        """
        # Create FeedEvent record
        event = FeedEvent(
            user_id=user_id,
            notebook_id=notebook_id,
            event_type=event_type,
            metadata=metadata or {}
        )
        self.db.add(event)
        self.db.commit()

        # Update engagement in real-time for views
        if event_type == "view":
            self.increment_engagement(notebook_id, "view")
