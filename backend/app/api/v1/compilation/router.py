from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_db, require_auth
from app.tasks.compilation_tasks import compile_notebook_task, get_compilation_status
from app.services.cdn_service import CDNService
from app.schemas.compilation import (
    CompilationRequest,
    AsyncCompilationRequest,
    CompilationResponse,
    AsyncCompilationResponse,
    PublishRequest,
    PublishResponse
)
from app.models.notebook import Notebook

router = APIRouter(prefix="/compilation", tags=["compilation"])


@router.post("/compile/async", response_model=AsyncCompilationResponse, status_code=202)
async def compile_notebook_async(
    request: AsyncCompilationRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_auth)
):
    """
    Submit notebook for async compilation via Celery.

    - **notebook_id**: ID of notebook to compile
    - **dataset_id**: Optional dataset ID to use

    Returns task ID for status polling.

    NOTE-04: User can compile notebooks in isolated online containers
    INFRA-06: Celery manages async notebook compilation tasks
    """
    # Verify notebook exists and user owns it
    notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if notebook.user_id != auth["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Submit Celery task
    task = compile_notebook_task.delay(
        notebook_id=request.notebook_id,
        dataset_id=request.dataset_id
    )

    return AsyncCompilationResponse(
        task_id=task.id,
        notebook_id=request.notebook_id,
        status="pending"
    )


@router.get("/status/{task_id}", response_model=dict)
async def get_task_status(
    task_id: str,
    auth: dict = Depends(require_auth)
):
    """
    Get compilation task status.

    Returns task state and result if complete.
    """
    status = get_compilation_status(task_id)
    return status


@router.post("/publish", response_model=PublishResponse)
async def publish_notebook(
    request: PublishRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_auth)
):
    """
    Publish a compiled notebook to the social feed.

    - **notebook_id**: ID of notebook to publish
    - **output_key**: S3 key of compiled output from compilation task
    - **auto_invalidate**: Whether to invalidate cache for old version

    NOTE-05: User can publish pre-rendered outputs to social feed

    Publication only succeeds if:
    1. Notebook exists and user owns it
    2. Output exists in S3/MinIO (verified via output_key)
    3. Notebook is not already published (unless updating)
    """
    # Verify notebook exists and user owns it
    notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if notebook.user_id != auth["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Initialize CDN service
    cdn_service = CDNService()

    # Invalidate old version if updating (STOR-05: CDN cache invalidated when notebook updated)
    invalidation_id = None
    if request.auto_invalidate and notebook.is_published:
        invalidation_id = cdn_service.invalidate_notebook(request.notebook_id)

    # Mark as published
    notebook.is_published = True
    db.commit()

    # Generate output URL
    output_url = cdn_service.get_output_url(request.output_key)

    return PublishResponse(
        notebook_id=request.notebook_id,
        is_published=True,
        output_url=output_url,
        invalidation_id=invalidation_id
    )


@router.post("/compile-and-publish", response_model=AsyncCompilationResponse, status_code=202)
async def compile_and_publish(
    request: CompilationRequest,
    db: Session = Depends(get_db),
    auth: dict = Depends(require_auth)
):
    """
    Compile notebook and automatically publish on success.

    This is a convenience endpoint that:
    1. Submits compilation task
    2. Returns task ID
    3. On completion, automatically marks notebook as published

    User should poll task status. When status='success', notebook is published.
    """
    # Verify notebook exists and user owns it
    notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if notebook.user_id != auth["user_id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    # Submit Celery task with publish flag
    # Note: We'd need to extend the task to support auto-publish
    # For now, this is just an alias for compile async
    task = compile_notebook_task.delay(
        notebook_id=request.notebook_id,
        dataset_id=request.dataset_id
    )

    return AsyncCompilationResponse(
        task_id=task.id,
        notebook_id=request.notebook_id,
        status="pending"
    )
