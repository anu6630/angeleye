from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from sqlalchemy.orm import Session
from typing import Optional
import secrets

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.core.security import create_access_token, create_refresh_token
from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.user import User
from app.models.profile import Profile
from app.api.v1.auth.schemas import (
    OAuthCallbackResponse,
    ProfileCompletionRequest,
    ProfileCompletionResponse,
    MeResponse,
    RegisterRequest,
    LoginRequest,
    RegisterResponse
)
from app.api.v1.dependencies import rate_limit_authorization
from app.services.avatar_service import build_avatar_url

router = APIRouter()


def _cookie_secure() -> bool:
    """Mark auth cookies secure when frontend is served over HTTPS."""
    return settings.FRONTEND_URL.startswith("https://")

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

@router.get('/google', dependencies=[Depends(rate_limit_authorization())])
async def login_via_google(
    request: Request
):  # Rate limiting temporarily disabled for debugging
    """Initiate Google OAuth flow (AUTH-01, D-03)"""
    state = secrets.token_urlsafe(16)
    request.session['oauth_state'] = state
    redirect_uri = str(request.base_url) + "api/v1/auth/google/callback"

    return await oauth.google.authorize_redirect(request, redirect_uri, state=state)

@router.get('/google/callback', dependencies=[Depends(rate_limit_authorization())])
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

        # Parse user info - try ID token first, fallback to userinfo endpoint
        try:
            user_info = await oauth.google.parse_id_token(request, token)
        except Exception:
            # Fallback to userinfo endpoint
            resp = await oauth.google.get('https://www.googleapis.com/oauth2/v3/userinfo', token=token)
            user_info = resp.json()

        # Get or create user
        auth_service = AuthService(db)
        user = auth_service.get_user_by_oauth_id('google', user_info['sub'])

        if user:
            # Existing user - create tokens and set cookies (AUTH-03, D-09, D-10, D-12)
            access_token = create_access_token(user.id)
            refresh_token = create_refresh_token(user.id)

            # Create redirect response with cookies
            redirect_response = RedirectResponse(url=f"{settings.FRONTEND_URL}/", status_code=302)

            # Set httpOnly cookies directly on redirect response (D-10)
            redirect_response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=_cookie_secure(),
                samesite="lax",
                max_age=1800,  # 30 minutes
                path="/",
            )
            redirect_response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=_cookie_secure(),
                samesite="lax",
                max_age=604800,  # 7 days
                path="/",
            )

            return redirect_response
        else:
            # New user - redirect to profile wizard (D-01, D-02)
            pending_user = auth_service.create_oauth_user(
                provider='google',
                oauth_id=user_info['sub'],
                email=user_info['email'],
                name=user_info.get('name')
            )

            # Create redirect response with pending user cookie
            redirect_response = RedirectResponse(url=f"{settings.FRONTEND_URL}/profile-wizard", status_code=302)

            # Set temporary session for wizard
            redirect_response.set_cookie(
                key="pending_user_id",
                value=str(pending_user.id),
                httponly=True,
                secure=_cookie_secure(),
                samesite="lax",
                max_age=3600,  # 1 hour
                path="/",
            )

            return redirect_response

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

@router.get('/facebook', dependencies=[Depends(rate_limit_authorization())])
async def login_via_facebook(
    request: Request
):  # Rate limiting temporarily disabled for debugging
    """Initiate Facebook OAuth flow (AUTH-02, D-03)"""
    state = secrets.token_urlsafe(16)
    request.session['oauth_state'] = state
    redirect_uri = str(request.base_url) + "api/v1/auth/facebook/callback"

    return await oauth.facebook.authorize_redirect(request, redirect_uri, state=state)

@router.get('/facebook/callback', dependencies=[Depends(rate_limit_authorization())])
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
            access_token = create_access_token(user.id)
            refresh_token = create_refresh_token(user.id)

            # Create redirect response with cookies
            redirect_response = RedirectResponse(url=f"{settings.FRONTEND_URL}/", status_code=302)

            redirect_response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=_cookie_secure(),
                samesite="lax",
                max_age=1800,
                path="/",
            )
            redirect_response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=_cookie_secure(),
                samesite="lax",
                max_age=604800,
                path="/",
            )

            # Redirect to frontend home
            return redirect_response
        else:
            # New user - redirect to profile wizard (D-01, D-02)
            pending_user = auth_service.create_oauth_user(
                provider='facebook',
                oauth_id=user_info['id'],
                email=user_info.get('email'),
                name=user_info.get('name')
            )

            # Create redirect response with pending user cookie
            redirect_response = RedirectResponse(url=f"{settings.FRONTEND_URL}/profile-wizard", status_code=302)

            redirect_response.set_cookie(
                key="pending_user_id",
                value=str(pending_user.id),
                httponly=True,
                secure=_cookie_secure(),
                samesite="lax",
                max_age=3600,
                path="/",
            )

            # Redirect to frontend profile wizard
            return redirect_response

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

@router.post('/complete-profile', response_model=ProfileCompletionResponse, dependencies=[Depends(rate_limit_authorization())])
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
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Set httpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=1800,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=604800,
        path="/"
    )

    # Clear pending user cookie
    response.delete_cookie("pending_user_id")

    return ProfileCompletionResponse(
        user_id=user.id,
        username=user.username,
        email=user.email,
        avatar_url=build_avatar_url(user.username, user.profile) if user.profile else None,
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
        avatar_url=build_avatar_url(user.username, profile) if profile else None,
        created_at=user.created_at
    )

@router.post('/logout')
async def logout(response: Response):
    """Logout user by clearing cookies"""
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    return {"success": True, "message": "Logged out successfully"}

@router.post('/test-login', dependencies=[Depends(rate_limit_authorization())])
async def test_login(
    login_data: dict,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Test-only endpoint for performance/load testing.
    Creates a test user and returns auth tokens without OAuth.
    WARNING: Only enable in test environments!
    """
    if not settings.ENABLE_TEST_LOGIN:
        raise HTTPException(status_code=403, detail="Test login is disabled")

    auth_service = AuthService(db)

    # Check if user already exists
    from app.models.user import User
    existing_user = db.query(User).filter(User.email == login_data.get('email')).first()

    if existing_user:
        # Return tokens for existing user
        access_token = create_access_token(existing_user.id)
        refresh_token = create_refresh_token(existing_user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "id": existing_user.id,
            "email": existing_user.email,
            "username": existing_user.username
        }

    # Create new test user
    try:
        user = auth_service.create_oauth_user(
            provider='test',
            oauth_id=f"test_{login_data.get('email')}",
            email=login_data.get('email'),
            name=login_data.get('name', 'Test User')
        )

        # Complete profile with random username
        import random
        import string
        random_suffix = ''.join(random.choices(string.ascii_lowercase, k=8))
        auth_service.update_user_profile(
            user_id=user.id,
            username=f"testuser_{random_suffix}",
            avatar_url=None,
            bio="Performance test user"
        )

        # Create tokens
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "id": user.id,
            "email": user.email,
            "username": user.username
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create test user: {str(e)}")


@router.post('/register', response_model=RegisterResponse, dependencies=[Depends(rate_limit_authorization())])
async def register(
    user_data: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Register new user with email and password"""
    # Check if email already exists
    existing_email = db.query(User).filter(User.email == user_data.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username already exists
    existing_username = db.query(User).filter(User.username == user_data.username).first()
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")

    # Create new user
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        is_active=True,
        is_verified=True  # Auto-verify for test purposes
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    new_profile = Profile(user_id=new_user.id)
    db.add(new_profile)
    db.commit()

    # Create tokens
    access_token = create_access_token(new_user.id)
    refresh_token = create_refresh_token(new_user.id)

    # Set httpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=1800,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=604800,
        path="/"
    )

    return RegisterResponse(
        user_id=new_user.id,
        username=new_user.username,
        email=new_user.email,
        message="Registration successful"
    )


@router.post('/login', dependencies=[Depends(rate_limit_authorization())])
async def login(
    login_data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """Login with email and password"""
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()

    # Verify user exists and password is correct
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Account is inactive")

    # Create tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    # Set httpOnly cookies
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=1800,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=_cookie_secure(),
        samesite="lax",
        max_age=604800,
        path="/"
    )

    # Return JSON response instead of redirect for browser compatibility
    return {
        "success": True,
        "user_id": user.id,
        "username": user.username,
        "email": user.email
    }
