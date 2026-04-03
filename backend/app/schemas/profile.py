from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Optional
from datetime import datetime

class ProfileBase(BaseModel):
    """Base profile schema"""
    bio: Optional[str] = Field(None, max_length=500)
    avatar_url: Optional[HttpUrl] = None

class ProfileCreate(ProfileBase):
    """Schema for profile creation"""
    pass

class ProfileUpdate(ProfileBase):
    """Schema for profile update (D-05, D-06, D-07)"""
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")

    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must contain only letters, numbers, underscores, and hyphens')
        return v

class ProfileResponse(BaseModel):
    """Schema for profile response"""
    id: int
    user_id: int
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProfileWithUserResponse(ProfileResponse):
    """Profile response with user data"""
    username: str
    email: str
    published_notebook_count: int = 0
    likes_received_count: int = 0

    class Config:
        from_attributes = True
