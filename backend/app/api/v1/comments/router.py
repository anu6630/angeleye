from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional

from app.db.session import get_db
from app.services.comment_service import CommentService
from app.schemas.comment import CommentCreate, CommentResponse
from app.api.v1.dependencies import require_auth

router = APIRouter()


class CreateCommentRequest(BaseModel):
    """Request schema for creating comments"""
    notebook_id: int
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[int] = None


@router.post("/comments", response_model=CommentResponse)
async def create_comment(
    request: Request,
    comment_data: CreateCommentRequest,
    db: Session = Depends(get_db)
):
    """Create a comment on a notebook (SOC-02)

    Requires authentication.
    Supports threaded replies via parent_id parameter.
    Enforces max depth of 3 levels.
    """
    user_id = await require_auth(request)

    comment_service = CommentService(db)

    try:
        comment = comment_service.create_comment(
            user_id=user_id,
            notebook_id=comment_data.notebook_id,
            content=comment_data.content,
            parent_id=comment_data.parent_id
        )
        return comment
    except ValueError as e:
        if "not found" in str(e):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e)
            )
        if "depth" in str(e).lower() or "maximum" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/comments/{notebook_id}", response_model=list[CommentResponse])
async def get_comment_thread(
    notebook_id: int,
    max_depth: int = 3,
    db: Session = Depends(get_db)
):
    """Get threaded comments for a notebook (SOC-03, SOC-06)

    Public endpoint - no authentication required.
    Returns root comments with nested replies using recursive CTE.
    Threaded structure allows for conversation-style discussions.
    """
    comment_service = CommentService(db)
    comments = comment_service.get_comment_thread(notebook_id, max_depth)

    return comments


@router.get("/comments/{notebook_id}/count")
async def get_comment_count(
    notebook_id: int,
    db: Session = Depends(get_db)
):
    """Get total comment count for a notebook

    Public endpoint - no authentication required.
    Returns total number of comments (including replies).
    """
    comment_service = CommentService(db)
    count = comment_service.get_comment_count(notebook_id)

    return {
        "notebook_id": notebook_id,
        "count": count
    }
