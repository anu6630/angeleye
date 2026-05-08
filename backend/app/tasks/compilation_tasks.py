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
from app.services.compilation_service import CompilationService
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class CompilationFailedError(Exception):
    """Notebook build failed in the executor (do not retry as transient)."""


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


@celery_app.task(base=DatabaseTask, bind=True, max_retries=2, name='compile_notebook_task')
def compile_notebook_task(
    self,
    notebook_id: int,
    dataset_id: Optional[int] = None,
    user_id: Optional[int] = None,
    dataset_ids: Optional[list] = None,
):
    """
    Async notebook compilation task.

    NOTE-04: User can compile notebooks in isolated online containers
    INFRA-06: Celery manages async notebook compilation tasks
    SEC-02: Container execution has timeout limits (enforced via Celery time limits)

    Args:
        notebook_id: ID of notebook to compile
        dataset_id: Legacy single asset ID to mount in container
        user_id: ID of the requesting user (for dataset ownership verification)
        dataset_ids: Optional list of asset IDs to mount (datasets/images)

    Returns:
        Dict with compilation result:
        - status: 'success' or 'failed'
        - notebook_id: ID of compiled notebook
        - output_url: CDN URL of compiled output (if success)
        - output_key: S3 key of output (if success)
        - error: Error message (if failed)

    Raises:
        self.retry: Retries on transient failures (max 2 retries)
    """
    try:
        logger.info(f"Starting compilation for notebook {notebook_id}")

        # Create compilation service (ContainerExecutor initialized in service __init__)
        service = CompilationService(self.db)

        # Merge legacy dataset_id with dataset_ids list
        merged_ids: list = []
        seen = set()
        if dataset_id is not None:
            merged_ids.append(dataset_id)
            seen.add(dataset_id)
        for did in (dataset_ids or []):
            if did not in seen:
                merged_ids.append(did)
                seen.add(did)

        result = service.compile_notebook(
            notebook_id=notebook_id,
            dataset_ids=merged_ids,
            user_id=user_id,
            output_dir="/tmp/notebooks"
        )

        logger.info(f"Compilation completed for notebook {notebook_id}: {result['status']}")

        # Check if compilation actually succeeded - if not, raise exception
        if result['status'] == 'failed':
            error_msg = result.get('error', 'Compilation failed')
            logger.error(f"Compilation task failed for notebook {notebook_id}: {error_msg}")
            raise CompilationFailedError(error_msg)

        return result

    except CompilationFailedError:
        raise
    except Exception as exc:
        logger.error(f"Compilation failed for notebook {notebook_id}: {str(exc)}")
        # Retry on transient failures
        raise self.retry(exc=exc, countdown=60)  # Retry after 60 seconds


def _format_task_failure_info(info) -> str:
    """Turn Celery AsyncResult.info into a single string for API clients."""
    if info is None:
        return 'Task failed with no error details'
    if isinstance(info, str):
        return info
    if isinstance(info, dict):
        return (
            info.get('exc_message')
            or info.get('message')
            or info.get('error')
            or str(info)
        )
    if isinstance(info, (list, tuple)) and len(info) >= 2:
        return f"{info[0]}: {info[1]}"
    return str(info)


@celery_app.task(name='get_compilation_status')
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
        response['error'] = _format_task_failure_info(result.info)
    elif result.state in ('RETRY', 'REVOKED'):
        # Surface last exception while retrying / revoked for debugging
        if result.info is not None:
            response['error'] = _format_task_failure_info(result.info)

    return response
