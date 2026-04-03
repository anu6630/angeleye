from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class CommentCreate(BaseModel):
    """Schema for comment creation"""
    content: str = Field(..., min_length=1, max_length=2000)
    parent_id: Optional[int] = None


class CommentResponse(BaseModel):
    """Schema for comment response"""
    id: int
    notebook_id: int
    user_id: int
    parent_id: Optional[int] = None
    content: str
    created_at: datetime
    updated_at: datetime
    username: str
    avatar_url: Optional[str] = None
    replies: Optional[List['CommentResponse']] = None

    model_config = {"from_attributes": True, "populate_by_name": True}


# Update forward references for nested replies
CommentResponse.model_rebuild()
