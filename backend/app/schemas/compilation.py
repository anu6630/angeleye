from pydantic import BaseModel, Field
from typing import Optional


class CompilationRequest(BaseModel):
    """Request schema for notebook compilation"""
    notebook_id: int = Field(..., description="ID of notebook to compile")
    dataset_id: Optional[int] = Field(None, description="Optional dataset ID to use")


class AsyncCompilationRequest(BaseModel):
    """Request schema for async notebook compilation"""
    notebook_id: int
    dataset_id: Optional[int] = None


class CompilationResponse(BaseModel):
    """Response schema for compilation result"""
    status: str  # 'success' or 'failed'
    notebook_id: int
    output_url: Optional[str] = None
    output_key: Optional[str] = None
    error: Optional[str] = None


class AsyncCompilationResponse(BaseModel):
    """Response schema for async compilation (returns task ID)"""
    task_id: str
    notebook_id: int
    status: str = "pending"


class PublishRequest(BaseModel):
    """Request schema for publishing compiled notebook"""
    notebook_id: int
    output_key: str = Field(..., description="S3 key of compiled output")
    auto_invalidate: bool = True  # Invalidate cache for old version


class PublishResponse(BaseModel):
    """Response schema for published notebook"""
    notebook_id: int
    is_published: bool
    output_url: str
    invalidation_id: Optional[str] = None
