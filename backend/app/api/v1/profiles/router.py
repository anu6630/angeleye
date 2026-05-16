from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.services.avatar_service import AvatarService, build_avatar_url
from app.services.banner_service import BannerService, build_banner_url
from app.services.profile_service import ProfileService
from app.api.v1.dependencies import rate_limit_authorization
from app.api.v1.dependencies import require_auth
from app.api.v1.profiles.schemas import (
    ProfileUpdateRequest,
    ProfileResponse,
    PublicProfileResponse,
    ProfileStatsResponse,
    UserNotebooksResponse
)
router = APIRouter()


def _profile_response_from_user(user: User):
    profile = user.profile
    avatar_url = build_avatar_url(user.username, profile) if profile else None
    banner_url = build_banner_url(user.username, profile) if profile else None
    return ProfileResponse(
        id=profile.id if profile else 0,
        user_id=user.id,
        username=user.username,
        email=user.email,
        bio=profile.bio if profile else None,
        avatar_url=avatar_url,
        banner_url=banner_url,
        created_at=profile.created_at if profile else user.created_at,
        updated_at=profile.updated_at if profile else user.updated_at,
    )

@router.get('/me', response_model=ProfileResponse)
async def get_my_profile(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get current user's profile (PROF-01, PROF-02, D-08)"""
    # Get authenticated user
    user_id = await require_auth(request)

    profile_service = ProfileService(db)
    user = profile_service.get_user_with_profile(user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return _profile_response_from_user(user)

@router.put('/me', response_model=ProfileResponse, dependencies=[Depends(rate_limit_authorization())])
async def update_my_profile(
    request: Request,
    profile_data: ProfileUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update current user's profile (PROF-05, D-07, D-08)"""
    # Get authenticated user (AUTH-05: authentication required for editing)
    user_id = await require_auth(request)

    profile_service = ProfileService(db)
    user = profile_service.update_profile(user_id, profile_data)

    if not user:
        raise HTTPException(
            status_code=400,
            detail="Username already taken or user not found"
        )

    return _profile_response_from_user(user)

@router.get('/stats', response_model=ProfileStatsResponse)
async def get_my_profile_stats(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get current user's profile statistics (PROF-03, PROF-04)"""
    # Get authenticated user
    user_id = await require_auth(request)

    profile_service = ProfileService(db)
    stats = profile_service.get_profile_stats(user_id)

    return ProfileStatsResponse(**stats)

@router.get('/notebooks', response_model=UserNotebooksResponse)
async def get_my_notebooks(
    request: Request,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db)
):
    """Get current user's published notebooks (PROF-06)"""
    # Get authenticated user
    user_id = await require_auth(request)

    profile_service = ProfileService(db)

    # Calculate offset
    skip = (page - 1) * per_page

    # Get notebooks
    notebooks = profile_service.list_user_notebooks(user_id, skip, per_page)

    return UserNotebooksResponse(
        notebooks=notebooks,
        total=len(notebooks),
        page=page,
        per_page=per_page
    )

@router.get('/{username}', response_model=PublicProfileResponse)
async def get_public_profile(
    username: str,
    db: Session = Depends(get_db)
):
    """Get public profile by username (AUTH-04, AUTH-05: passive viewing works without auth)"""
    profile_service = ProfileService(db)
    user = profile_service.get_user_by_username(username)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = profile_service.get_profile_by_user_id(user.id)
    stats = profile_service.get_profile_stats(user.id)

    return PublicProfileResponse(
        user_id=user.id,
        username=user.username,
        avatar_url=build_avatar_url(user.username, profile) if profile else None,
        banner_url=build_banner_url(user.username, profile) if profile else None,
        bio=profile.bio if profile else None,
        published_notebook_count=stats['published_notebook_count'],
        likes_received_count=stats['likes_received_count'],
        saved_notebook_count=stats['saved_notebook_count'],
        group_count=stats['group_count'],
        created_at=user.created_at
    )


@router.post('/me/avatar', dependencies=[Depends(rate_limit_authorization())])
async def upload_my_avatar(
    request: Request,
    file: UploadFile = File(...),
    crop_x: Optional[int] = None,
    crop_y: Optional[int] = None,
    crop_size: Optional[int] = None,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    avatar_service = AvatarService(db)
    avatar_url = avatar_service.upload_avatar(
        user_id=user_id,
        file=file,
        crop_x=crop_x,
        crop_y=crop_y,
        crop_size=crop_size,
    )
    return {"avatar_url": avatar_url}


@router.delete('/me/avatar', status_code=204, dependencies=[Depends(rate_limit_authorization())])
async def delete_my_avatar(
    request: Request,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    avatar_service = AvatarService(db)
    avatar_service.delete_avatar(user_id)


@router.post('/me/banner', dependencies=[Depends(rate_limit_authorization())])
async def upload_my_banner(
    request: Request,
    file: UploadFile = File(...),
    crop_x: Optional[int] = None,
    crop_y: Optional[int] = None,
    crop_width: Optional[int] = None,
    crop_height: Optional[int] = None,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    banner_service = BannerService(db)
    banner_url = banner_service.upload_profile_banner(
        user_id=user_id,
        file=file,
        crop_x=crop_x,
        crop_y=crop_y,
        crop_width=crop_width,
        crop_height=crop_height,
    )
    return {"banner_url": banner_url}


@router.delete('/me/banner', status_code=204, dependencies=[Depends(rate_limit_authorization())])
async def delete_my_banner(
    request: Request,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    banner_service = BannerService(db)
    banner_service.delete_profile_banner(user_id)


@router.get('/{username}/avatar')
async def get_user_avatar(
    username: str,
    thumb: bool = False,
    db: Session = Depends(get_db),
):
    avatar_service = AvatarService(db)
    body, content_type = avatar_service.stream_avatar(username, thumbnail=thumb)
    return StreamingResponse(body, media_type=content_type)


@router.get('/{username}/banner')
async def get_user_banner(
    username: str,
    thumb: bool = False,
    db: Session = Depends(get_db),
):
    banner_service = BannerService(db)
    body, content_type = banner_service.stream_banner(username, thumbnail=thumb)
    return StreamingResponse(body, media_type=content_type)
