from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, status, Request, Query, UploadFile
from fastapi.responses import StreamingResponse
from redis.exceptions import RedisError
from sqlalchemy.orm import Session
from typing import Optional

from app.api.v1.dependencies import optional_auth, rate_limit_general, require_auth
from app.db.session import get_db
from app.services.notebook_service import NotebookService
from app.services.feed_service import FeedService
from app.services.fork_service import ForkService
from app.services.storage_service import StorageService
from app.services.banner_service import BannerService, build_banner_urls
from app.schemas.notebook import (
    NotebookCreate,
    NotebookPresenceHeartbeatBody,
    NotebookPresenceResponse,
    NotebookUpdate,
    NotebookResponse,
)
from app.services.notebook_presence_service import NotebookPresenceService
from app.core.config import settings

router = APIRouter()


@router.post("/notebooks", response_model=NotebookResponse)
async def create_notebook(
    request: Request,
    notebook_data: NotebookCreate,
    db: Session = Depends(get_db)
):
    """Create a new notebook (NOTE-01)

    Requires authentication. Creates notebook with initial empty code cell.
    """
    user_id = await require_auth(request)

    notebook_service = NotebookService(db)
    notebook = notebook_service.create_notebook(user_id, notebook_data)

    return notebook


@router.put("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def update_notebook(
    request: Request,
    notebook_id: int,
    notebook_data: NotebookUpdate,
    db: Session = Depends(get_db)
):
    """Update notebook (NOTE-06)

    Requires authentication. User can only update their own notebooks.
    Updates title and/or is_published status.
    """
    user_id = await require_auth(request)

    notebook_service = NotebookService(db)

    try:
        notebook = notebook_service.update_notebook(
            notebook_id,
            user_id,
            notebook_data
        )
    except ValueError as e:
        if "does not own" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this notebook"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )

    return notebook


@router.delete("/notebooks/{notebook_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook(
    request: Request,
    notebook_id: int,
    db: Session = Depends(get_db)
):
    """Delete notebook (NOTE-07)

    Requires authentication. User can only delete their own notebooks.
    Cascade deletes cells, likes, and comments.
    Prevents deletion if notebook has been forked.
    """
    user_id = await require_auth(request)

    notebook_service = NotebookService(db)

    try:
        success = notebook_service.delete_notebook(notebook_id, user_id)
    except ValueError as e:
        if "does not own" in str(e):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this notebook"
            )
        if "forks" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete notebook with existing forks"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )

    return None


@router.get("/notebooks")
async def get_user_notebooks(
    request: Request,
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get current user's notebooks (drafts and published)

    Requires authentication. Returns user's notebooks ordered by updated_at DESC.
    """
    user_id = await require_auth(request)

    notebook_service = NotebookService(db)
    notebooks = notebook_service.get_user_notebooks(user_id, skip, limit)

    return {
        "notebooks": notebooks,
        "total": len(notebooks),
        "skip": skip,
        "limit": limit
    }


@router.put("/notebooks/{notebook_id}/cells", status_code=200)
async def update_notebook_cells(
    request: Request,
    notebook_id: int,
    cells_data: list[dict],
    db: Session = Depends(get_db)
):
    """Replace all cells for a notebook (NOTE-05 - save cell content).

    Accepts a list of: {cell_type, content, order_index}
    Deletes existing cells and inserts the new set atomically.
    Requires authentication; user must own the notebook.
    """
    from app.models.notebook import Notebook
    from app.models.notebook_cell import NotebookCell as NotebookCellModel

    user_id = await require_auth(request)
    notebook = db.query(Notebook).filter(Notebook.id == notebook_id).first()
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if notebook.user_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this notebook")

    # Delete existing cells
    db.query(NotebookCellModel).filter(NotebookCellModel.notebook_id == notebook_id).delete()

    # Insert new cells
    for i, cell in enumerate(cells_data):
        db.add(NotebookCellModel(
            notebook_id=notebook_id,
            cell_type=cell.get("cell_type", "code"),
            content=cell.get("content", ""),
            order_index=cell.get("order_index", i),
        ))

    db.commit()
    return {"notebook_id": notebook_id, "cells_saved": len(cells_data)}


@router.get("/notebooks/{notebook_id}/output")
async def get_notebook_output(
    notebook_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Proxy pre-rendered notebook HTML from storage (VIEW-03).

    Streams the compiled HTML output so the browser doesn't need to
    access MinIO directly (avoids internal hostname / presigned URL issues).
    """
    user_id = await optional_auth(request)
    notebook_service = NotebookService(db)
    notebook = notebook_service.get_notebook_model(notebook_id)
    if not notebook:
        raise HTTPException(status_code=404, detail="Notebook not found")
    if not notebook_service.can_view_notebook(notebook, user_id):
        raise HTTPException(status_code=404, detail="Notebook not found")
    if not notebook.output_s3_key:
        raise HTTPException(status_code=404, detail="No compiled output available")

    storage = StorageService()
    try:
        obj = storage.s3_client.get_object(
            Bucket=settings.NOTEBOOKS_BUCKET,
            Key=notebook.output_s3_key,
        )
        body = obj['Body']
        return StreamingResponse(
            body,
            media_type="text/html",
            headers={"Cache-Control": "public, max-age=3600"},
        )
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Output not found: {str(e)}")


@router.get("/users/{username}/public")
async def get_user_public_notebooks(
    username: str,
    cursor: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user_id: Optional[int] = Depends(optional_auth)
):
    """Get a user's public non-group notebooks."""
    from app.models.user import User
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    feed_service = FeedService(db)
    return feed_service.list_user_public_notebooks(
        target_user_id=user.id,
        viewer_id=current_user_id,
        limit=limit,
        cursor=cursor
    )


@router.get("/notebooks/feed")
async def get_feed(
    cursor: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get published notebooks feed (VIEW-04)

    Public endpoint - no authentication required.
    Uses cursor-based pagination for infinite scroll.
    Returns notebooks ordered by created_at DESC (newest first).

    Query params:
    - cursor: ISO format timestamp for pagination
    - limit: Number of items to return (max 50)
    """
    feed_service = FeedService(db)
    feed = feed_service.get_feed(cursor, limit)

    return feed


@router.post("/notebooks/{notebook_id}/banner")
async def upload_notebook_banner(
    request: Request,
    notebook_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """Upload (or replace) the photo banner for a notebook (owner-only).

    Accepts PNG, JPEG, or WEBP up to 10 MB. Stores a full-resolution image
    (long-side capped at 2400 px) and a 16:9 cover thumbnail (800x450).
    """
    user_id = await require_auth(request)
    banner_service = BannerService(db)
    notebook, full_url, thumb_url = banner_service.upload_notebook_banner(notebook_id, user_id, file)
    return {
        "banner_url": full_url,
        "banner_thumbnail_url": thumb_url,
        "banner_uploaded_at": notebook.banner_uploaded_at.isoformat() if notebook.banner_uploaded_at else None,
    }


@router.delete("/notebooks/{notebook_id}/banner", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notebook_banner(
    request: Request,
    notebook_id: int,
    db: Session = Depends(get_db),
):
    """Remove the banner from a notebook (owner-only)."""
    user_id = await require_auth(request)
    banner_service = BannerService(db)
    banner_service.delete_notebook_banner(notebook_id, user_id)
    return None


@router.get("/notebooks/{notebook_id}/banner")
async def get_notebook_banner(
    notebook_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Stream the full-resolution banner image (public)."""
    user_id = await optional_auth(request)
    notebook_service = NotebookService(db)
    nb = notebook_service.get_notebook_model(notebook_id)
    if not nb or not notebook_service.can_view_notebook(nb, user_id):
        raise HTTPException(status_code=404, detail="Notebook not found")
    banner_service = BannerService(db)
    body, content_type = banner_service.stream_banner(notebook_id, "full")
    return StreamingResponse(
        body,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.get("/notebooks/{notebook_id}/banner/thumb")
async def get_notebook_banner_thumbnail(
    notebook_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    """Stream the 16:9 banner thumbnail (public)."""
    user_id = await optional_auth(request)
    notebook_service = NotebookService(db)
    nb = notebook_service.get_notebook_model(notebook_id)
    if not nb or not notebook_service.can_view_notebook(nb, user_id):
        raise HTTPException(status_code=404, detail="Notebook not found")
    banner_service = BannerService(db)
    body, content_type = banner_service.stream_banner(notebook_id, "thumb")
    return StreamingResponse(
        body,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.get("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(
    notebook_id: int,
    request: Request,
    db: Session = Depends(get_db)
):
    """Get notebook by ID (NOTE-02, VIEW-01)

    Public endpoint - no authentication required for viewing.
    Returns notebook with all cells.

    Per CONTEXT.md D-31: View tracking on notebook view
    Per CONTEXT.md D-30: Engagement metrics included in response
    """
    # Get optional user ID for view tracking
    user_id = await optional_auth(request)

    notebook_service = NotebookService(db)
    nb_model = notebook_service.get_notebook_model(notebook_id)
    if not nb_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    if not notebook_service.can_view_notebook(nb_model, user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    notebook = notebook_service.get_notebook(notebook_id)
    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )

    # Record view (async, don't fail)
    feed_service = FeedService(db)
    try:
        feed_service.record_view(notebook_id, user_id)
    except Exception:
        pass  # View tracking failure shouldn't break the request

    # Get engagement metrics
    try:
        metrics = feed_service.get_engagement_metrics([notebook_id])
        if notebook_id in metrics:
            # Enhance response with metrics
            if hasattr(notebook, 'like_count'):
                notebook.like_count = metrics[notebook_id]["likes"]
            if hasattr(notebook, 'comment_count'):
                notebook.comment_count = metrics[notebook_id]["comments"]
            # Add view_count if not present
            if not hasattr(notebook, 'view_count'):
                notebook.view_count = metrics[notebook_id]["views"]
    except Exception:
        pass  # Metrics failure shouldn't break the request

    return notebook


@router.get(
    "/notebooks/{notebook_id}/presence",
    response_model=NotebookPresenceResponse,
)
async def get_notebook_presence(
    notebook_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    viewer_id = await optional_auth(request)
    notebook_service = NotebookService(db)
    nb_model = notebook_service.get_notebook_model(notebook_id)
    if not nb_model or not notebook_service.can_view_notebook(nb_model, viewer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    presence = NotebookPresenceService()
    try:
        n = presence.online_viewer_count(notebook_id)
    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Presence temporarily unavailable",
        )
    return NotebookPresenceResponse(online_viewer_count=n)


@router.post(
    "/notebooks/{notebook_id}/presence/heartbeat",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_general(60))],
)
async def post_notebook_presence_heartbeat(
    request: Request,
    notebook_id: int,
    body: NotebookPresenceHeartbeatBody,
    db: Session = Depends(get_db),
):
    viewer_id = await optional_auth(request)
    notebook_service = NotebookService(db)
    nb_model = notebook_service.get_notebook_model(notebook_id)
    if not nb_model or not notebook_service.can_view_notebook(nb_model, viewer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    if viewer_id is not None:
        member_key = f"u:{viewer_id}"
    else:
        if body.anonymous_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="anonymous_id is required when not authenticated",
            )
        member_key = f"a:{body.anonymous_id}"

    presence = NotebookPresenceService()
    try:
        presence.touch(notebook_id, member_key)
    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Presence temporarily unavailable",
        )
    return None


@router.delete(
    "/notebooks/{notebook_id}/presence",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_general(60))],
)
async def delete_notebook_presence(
    request: Request,
    notebook_id: int,
    anonymous_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    viewer_id = await optional_auth(request)
    notebook_service = NotebookService(db)
    nb_model = notebook_service.get_notebook_model(notebook_id)
    if not nb_model or not notebook_service.can_view_notebook(nb_model, viewer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    if viewer_id is not None:
        member_key = f"u:{viewer_id}"
    else:
        if not anonymous_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="anonymous_id is required when not authenticated",
            )
        try:
            parsed = UUID(anonymous_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid anonymous_id",
            )
        member_key = f"a:{parsed}"

    presence = NotebookPresenceService()
    try:
        presence.leave(notebook_id, member_key)
    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Presence temporarily unavailable",
        )
    return None


@router.post("/notebooks/{notebook_id}/fork", response_model=NotebookResponse, status_code=status.HTTP_201_CREATED)
async def fork_notebook(
    request: Request,
    notebook_id: int,
    db: Session = Depends(get_db)
):
    """Fork a notebook (FORK-01)

    Requires authentication. Creates an independent copy of the notebook with:
    - All cells copied
    - parent_id set to original notebook
    - root_id set to original's root_id (or own id if original is root)
    - Dataset forked via S3 server-side copy if present
    - Fork starts as draft (is_published=False)

    Per FORK-03: Forks have equal weightage in feed (no depth penalty)
    Per AUTH-04: Authentication required for interactive actions
    """
    user_id = await require_auth(request)

    # Verify original notebook exists and is visible to forker
    notebook_service = NotebookService(db)
    nb_model = notebook_service.get_notebook_model(notebook_id)
    if not nb_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    if not notebook_service.can_view_notebook(nb_model, user_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    # Create fork
    storage_service = StorageService()
    fork_service = ForkService(db, storage_service)

    try:
        forked_notebook = fork_service.fork_notebook(notebook_id, user_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fork notebook: {str(e)}"
        )

    # Convert to response format
    return notebook_service._to_response(forked_notebook)


@router.get("/notebooks/{notebook_id}/forks")
async def get_notebook_forks(
    request: Request,
    notebook_id: int,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get all forks of a notebook (FORK-05)

    Public endpoint - no authentication required per AUTH-04.
    Returns list of notebooks that have forked this notebook.

    Query params:
    - notebook_id: ID of notebook to get forks for
    - limit: Maximum number of forks to return (default 50, max 100)

    Returns forks ordered by created_at DESC (newest first)
    """
    viewer_id = await optional_auth(request)
    notebook_service = NotebookService(db)
    nb_model = notebook_service.get_notebook_model(notebook_id)
    if not nb_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    if not notebook_service.can_view_notebook(nb_model, viewer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    fork_service = ForkService(db, StorageService())
    forks = fork_service.get_forks(notebook_id, limit)

    # Convert to response format
    return {
        "forks": [notebook_service._to_response(fork) for fork in forks],
        "total": len(forks)
    }


@router.get("/notebooks/{notebook_id}/chain")
async def get_fork_chain(
    request: Request,
    notebook_id: int,
    db: Session = Depends(get_db)
):
    """Get fork chain from original to current notebook (FORK-05)

    Public endpoint - no authentication required per AUTH-04.
    Returns the full attribution chain showing how this notebook evolved.

    The chain is ordered from the original (root) to the current notebook,
    showing each fork step in the lineage.

    Returns:
        List of notebooks from original to current
    """
    viewer_id = await optional_auth(request)
    notebook_service = NotebookService(db)
    nb_model = notebook_service.get_notebook_model(notebook_id)
    if not nb_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )
    if not notebook_service.can_view_notebook(nb_model, viewer_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found",
        )

    fork_service = ForkService(db, StorageService())
    chain = fork_service.get_fork_chain(notebook_id)

    # Convert to response format
    return {
        "chain": [notebook_service._to_response(nb) for nb in chain],
        "total": len(chain)
    }
