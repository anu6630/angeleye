"""
Celery application configuration for async notebook compilation.

INFRA-06: Celery manages async notebook compilation tasks
SEC-02: Container execution has timeout limits
"""
from celery import Celery
from app.core.config import settings

# Create Celery app with Redis broker
celery_app = Celery(
    'notebooksocial',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL  # Use same Redis for results
)

# Configure Celery for notebook compilation workload
celery_app.conf.update(
    # Task serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',

    # Timezone
    timezone='UTC',
    enable_utc=True,

    # Task tracking
    task_track_started=True,
    task_acks_late=True,  # Ack only after task completes (prevents lost tasks on worker crash)

    # Time limits (SEC-02: Container execution has timeout limits)
    task_time_limit=600,        # 10 minutes hard limit (worker kills task)
    task_soft_time_limit=300,   # 5 minutes soft limit (raises SoftTimeLimitExceeded)

    # Worker behavior (INFRA-06: Celery manages async compilation tasks)
    worker_prefetch_multiplier=1,  # Don't prefetch long tasks (one at a time)
    worker_max_tasks_per_child=10,  # Restart worker after 10 tasks (memory cleanup)

    # Result backend
    result_expires=3600,            # Results expire after 1 hour
    result_extended=True,           # Store more task metadata

    # Task routing (future: separate queues for different task types)
    task_routes={
        'app.tasks.compilation_tasks.compile_notebook_task': {'queue': 'compilation'},
    },

    # Task execution
    task_always_eager=False,  # Don't run tasks synchronously (must be False for production)
)

# Auto-discover tasks in tasks package
celery_app.autodiscover_tasks(['app.tasks'])

# Optional: Configure Celery Beat for periodic tasks (future: feed recalculation)
from celery.schedules import crontab

celery_app.conf.beat_schedule = {
    # Sync view counts from Redis to database every 5 minutes
    # Per CONTEXT.md D-31: Batch sync views to database every 5 minutes
    'sync-views-to-database': {
        'task': 'app.tasks.feed_tasks.sync_views_to_database',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
}
