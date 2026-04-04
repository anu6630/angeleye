"""
Celery tasks for trending score recalculation.

DISC-01: Trending algorithm uses time-decayed engagement scores
DISC-02: ML-driven feeds with engagement data
PERF-06: Redis caching for trending scores
"""
from celery import Task
from celery.schedules import crontab
from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.trending_service import TrendingService
import logging

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task with database session management"""

    _db = None

    @property
    def db(self):
        if self._db is None:
            self._db = SessionLocal()
        return self._db

    def after_return(self, *args, **kwargs):
        """Clean up database session after task completes"""
        if self._db is not None:
            self._db.close()
            self._db = None


@celery_app.task(base=DatabaseTask, bind=True, name='app.tasks.trending_tasks.recalculate_trending_scores')
def recalculate_trending_scores(self):
    """
    Recalculate trending scores for all published notebooks.

    DISC-01: Time-decayed engagement scores updated every 2 minutes
    PERF-06: Redis cache updated with fresh scores from database

    This Celery beat task:
    1. Queries all published notebooks (is_published=True, is_archived=False)
    2. Recalculates time-decayed scores based on engagement (likes, comments)
    3. Updates Redis ZSET (trending:all) and HASH (notebook:{id}:score)

    Per CONTEXT.md D-25: Background recalculation every 2 minutes.

    Returns:
        Dict with:
        - status: 'success'
        - count: Number of notebooks recalculated
    """
    try:
        logger.info("Starting trending score recalculation")

        # Create TrendingService with database session
        trending_service = TrendingService(self.db)

        # Recalculate all scores
        count = trending_service.recalculate_all_scores()

        logger.info(f"Recalculated trending scores for {count} notebooks")

        return {
            'status': 'success',
            'count': count
        }

    except Exception as exc:
        logger.error(f"Trending score recalculation failed: {str(exc)}")
        raise


@celery_app.task(base=DatabaseTask, bind=True, name='app.tasks.trending_tasks.bootstrap_trending_cache')
def bootstrap_trending_cache(self):
    """
    Bootstrap trending cache from database.

    PERF-06: Initialize Redis cache on application startup

    This task:
    1. Checks if cache is already bootstrapped
    2. If not, populates trending:all ZSET with all published notebooks
    3. Sets bootstrap flag to prevent re-bootstrapping

    Per CONTEXT.md D-28: Bootstrap on deploy/run.

    Returns:
        Dict with:
        - status: 'success' or 'already_bootstrapped'
        - count: Number of notebooks bootstrapped (if applicable)
    """
    try:
        logger.info("Checking if trending cache needs bootstrapping")

        # Create TrendingService with database session
        trending_service = TrendingService(self.db)

        # Bootstrap cache (no-op if already bootstrapped)
        count = trending_service.bootstrap_cache()

        if count is None:
            logger.info("Trending cache already bootstrapped")
            return {
                'status': 'already_bootstrapped',
                'count': 0
            }
        else:
            logger.info(f"Bootstrapped trending cache with {count} notebooks")
            return {
                'status': 'success',
                'count': count
            }

    except Exception as exc:
        logger.error(f"Trending cache bootstrap failed: {str(exc)}")
        raise


# Configure Celery Beat schedule
# Per CONTEXT.md D-25: Background recalculation every 2 minutes
celery_app.conf.beat_schedule = {
    'recalculate-trending-scores': {
        'task': 'app.tasks.trending_tasks.recalculate_trending_scores',
        'schedule': crontab(minute='*/2'),  # Every 2 minutes
    },
}
