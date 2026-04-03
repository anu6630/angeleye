from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.services.notebook_service import NotebookService
from app.services.feed_service import FeedService
from app.schemas.notebook import NotebookCreate, NotebookUpdate, NotebookResponse
from app.api.v1.dependencies import require_auth

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


@router.get("/notebooks/{notebook_id}", response_model=NotebookResponse)
async def get_notebook(
    notebook_id: int,
    db: Session = Depends(get_db)
):
    """Get notebook by ID (NOTE-02, VIEW-01)

    Public endpoint - no authentication required for viewing.
    Returns notebook with all cells.
    """
    notebook_service = NotebookService(db)
    notebook = notebook_service.get_notebook(notebook_id)

    if not notebook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notebook not found"
        )

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
