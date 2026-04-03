from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from typing import Optional

from app.api.v1.dependencies import get_db, require_auth
from app.services.dataset_service import DatasetService
from app.schemas.dataset import DatasetResponse, DatasetListResponse

router = APIRouter(prefix="/datasets", tags=["datasets"])


@router.post("", response_model=DatasetResponse, status_code=201)
async def upload_dataset(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    auth: int = Depends(require_auth)
):
    """
    Upload a CSV dataset file.

    - **file**: CSV file (max 100MB)
    - Returns dataset metadata without download URL (fetch separately for fresh URL)

    NOTE-03: User can upload datasets (CSV files) to support charts and data visualization
    """
    service = DatasetService(db)
    dataset = await service.upload_dataset(file, auth)
    return DatasetResponse(
        id=dataset.id,
        filename=dataset.filename,
        original_filename=dataset.original_filename,
        file_size_bytes=dataset.file_size_bytes,
        content_type=dataset.content_type,
        row_count=dataset.row_count,
        created_at=dataset.created_at,
        download_url=None  # Don't include URL in upload response
    )


@router.get("", response_model=DatasetListResponse)
async def list_datasets(
    limit: int = 50,
    db: Session = Depends(get_db),
    auth: int = Depends(require_auth)
):
    """
    List current user's datasets.

    Returns list of datasets with metadata but no download URLs.
    """
    service = DatasetService(db)
    datasets = service.get_user_datasets(auth, limit)
    return DatasetListResponse(
        datasets=[
            DatasetResponse(
                id=d.id,
                filename=d.filename,
                original_filename=d.original_filename,
                file_size_bytes=d.file_size_bytes,
                content_type=d.content_type,
                row_count=d.row_count,
                created_at=d.created_at,
                download_url=None
            )
            for d in datasets
        ],
        total=len(datasets)
    )


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    auth: int = Depends(require_auth)
):
    """
    Get dataset metadata with fresh download URL.

    STOR-02: Dataset files have cryptographically secure URLs with expiration
    SEC-03: Dataset access restricted to notebook owner and viewers
    """
    service = DatasetService(db)
    dataset = service.get_dataset(dataset_id, auth)
    download_url = service.generate_download_url(dataset)

    return DatasetResponse(
        id=dataset.id,
        filename=dataset.filename,
        original_filename=dataset.original_filename,
        file_size_bytes=dataset.file_size_bytes,
        content_type=dataset.content_type,
        row_count=dataset.row_count,
        created_at=dataset.created_at,
        download_url=download_url
    )


@router.delete("/{dataset_id}", status_code=204)
async def delete_dataset(
    dataset_id: int,
    db: Session = Depends(get_db),
    auth: int = Depends(require_auth)
):
    """
    Delete a dataset and its file from storage.

    Only the dataset owner can delete their datasets.
    """
    service = DatasetService(db)
    service.delete_dataset(dataset_id, auth)
    return None
