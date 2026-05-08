---
phase: 03-execution-publishing
plan: 02A
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/requirements.txt
  - backend/app/tasks/celery_app.py
  - backend/app/tasks/__init__.py
  - docker-compose.yml
autonomous: true
requirements:
  - INFRA-06
  - SEC-02

must_haves:
  truths:
    - "Celery is installed and configured"
    - "Celery app configured with Redis broker/backend"
    - "Task time limits: 600s hard, 300s soft (SEC-02)"
    - "worker_prefetch_multiplier=1 for long-running tasks"
    - "Celery worker service defined in docker-compose.yml"
  artifacts:
    - path: "backend/requirements.txt"
      provides: "Celery dependency"
      contains: "celery==5.6.3"
      min_lines: 1
    - path: "backend/app/tasks/celery_app.py"
      provides: "Celery application configuration"
      exports: ["celery_app"]
      min_lines: 40
    - path: "docker-compose.yml"
      provides: "Celery worker service"
      contains: "celery_worker:"
      min_lines: 20
  key_links:
    - from: "backend/app/tasks/celery_app.py"
      to: "Redis"
      via: "broker_url configuration"
      pattern: "broker_url.*redis"
    - from: "docker-compose.yml"
      to: "Celery worker"
      via: "celery_worker service definition"
      pattern: "celery -A app\\.tasks\\.celery_app"

---

# Phase 03-02A: Celery Installation and Configuration

<objective>
Install Celery and configure it with Redis broker for async notebook compilation. Set up worker configuration with proper time limits and concurrency settings.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/03-execution-publishing/03-RESEARCH.md
@backend/requirements.txt (existing dependencies)
@backend/app/core/config.py (for REDIS_URL)
@docker-compose.yml (existing services)

## Celery Configuration from RESEARCH.md

```python
celery_app.conf.update(
    task_time_limit=600,        # Hard limit: 10 minutes (SEC-02)
    task_soft_time_limit=300,   # Soft limit: 5 minutes
    worker_prefetch_multiplier=1,  # Don't prefetch long tasks
)
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Celery and create Celery application configuration</name>
  <files>
    backend/requirements.txt
    backend/app/tasks/__init__.py
    backend/app/tasks/celery_app.py
  </files>
  <read_first>
    - backend/requirements.txt
    - backend/app/core/config.py (for REDIS_URL)
  </read_first>
  <action>
    Add Celery to backend/requirements.txt (append to end):
    ```text
    # Phase 3: Task Queue (INFRA-06: Celery manages async compilation)
    celery==5.6.3
    ```

    Verify redis is already in requirements.txt (should be from Phase 1).

    Create backend/app/tasks/__init__.py:
    ```python
    from app.tasks.celery_app import celery_app

    __all__ = ['celery_app']
    ```

    Create backend/app/tasks/celery_app.py:
    ```python
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
    celery_app.conf.beat_schedule = {
        # Example: 'recalculate-feed': {
        #     'task': 'app.tasks.feed_tasks.recalculate_feed',
        #     'schedule': crontab(minute='*'),  # Every minute
        # },
    }
    ```
  </action>
  <verify>
    <automated>grep -q "celery==5.6.3" backend/requirements.txt && python -c "from app.tasks.celery_app import celery_app; print('Celery app configured:', celery_app.broker)" && echo "Celery configured"</automated>
  </verify>
  <done>
    - celery==5.6.3 added to requirements.txt
    - Verified redis dependency exists
    - Celery app created with Redis broker/backend
    - Task time limits: 600s hard, 300s soft (SEC-02)
    - worker_prefetch_multiplier=1 for long-running tasks
    - task_acks_late=True for reliability
    - Task routing configured for compilation queue
    - Auto-discovery enabled for app.tasks package
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Celery worker to docker-compose and create startup script</name>
  <files>
    docker-compose.yml
    backend/start_worker.sh
  </files>
  <read_first>
    - docker-compose.yml (for existing services)
    - backend/app/tasks/celery_app.py (for worker configuration)
  </read_first>
  <action>
    Add Celery worker service to docker-compose.yml (after backend service):
    ```yaml
  celery_worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: notebooksocial-celery-worker
    environment:
      - DATABASE_URL=postgresql://notebooksocial:notebooksocial_password@postgres:5432/notebooksocial
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY:-dev-secret-key-change-in-production}
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /var/run/docker.sock:/var/run/docker.sock  # For container execution (Plan 03-03A)
      - notebook_temp:/tmp/notebooks  # Shared temp volume for notebook files
    command: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2 -Q compilation
    healthcheck:
      test: ["CMD-SHELL", "celery -A app.tasks.celery_app inspect ping || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
    ```

    Update docker-compose.yml volumes section to include notebook_temp:
    ```yaml
    volumes:
      postgres_data:
      redis_data:
      minio_data:
      notebook_temp:
    ```

    Create backend/start_worker.sh for standalone worker execution (useful for development):
    ```bash
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
    ```

    Make the script executable:
    ```bash
    chmod +x backend/start_worker.sh
    ```
  </action>
  <verify>
    <automated>grep -q "celery_worker:" docker-compose.yml && grep -q "celery -A app.tasks.celery_app" docker-compose.yml && [ -x backend/start_worker.sh ] && echo "Celery worker configured"</automated>
  </verify>
  <done>
    - Celery worker service added to docker-compose.yml
    - Worker depends on postgres, redis, and minio health checks
    - Docker socket mounted for container execution (Plan 03-03A)
    - Shared notebook_temp volume for temporary notebook files
    - Worker command: concurrency=2, compilation queue only
    - Healthcheck configured using celery inspect ping (not "celelry" - typo fixed)
    - Standalone start_worker.sh script created and made executable
  </done>
</task>

</tasks>

<verification>
- celery==5.6.3 in requirements.txt
- Celery app configured with Redis broker/backend
- Task time limits: 600s hard, 300s soft (SEC-02)
- worker_prefetch_multiplier=1
- Celery worker service in docker-compose.yml
- start_worker.sh script created and executable
- Healthcheck uses "celery" not "celelry" (typo fixed from original plan)
</verification>

<success_criteria>
- Celery app initializes without errors
- Worker starts and connects to Redis
- Worker logs show "celery@XXX ready"
- Healthcheck passes with celery inspect ping
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-02A-SUMMARY.md`
</output>
