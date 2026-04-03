#!/bin/bash
# Start Celery worker for notebook compilation

echo "Starting Celery worker for NotebookSocial..."

# Load environment variables from .env if exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Start worker with compilation queue
celery -A app.tasks.celery_app worker \
    --loglevel=info \
    --concurrency=2 \
    -Q compilation \
    --pidfile=/tmp/celery-worker.pid \
    --logfile=/tmp/celery-worker.log
