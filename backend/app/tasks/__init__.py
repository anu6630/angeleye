from app.tasks.celery_app import celery_app

# Import task modules to ensure they're registered
from app.tasks import compilation_tasks
from app.tasks import feed_tasks
from app.tasks import trending_tasks

__all__ = ['celery_app']
