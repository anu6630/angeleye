"""
Celery tasks for feed operations and view syncing.

Per CONTEXT.md D-31: View tracking via Redis, batch synced to DB
Per CONTEXT.md D-27: Cache invalidation on publish/update
"""
import logging
from celery import shared_task
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.redis_client import get_redis_client
from app.models.notebook import Notebook

logger = logging.getLogger(__name__)


@shared_task(name="sync_views_to_database")
def sync_views_to_database():
    """Sync view counts from Redis to database

    Per CONTEXT.md D-31: Batch sync views to database every 5 minutes
    This task is called by Celery beat on a schedule.

    Reads all view counts from Redis (notebook:*:views hashes)
    and updates the view_count column in the notebooks table.

    Failures for individual notebooks don't stop the entire sync.
    """
    redis = get_redis_client()
    db = SessionLocal()

    try:
        # Get all view keys from Redis
        view_keys = redis.keys("notebook:*:views")

        if not view_keys:
            logger.info("No view counts to sync")
            return {"synced": 0, "failed": 0}

        synced = 0
        failed = 0

        for key in view_keys:
            try:
                # Extract notebook ID from key (format: notebook:{id}:views)
                notebook_id = int(key.split(":")[1])

                # Get view count from Redis
                view_count = redis.hget(key, "count")

                if view_count is None:
                    continue

                view_count = int(view_count)

                # Update database
                notebook = (
                    db.query(Notebook)
                    .filter(Notebook.id == notebook_id)
                    .first()
                )

                if notebook:
                    notebook.view_count = view_count
                    db.commit()
                    synced += 1
                else:
                    # Notebook was deleted, clean up Redis key
                    redis.delete(key)
                    failed += 1

            except (ValueError, IndexError) as e:
                logger.warning(f"Invalid view key format: {key}, error: {e}")
                redis.delete(key)  # Clean up invalid key
                failed += 1
            except Exception as e:
                logger.warning(f"Failed to sync views for {key}: {e}")
                failed += 1

        logger.info(f"View sync complete: {synced} synced, {failed} failed")
        return {"synced": synced, "failed": failed}

    except Exception as e:
        logger.error(f"View sync task failed: {e}")
        return {"synced": 0, "failed": 0, "error": str(e)}
    finally:
        db.close()
