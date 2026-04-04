from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Dict

from app.db.session import get_db
from app.api.v1.dependencies import require_auth
from app.services.follow_service import FollowService


router = APIRouter()


class FollowCreate(BaseModel):
    """Request body for follow creation"""
    following_id: int


class FollowResponse(BaseModel):
    """Response for successful follow"""
    message: str
    following_id: int


class UnfollowResponse(BaseModel):
    """Response for successful unfollow"""
    message: str


class FollowersCountResponse(BaseModel):
    """Response for followers count (CONTEXT.md D-10: count only, not full list)"""
    followers_count: int


class FollowingCountResponse(BaseModel):
    """Response for following count (CONTEXT.md D-10: count only, not full list)"""
    following_count: int


class FollowCheckResponse(BaseModel):
    """Response for follow status check"""
    is_following: bool


@router.post("/follows", response_model=FollowResponse, status_code=status.HTTP_201_CREATED)
async def follow_user(
    follow_data: FollowCreate,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth)
):
    """Follow a user (DISC-01)

    Creates a one-way follow relationship from current user to target user.
    Enforces rate limit of 100 follows per day (CONTEXT.md D-9).

    Args:
        follow_data: Request body with following_id (user to follow)
        db: Database session
        current_user_id: Authenticated user ID from JWT token

    Returns:
        201 Created with success message and following_id

    Raises:
        400: If trying to follow yourself
        404: If target user not found
        409: If already following this user
        429: If rate limit exceeded (100 follows/day)
    """
    # Prevent self-follow
    if current_user_id == follow_data.following_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot follow yourself"
        )

    try:
        follow_service = FollowService(db)
        follow_service.follow_user(current_user_id, follow_data.following_id)
    except ValueError as e:
        error_msg = str(e)

        # Map ValueError to appropriate HTTP status codes
        if "Cannot follow yourself" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        elif "User not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        elif "Already following" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        elif "Rate limit exceeded" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An error occurred while processing follow request"
            )

    return FollowResponse(
        message="Followed successfully",
        following_id=follow_data.following_id
    )


@router.delete("/follows/{user_id}", response_model=UnfollowResponse)
async def unfollow_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth)
):
    """Unfollow a user

    Removes the follow relationship from current user to target user.

    Args:
        user_id: ID of the user to unfollow (path parameter)
        db: Database session
        current_user_id: Authenticated user ID from JWT token

    Returns:
        200 OK with success message

    Raises:
        400: If trying to unfollow yourself
        404: If not following this user
    """
    # Prevent self-unfollow
    if current_user_id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unfollow yourself"
        )

    try:
        follow_service = FollowService(db)
        follow_service.unfollow_user(current_user_id, user_id)
    except ValueError as e:
        error_msg = str(e)

        if "Not following this user" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )

    return UnfollowResponse(message="Unfollowed successfully")


@router.get("/follows/followers/{user_id}", response_model=FollowersCountResponse)
async def get_followers_count(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get followers count for a user (CONTEXT.md D-10)

    Public endpoint - no authentication required (AUTH-04).
    Returns count only, not full user list. Full list browsing deferred to v2.

    Args:
        user_id: ID of the user
        db: Database session

    Returns:
        200 OK with followers_count (integer)
    """
    follow_service = FollowService(db)
    counts = follow_service.get_follow_counts(user_id)

    return FollowersCountResponse(followers_count=counts["followers_count"])


@router.get("/follows/following/{user_id}", response_model=FollowingCountResponse)
async def get_following_count(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Get following count for a user (CONTEXT.md D-10)

    Public endpoint - no authentication required (AUTH-04).
    Returns count only, not full user list. Full list browsing deferred to v2.

    Args:
        user_id: ID of the user
        db: Database session

    Returns:
        200 OK with following_count (integer)
    """
    follow_service = FollowService(db)
    counts = follow_service.get_follow_counts(user_id)

    return FollowingCountResponse(following_count=counts["following_count"])


@router.get("/follows/check/{user_id}", response_model=FollowCheckResponse)
async def check_follow_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth)
):
    """Check if current user is following target user

    Requires authentication. Returns boolean follow status.

    Args:
        user_id: ID of the user to check
        db: Database session
        current_user_id: Authenticated user ID from JWT token

    Returns:
        200 OK with is_following (boolean)
    """
    follow_service = FollowService(db)
    is_following = follow_service.is_following(current_user_id, user_id)

    return FollowCheckResponse(is_following=is_following)
