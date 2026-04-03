from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class NotebookCell(BaseModel):
    """Schema for a single notebook cell"""
    id: int
    cell_type: str  # "code" or "markdown"
    content: str
    order_index: int

    class Config:
        from_attributes = True


class NotebookCreate(BaseModel):
    """Schema for notebook creation"""
    title: str = Field(..., min_length=1, max_length=255)


class NotebookUpdate(BaseModel):
    """Schema for notebook update"""
    title: str = Field(..., min_length=1, max_length=255)
    is_published: bool = False


class NotebookResponse(BaseModel):
    """Schema for notebook response"""
    id: int
    title: str
    user_id: int
    is_published: bool
    created_at: datetime
    updated_at: datetime
    like_count: int = 0
    comment_count: int = 0
    cells: Optional[List[NotebookCell]] = None

    class Config:
        from_attributes = True


class NotebookListResponse(BaseModel):
    """Schema for notebook list item (feed)"""
    id: int
    title: str
    username: str
    avatar_url: Optional[str] = None
    like_count: int = 0
    comment_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
