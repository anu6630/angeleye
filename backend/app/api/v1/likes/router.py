from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.db.session import get_db
from app.services.like_service import LikeService
from app.services.trending_service import TrendingService
from app.schemas.like import LikeResponse
from app.api.v1.dependencies import require_auth

router = APIRouter()


class ToggleLikeRequest(BaseModel):
    """Request schema for toggle like endpoint"""
    notebook_id: int


@router.post("/likes/toggle", response_model=LikeResponse)
async def toggle_like(
    request: Request,
    like_data: ToggleLikeRequest,
    db: Session = Depends(get_db)
):
    """Toggle like/unlike for a notebook (SOC-01)

    Requires authentication.
    Creates like if doesn't exist, deletes if exists.
    """
    user_id = await require_auth(request)

    # Initialize services
    trending_service = TrendingService(db)
    like_service = LikeService(db, trending_service=trending_service)

    try:
        like = like_service.toggle_like(user_id, like_data.notebook_id)
        return like
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Notebook not found"
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/likes/notebook/{notebook_id}")
async def get_notebook_likes(
    notebook_id: int,
    db: Session = Depends(get_db)
):
    """Get all likes for a notebook

    Public endpoint - no authentication required.
    Returns list of likes ordered by created_at DESC.
    """
    like_service = LikeService(db)
    likes = like_service.get_notebook_likes(notebook_id)

    return {
        "likes": likes,
        "total": len(likes)
    }


@router.get("/likes/my")
async def get_my_liked_notebooks(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get list of notebook IDs liked by current user

    Requires authentication.
    Returns list of notebook IDs for quick client-side filtering.
    """
    user_id = await require_auth(request)

    like_service = LikeService(db)
    notebook_ids = like_service.get_user_liked_notebooks(user_id)

    return {
        "liked_notebook_ids": notebook_ids
    }
