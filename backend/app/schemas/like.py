from pydantic import BaseModel
from datetime import datetime


class LikeResponse(BaseModel):
    """Schema for like response"""
    id: int
    notebook_id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True
