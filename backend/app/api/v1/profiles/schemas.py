from pydantic import BaseModel, Field, HttpUrl, field_validator
from typing import Optional
from datetime import datetime

class ProfileUpdateRequest(BaseModel):
    """Request for updating profile (PROF-05, D-07, D-08)"""
    username: Optional[str] = Field(None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    avatar_url: Optional[HttpUrl] = None
    bio: Optional[str] = Field(None, max_length=500)

    @field_validator('username')
    @classmethod
    def username_alphanumeric(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.replace('_', '').replace('-', '').isalnum():
            raise ValueError('Username must contain only letters, numbers, underscores, and hyphens')
        return v

class ProfileResponse(BaseModel):
    """Response with full profile data (PROF-01, PROF-02, D-08)"""
    id: int
    user_id: int
    username: str
    email: str
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PublicProfileResponse(BaseModel):
    """Public profile response for viewing other users (AUTH-04, D-08)"""
    user_id: int
    username: str
    avatar_url: Optional[str] = None
    banner_url: Optional[str] = None
    bio: Optional[str] = None
    published_notebook_count: int = 0
    likes_received_count: int = 0
    saved_notebook_count: int = 0
    group_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class ProfileStatsResponse(BaseModel):
    """Profile statistics response (PROF-03, PROF-04)"""
    published_notebook_count: int = 0
    likes_received_count: int = 0
    saved_notebook_count: int = 0
    group_count: int = 0

class NotebookListItem(BaseModel):
    """Notebook list item (PROF-06, placeholder for Phase 2)"""
    id: int
    title: str
    description: Optional[str] = None
    thumbnail_url: Optional[str] = None
    like_count: int = 0
    comment_count: int = 0
    created_at: datetime

class UserNotebooksResponse(BaseModel):
    """User's published notebooks response (PROF-06, placeholder for Phase 2)"""
    notebooks: list[NotebookListItem] = []
    total: int = 0
    page: int = 1
    per_page: int = 20
