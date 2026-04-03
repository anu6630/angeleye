import os
import csv
import time
from typing import Optional
from sqlalchemy.orm import Session
from fastapi import UploadFile, HTTPException
from app.models.dataset import Dataset
from app.services.storage_service import StorageService
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class DatasetService:
    """
    Service for dataset upload, storage, and access.

    NOTE-03: User can upload datasets (CSV files)
    STOR-02: Dataset access restricted to notebook owner and viewers
    SEC-03: Dataset access restricted with presigned URLs
    """

    def __init__(self, db: Session):
        self.db = db
        self.storage = StorageService()

    async def upload_dataset(
        self,
        file: UploadFile,
        user_id: int
    ) -> Dataset:
        """
        Upload a dataset file to MinIO/S3 and create metadata record.

        NOTE-03: User can upload datasets (CSV files) to support charts and data visualization

        Args:
            file: FastAPI UploadFile from multipart form data
            user_id: ID of the user uploading the dataset

        Returns:
            Created Dataset model instance

        Raises:
            HTTPException: If file validation fails or upload fails
        """
        # Validate file type (CSV only per NOTE-03)
        if not file.filename or not file.filename.endswith('.csv'):
            raise HTTPException(status_code=400, detail="Only CSV files are allowed")

        # Validate file size (max 100MB per RESEARCH.md Pitfall 6)
        MAX_SIZE = settings.MAX_DATASET_SIZE_MB * 1024 * 1024  # Convert to bytes
        file.file._file.seek(0, os.SEEK_END)
        file_size = file.file._file.tell()
        file.file._file.seek(0)  # Reset for reading

        if file_size > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size exceeds {settings.MAX_DATASET_SIZE_MB}MB limit"
            )

        # Generate unique S3 key (SEC-03: include user_id and timestamp)
        timestamp = int(time.time())
        filename = f"{user_id}_{timestamp}_{file.filename}"
        s3_key = f"datasets/{user_id}/{filename}"

        # Upload to MinIO/S3 using streaming upload
        try:
            self.storage.upload_fileobj(
                file.file,
                settings.DATASETS_BUCKET,
                s3_key,
                content_type="text/csv"
            )
        except Exception as e:
            logger.error(f"Failed to upload dataset: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")

        # Count rows (optional, for preview)
        row_count = None
        try:
            file.file._file.seek(0)
            reader = csv.reader(line.decode('utf-8') for line in file.file)
            row_count = sum(1 for _ in reader) - 1  # Exclude header
        except Exception:
            pass  # Row count is optional, don't fail if parsing fails

        # Create database record
        dataset = Dataset(
            user_id=user_id,
            filename=filename,
            original_filename=file.filename,
            file_size_bytes=file_size,
            content_type="text/csv",
            s3_key=s3_key,
            row_count=row_count
        )
        self.db.add(dataset)
        self.db.commit()
        self.db.refresh(dataset)

        return dataset

    def get_dataset(self, dataset_id: int, user_id: Optional[int] = None) -> Dataset:
        """
        Get a dataset by ID with ownership verification.

        SEC-03: Dataset access restricted to notebook owner and viewers

        Args:
            dataset_id: Dataset ID
            user_id: Optional user ID for ownership verification

        Returns:
            Dataset model instance

        Raises:
            HTTPException: If dataset doesn't exist or user doesn't have access
        """
        dataset = self.db.query(Dataset).filter(Dataset.id == dataset_id).first()

        if not dataset:
            raise HTTPException(status_code=404, detail="Dataset not found")

        # Ownership check (SEC-03: dataset access restricted to owner)
        if user_id is not None and dataset.user_id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        return dataset

    def get_user_datasets(self, user_id: int, limit: int = 50) -> list[Dataset]:
        """
        Get all datasets for a user.

        Args:
            user_id: User ID
            limit: Maximum number of datasets to return

        Returns:
            List of Dataset model instances
        """
        return self.db.query(Dataset)\
            .filter(Dataset.user_id == user_id)\
            .order_by(Dataset.created_at.desc())\
            .limit(limit)\
            .all()

    def generate_download_url(self, dataset: Dataset) -> str:
        """
        Generate a presigned download URL for a dataset.

        STOR-02: Dataset files have cryptographically secure URLs with expiration

        Args:
            dataset: Dataset model instance

        Returns:
            Presigned URL with 5-minute expiration
        """
        return self.storage.generate_presigned_url(
            settings.DATASETS_BUCKET,
            dataset.s3_key,
            expiration=300  # 5 minutes per STOR-02
        )

    def delete_dataset(self, dataset_id: int, user_id: int) -> None:
        """
        Delete a dataset and its file from storage.

        Args:
            dataset_id: Dataset ID
            user_id: User ID for ownership verification

        Raises:
            HTTPException: If dataset doesn't exist or user doesn't own it
        """
        dataset = self.get_dataset(dataset_id, user_id)

        # Delete from S3/MinIO
        try:
            self.storage.delete_object(settings.DATASETS_BUCKET, dataset.s3_key)
        except Exception as e:
            logger.warning(f"Failed to delete file from storage: {e}")

        # Delete database record
        self.db.delete(dataset)
        self.db.commit()
