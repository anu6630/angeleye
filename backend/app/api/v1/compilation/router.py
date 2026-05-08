from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_db, require_auth
from app.tasks.celery_app import celery_app
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
from app.models.dataset import Dataset
from app.services.trending_service import TrendingService
from app.services.feed_service import FeedService

router = APIRouter(prefix="/compilation", tags=["compilation"])


def _resolve_asset_ids(request) -> list[int]:
    """Merge legacy dataset_id with dataset_ids list, dedup, preserve order."""
    merged: list[int] = []
    seen: set[int] = set()
    if getattr(request, "dataset_id", None) is not None:
        merged.append(request.dataset_id)
        seen.add(request.dataset_id)
    for did in (getattr(request, "dataset_ids", None) or []):
        if did not in seen:
            merged.append(did)
            seen.add(did)
    return merged


def _verify_assets_ownership(db: Session, asset_ids: list[int], user_id: int) -> None:
    """Verify the requesting user owns every asset in the list (SEC-03)."""
    for did in asset_ids:
        dataset = db.query(Dataset).filter(Dataset.id == did).first()
        if not dataset:
            raise HTTPException(status_code=404, detail=f"Asset {did} not found")
        if dataset.user_id != user_id:
            raise HTTPException(status_code=403, detail=f"Asset {did} access denied")


@router.post("/compile/async", response_model=AsyncCompilationResponse, status_code=202)
async def compile_notebook_async(
    request: AsyncCompilationRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(require_auth)
):
    """Submit notebook for async compilation via Celery."""
    notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if notebook.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    asset_ids = _resolve_asset_ids(request)
    _verify_assets_ownership(db, asset_ids, user_id)

    task = compile_notebook_task.delay(
        notebook_id=request.notebook_id,
        dataset_id=asset_ids[0] if asset_ids else None,
        user_id=user_id,
        dataset_ids=asset_ids,
    )

    return AsyncCompilationResponse(
        task_id=task.id,
        notebook_id=request.notebook_id,
        status="pending"
    )


@router.get("/status/{task_id}", response_model=dict)
async def get_task_status(
    task_id: str,
    user_id: int = Depends(require_auth)
):
    """Get compilation task status."""
    status = get_compilation_status(task_id)
    return status


@router.post("/publish", response_model=PublishResponse)
async def publish_notebook(
    request: PublishRequest,
    db: Session = Depends(get_db),
    user_id: int = Depends(require_auth)
):
    """Publish a compiled notebook to the social feed."""
    notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if notebook.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    cdn_service = CDNService()
    invalidation_id = None
    if request.auto_invalidate and notebook.is_published:
        invalidation_id = cdn_service.invalidate_notebook(request.notebook_id)

    notebook.is_published = True
    notebook.output_s3_key = request.output_key
    output_url = cdn_service.get_output_url(request.output_key)
    notebook.output_url = output_url
    # Persist dataset association so we know which data was used for this build
    if request.dataset_id is not None:
        notebook.dataset_id = request.dataset_id
    db.commit()

    # Update discovery mechanism (DISC-01, DISC-02)
    # 1. Update trending score in Redis immediately
    trending_service = TrendingService(db)
    try:
        trending_service.update_notebook_score(notebook.id)
    except Exception:
        pass  # Score update failure shouldn't break publishing

    # 2. Invalidate feed caches for followers
    feed_service = FeedService(db)
    try:
        feed_service.invalidate_user_feed(notebook.user_id)
    except Exception:
        pass

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
    user_id: int = Depends(require_auth)
):
    """Compile notebook and automatically publish on success."""
    notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")

    if notebook.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied")

    asset_ids = _resolve_asset_ids(request)
    _verify_assets_ownership(db, asset_ids, user_id)

    task = compile_notebook_task.delay(
        notebook_id=request.notebook_id,
        dataset_id=asset_ids[0] if asset_ids else None,
        user_id=user_id,
        dataset_ids=asset_ids,
    )

    return AsyncCompilationResponse(
        task_id=task.id,
        notebook_id=request.notebook_id,
        status="pending"
    )
