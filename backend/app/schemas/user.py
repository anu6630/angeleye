from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")

    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        if not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must contain only letters, numbers, underscores, and hyphens')
        return v

class UserCreate(UserBase):
    """Schema for user creation"""
    # For OAuth flow, this will be populated from OAuth data
    google_oauth_id: Optional[str] = None
    facebook_oauth_id: Optional[str] = None
    name: Optional[str] = None

class UserResponse(BaseModel):
    """Schema for user response"""
    id: int
    email: str
    username: str
    is_active: bool
    is_verified: bool
    followers_count: Optional[int] = 0
    following_count: Optional[int] = 0
    is_following: Optional[bool] = False  # For current user context
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UserProfileResponse(UserResponse):
    """User response with profile data"""
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True
