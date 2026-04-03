from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from sqlalchemy.orm import Session
from typing import Optional
import secrets
import os

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.core.security import create_access_token, create_refresh_token
from app.api.v1.auth.schemas import (
    OAuthCallbackResponse,
    ProfileCompletionRequest,
    ProfileCompletionResponse,
    MeResponse
)
from app.api.v1.dependencies import limiter

router = APIRouter()

# OAuth configuration (D-03, D-04)
config = Config('.env')
oauth = OAuth(config)

# Register Google OAuth (AUTH-01, D-03)
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# Register Facebook OAuth (AUTH-02, D-03)
oauth.register(
    name='facebook',
    server_metadata_url='https://www.facebook.com/.well-known/oauth/openid-configuration/',
    client_kwargs={'scope': 'email public_profile'}
)

@router.get('/google')
@limiter.limit("10/minute")  # Rate limit OAuth initiation (SEC-04)
async def login_via_google(request: Request):
    """Initiate Google OAuth flow (AUTH-01, D-03)"""
    state = secrets.token_urlsafe(16)
    request.session['oauth_state'] = state
    redirect_uri = str(request.base_url) + "api/v1/auth/google/callback"

    return await oauth.google.authorize_redirect(request, redirect_uri, state=state)

@router.get('/google/callback')
async def auth_google_callback(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback (AUTH-01, D-01, D-03, D-04)"""
    try:
        # Validate state
        if request.session.get('oauth_state') != request.query_params.get('state'):
            raise HTTPException(status_code=400, detail="Invalid state parameter")

        # Get OAuth token
        token = await oauth.google.authorize_access_token(request)
        # Parse user info from ID token
        user_info = await oauth.google.parse_id_token(request, token)

        # Get or create user
        auth_service = AuthService(db)
        user = auth_service.get_user_by_oauth_id('google', user_info['sub'])

        if user:
            # Existing user - create tokens and set cookies (AUTH-03, D-09, D-10, D-12)
            access_token = create_access_token(data={"sub": user.id})
            refresh_token = create_refresh_token(data={"sub": user.id})

            # Set httpOnly cookies (D-10)
            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=False,  # Set to True in production (HTTPS)
                samesite="lax",
                max_age=1800  # 30 minutes
            )
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=604800  # 7 days
            )

            # Redirect to home
            return RedirectResponse(url="/", status_code=302)
        else:
            # New user - redirect to profile wizard (D-01, D-02)
            pending_user = auth_service.create_oauth_user(
                provider='google',
                oauth_id=user_info['sub'],
                email=user_info['email'],
                name=user_info.get('name')
            )

            # Set temporary session for wizard
            response.set_cookie(
                key="pending_user_id",
                value=str(pending_user.id),
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=3600  # 1 hour
            )

            # Redirect to profile wizard
            return RedirectResponse(url="/profile-wizard", status_code=302)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

@router.get('/facebook')
@limiter.limit("10/minute")
async def login_via_facebook(request: Request):
    """Initiate Facebook OAuth flow (AUTH-02, D-03)"""
    state = secrets.token_urlsafe(16)
    request.session['oauth_state'] = state
    redirect_uri = str(request.base_url) + "api/v1/auth/facebook/callback"

    return await oauth.facebook.authorize_redirect(request, redirect_uri, state=state)

@router.get('/facebook/callback')
async def auth_facebook_callback(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Handle Facebook OAuth callback (AUTH-02, D-01, D-03, D-04)"""
    try:
        # Validate state
        if request.session.get('oauth_state') != request.query_params.get('state'):
            raise HTTPException(status_code=400, detail="Invalid state parameter")

        # Get OAuth token
        token = await oauth.facebook.authorize_access_token(request)
        # Get user info from Facebook
        resp = await oauth.facebook.get('me?fields=id,email,name', token=token)
        user_info = resp.json()

        # Get or create user
        auth_service = AuthService(db)
        user = auth_service.get_user_by_oauth_id('facebook', user_info['id'])

        if user:
            # Existing user - create tokens and set cookies (AUTH-03, D-09, D-10, D-12)
            access_token = create_access_token(data={"sub": user.id})
            refresh_token = create_refresh_token(data={"sub": user.id})

            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=1800
            )
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=604800
            )

            return RedirectResponse(url="/", status_code=302)
        else:
            # New user - redirect to profile wizard (D-01, D-02)
            pending_user = auth_service.create_oauth_user(
                provider='facebook',
                oauth_id=user_info['id'],
                email=user_info.get('email'),
                name=user_info.get('name')
            )

            response.set_cookie(
                key="pending_user_id",
                value=str(pending_user.id),
                httponly=True,
                secure=False,
                samesite="lax",
                max_age=3600
            )

            return RedirectResponse(url="/profile-wizard", status_code=302)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

@router.post('/complete-profile')
async def complete_profile(
    request: Request,
    response: Response,
    profile_data: ProfileCompletionRequest,
    db: Session = Depends(get_db)
):
    """Complete profile wizard (D-01, D-02, D-05, D-07)"""
    # Get pending user ID from cookie
    pending_user_id = request.cookies.get("pending_user_id")
    if not pending_user_id:
        raise HTTPException(status_code=401, detail="No pending user session")

    try:
        user_id = int(pending_user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid pending user ID")

    auth_service = AuthService(db)
    user = auth_service.update_user_profile(
        user_id=user_id,
        username=profile_data.username,
        avatar_url=profile_data.avatar_url,
        bio=profile_data.bio
    )

    if not user:
        raise HTTPException(status_code=400, detail="Username already taken or user not found")

    # Create JWT tokens (AUTH-03, D-09, D-12)
    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})

    # Set httpOnly cookies (D-10)
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=1800
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=604800
    )

    # Clear pending user cookie
    response.delete_cookie("pending_user_id")

    return ProfileCompletionResponse(
        user_id=user.id,
        username=user.username,
        email=user.email,
        avatar_url=user.profile.avatar_url if user.profile else None,
        bio=user.profile.bio if user.profile else None
    )

@router.get('/me', response_model=MeResponse)
async def get_current_user(
    request: Request,
    db: Session = Depends(get_db)
):
    """Get current authenticated user info"""
    from app.api.v1.dependencies import require_auth

    try:
        user_id = await require_auth(request)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Not authenticated")

    from app.models.user import User
    from app.models.profile import Profile

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()

    return MeResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        is_active=user.is_active,
        is_verified=user.is_verified,
        bio=profile.bio if profile else None,
        avatar_url=profile.avatar_url if profile else None,
        created_at=user.created_at
    )

@router.post('/logout')
async def logout(response: Response):
    """Logout user by clearing cookies"""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"success": True, "message": "Logged out successfully"}
