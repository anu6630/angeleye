from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class DatasetCreateRequest(BaseModel):
    """Request schema for dataset upload - filename is extracted from upload"""
    pass  # File is sent as multipart/form-data


class DatasetResponse(BaseModel):
    """Response schema for dataset metadata"""
    id: int
    filename: str
    original_filename: str
    file_size_bytes: int
    content_type: str
    row_count: Optional[int] = None
    created_at: datetime
    download_url: Optional[str] = None  # Presigned URL, not always included

    model_config = {"from_attributes": True}


class DatasetListResponse(BaseModel):
    """Response schema for list of user's datasets"""
    datasets: list[DatasetResponse]
    total: int
