"""
Celery tasks for async notebook compilation.

INFRA-06: Celery manages async notebook compilation tasks
NOTE-04: User can compile notebooks in isolated online containers
SEC-02: Container execution has timeout limits (enforced via Celery time limits)
"""
from celery import Task
from app.tasks.celery_app import celery_app
from app.db.session import SessionLocal
from app.models.notebook import Notebook
from app.models.notebook_cell import NotebookCell
from typing import Optional
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


def get_notebook_with_cells(notebook_id: int, db) -> Optional[dict]:
    """
    Get notebook with all cells for compilation.

    Args:
        notebook_id: Notebook ID
        db: Database session

    Returns:
        Dict with notebook data and cells, or None if not found
    """
    notebook = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not notebook:
        return None

    cells = db.query(NotebookCell)\
        .filter(NotebookCell.notebook_id == notebook_id)\
        .order_by(NotebookCell.order_index)\
        .all()

    return {
        'id': notebook.id,
        'title': notebook.title,
        'user_id': notebook.user_id,
        'cells': [
            {
                'cell_type': cell.cell_type,
                'content': cell.content,
                'order_index': cell.order_index
            }
            for cell in cells
        ]
    }


@celery_app.task(base=DatabaseTask, bind=True, max_retries=2, name='app.tasks.compilation_tasks.compile_notebook_task')
def compile_notebook_task(self, notebook_id: int, dataset_id: Optional[int] = None):
    """
    Async notebook compilation task.

    NOTE-04: User can compile notebooks in isolated online containers
    INFRA-06: Celery manages async notebook compilation tasks
    SEC-02: Container execution has timeout limits (enforced via Celery time limits)

    This task:
    1. Retrieves notebook from database
    2. Writes notebook to temporary .ipynb file
    3. Executes in Docker container (Plan 03-03B: ContainerExecutor)
    4. Uploads output to S3/MinIO (Plan 03-04A: CDNService)
    5. Updates notebook with compilation status

    Args:
        notebook_id: ID of notebook to compile
        dataset_id: Optional dataset ID to mount in container

    Returns:
        Dict with compilation result:
        - status: 'success' or 'failed'
        - notebook_id: ID of compiled notebook
        - output_url: CDN URL of compiled output (if success)
        - error: Error message (if failed)

    Raises:
        self.retry: Retries on transient failures (max 2 retries)
    """
    try:
        logger.info(f"Starting compilation for notebook {notebook_id}")

        # Get notebook data
        notebook_data = get_notebook_with_cells(notebook_id, self.db)
        if not notebook_data:
            logger.error(f"Notebook {notebook_id} not found")
            return {
                'status': 'failed',
                'notebook_id': notebook_id,
                'error': 'Notebook not found'
            }

        # STUB: Container execution will be implemented in Plan 03-03B
        # For now, this is a placeholder that simulates compilation
        logger.info(f"Compiling notebook '{notebook_data['title']}' with {len(notebook_data['cells'])} cells")

        # TODO (Plan 03-03B):
        # 1. Write .ipynb file to temp directory
        # 2. Download dataset from S3 (if dataset_id provided)
        # 3. Execute in Docker container via ContainerExecutor
        # 4. Capture output HTML
        # 5. Upload to S3/MinIO
        # 6. Return CDN URL

        # Placeholder: Simulate successful compilation
        result = {
            'status': 'success',
            'notebook_id': notebook_id,
            'output_url': f'/api/v1/notebooks/{notebook_id}/output',  # Placeholder
            'message': 'Compilation completed (stub - container execution in Plan 03-03B)'
        }

        logger.info(f"Compilation completed for notebook {notebook_id}")
        return result

    except Exception as exc:
        logger.error(f"Compilation failed for notebook {notebook_id}: {str(exc)}")
        # Retry on transient failures
        raise self.retry(exc=exc, countdown=60)  # Retry after 60 seconds


@celery_app.task(name='app.tasks.compilation_tasks.get_compilation_status')
def get_compilation_status(task_id: str) -> dict:
    """
    Get the status of a compilation task.

    Args:
        task_id: Celery task ID

    Returns:
        Dict with task status:
        - state: 'PENDING', 'STARTED', 'SUCCESS', 'FAILURE', 'RETRY'
        - result: Task result (if complete)
        - error: Error message (if failed)
    """
    from celery.result import AsyncResult

    result = AsyncResult(task_id, app=celery_app)

    response = {
        'task_id': task_id,
        'state': result.state,
    }

    if result.successful():
        response['result'] = result.result
    elif result.failed():
        response['error'] = str(result.info)

    return response
