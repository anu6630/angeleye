from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime

class RegisterRequest(BaseModel):
    """Request for email/password registration"""
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., min_length=8, max_length=100, description="Password (min 8 characters)")
    username: str = Field(..., min_length=3, max_length=50, description="Username")

class LoginRequest(BaseModel):
    """Request for email/password login"""
    email: EmailStr = Field(..., description="User email")
    password: str = Field(..., description="Password")

class RegisterResponse(BaseModel):
    """Response for successful registration"""
    user_id: int
    username: str
    email: str
    message: str = "Registration successful"

class OAuthLoginResponse(BaseModel):
    """Response for initiating OAuth login"""
    authorization_url: str
    state: str

class ProfileCompletionRequest(BaseModel):
    """Request for completing profile wizard (D-01, D-02)"""
    username: str = Field(..., min_length=3, max_length=50, description="Username (required per D-05)")
    avatar_url: Optional[str] = Field(None, description="Avatar URL (optional per D-06)")
    bio: Optional[str] = Field(None, max_length=500, description="Bio (optional per D-06)")

class ProfileCompletionResponse(BaseModel):
    """Response after completing profile wizard"""
    user_id: int
    username: str
    email: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None

class OAuthCallbackResponse(BaseModel):
    """Response for OAuth callback"""
    success: bool
    requires_profile_completion: bool
    user_id: Optional[int] = None
    redirect_url: Optional[str] = None
    message: str

class RefreshTokenRequest(BaseModel):
    """Request for refreshing access token"""
    refresh_token: str

class TokenResponse(BaseModel):
    """Response with new access token"""
    access_token: str
    token_type: str = "bearer"

class LogoutResponse(BaseModel):
    """Response for logout"""
    success: bool
    message: str = "Logged out successfully"

class MeResponse(BaseModel):
    """Current user info"""
    id: int
    email: str
    username: str
    is_active: bool
    is_verified: bool
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
