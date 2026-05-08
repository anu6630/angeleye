---
phase: 03-execution-publishing
plan: 01B
type: execute
wave: 2
depends_on: ["03-01A"]
files_modified:
  - backend/app/models/dataset.py
  - backend/alembic/versions/003_add_datasets_table.py
  - backend/app/models/__init__.py
  - backend/app/models/user.py
  - backend/app/services/storage_service.py
  - backend/app/schemas/dataset.py
  - backend/app/services/dataset_service.py
autonomous: true
requirements:
  - NOTE-03
  - STOR-01
  - STOR-02
  - SEC-03
  - SEC-07

must_haves:
  truths:
    - "Dataset model exists with s3_key, file_size_bytes, row_count fields"
    - "StorageService can upload files and generate presigned URLs"
    - "DatasetService validates CSV files and 100MB size limit"
    - "Presigned URLs expire after 5 minutes (STOR-02)"
    - "Server-side encryption enabled for uploads (SEC-07)"
  artifacts:
    - path: "backend/app/models/dataset.py"
      provides: "Dataset SQLAlchemy model"
      contains: "class Dataset"
      min_lines: 30
    - path: "backend/app/services/storage_service.py"
      provides: "S3/MinIO operations abstraction"
      exports: ["StorageService", "upload_file", "generate_presigned_url"]
      min_lines: 80
    - path: "backend/app/services/dataset_service.py"
      provides: "Dataset upload and management business logic"
      exports: ["DatasetService", "upload_dataset", "get_dataset"]
      min_lines: 100
    - path: "backend/alembic/versions/003_add_datasets_table.py"
      provides: "Database migration for datasets table"
      contains: "create_table('datasets'"
      min_lines: 30
  key_links:
    - from: "backend/app/services/dataset_service.py"
      to: "backend/app/services/storage_service.py"
      via: "StorageService for S3/MinIO operations"
      pattern: "self\\.storage\\.upload_file|self\\.storage\\.generate_presigned_url"
    - from: "backend/app/services/storage_service.py"
      to: "MinIO/S3"
      via: "boto3 S3 client with endpoint_url for MinIO"
      pattern: "boto3\\.client\\('s3'.*endpoint_url"

---

# Phase 03-01B: Dataset Model and Storage Services

<objective>
Create Dataset model for storing dataset metadata, StorageService for S3/MinIO operations, and DatasetService for dataset upload/validation logic. These services handle dataset storage and access control.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/03-execution-publishing/03-RESEARCH.md
@backend/app/models/notebook.py (for model pattern reference)
@backend/app/models/user.py (for foreign key reference)
@backend/app/core/config.py (for Settings with storage config)
@backend/app/services/notebook_service.py (for service pattern reference)

## Storage Service Contract

This plan creates StorageService - the abstraction layer for all S3/MinIO operations. Downstream plans (03-03, 03-04A) will depend on this service.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create Dataset model and migration</name>
  <files>
    backend/app/models/dataset.py
    backend/alembic/versions/003_add_datasets_table.py
    backend/app/models/__init__.py
    backend/app/models/user.py
  </files>
  <read_first>
    - backend/app/models/notebook.py (for pattern reference)
    - backend/app/models/user.py (for relationship)
    - backend/alembic/versions (for existing migration pattern)
  </read_first>
  <action>
    Create backend/app/models/dataset.py with Dataset model:
    ```python
    from sqlalchemy import Column, Integer, String, BigInteger, DateTime, ForeignKey, Index
    from sqlalchemy.orm import relationship
    from sqlalchemy.sql import func
    from app.db.base import Base


    class Dataset(Base):
        """
        Dataset model for CSV file uploads.

        NOTE-03: User can upload datasets (CSV files)
        STOR-01: Datasets stored in MinIO
        STOR-02: Dataset files have cryptographically secure URLs with expiration
        SEC-03: Dataset access restricted to notebook owner and viewers
        """
        __tablename__ = "datasets"

        id = Column(Integer, primary_key=True, index=True)
        user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
        filename = Column(String(255), nullable=False)
        original_filename = Column(String(255), nullable=False)
        file_size_bytes = Column(BigInteger, nullable=False)
        content_type = Column(String(100), nullable=False)
        s3_key = Column(String(500), nullable=False, unique=True)
        row_count = Column(Integer, nullable=True)
        created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

        # Relationships
        user = relationship("User", back_populates="datasets")

        __table_args__ = (
            Index('ix_datasets_user_id', 'user_id'),
            Index('ix_datasets_created_at', 'created_at'),
        )
    ```

    Update backend/app/models/user.py to add datasets relationship.
    Find the User class and add after existing relationships:
    ```python
    datasets = relationship("Dataset", back_populates="user", cascade="all, delete-orphan")
    ```

    Create migration backend/alembic/versions/003_add_datasets_table.py:
    ```python
    """add datasets table

    Revision ID: 003
    Revises: 002
    Create Date: 2026-04-04

    """
    from alembic import op
    import sqlalchemy as sa

    revision = '003'
    down_revision = '002'
    branch_labels = None
    depends_on = None


    def upgrade():
        op.create_table(
            'datasets',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('filename', sa.String(length=255), nullable=False),
            sa.Column('original_filename', sa.String(length=255), nullable=False),
            sa.Column('file_size_bytes', sa.BigInteger(), nullable=False),
            sa.Column('content_type', sa.String(length=100), nullable=False),
            sa.Column('s3_key', sa.String(length=500), nullable=False),
            sa.Column('row_count', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('s3_key')
        )
        op.create_index('ix_datasets_user_id', 'datasets', ['user_id'])
        op.create_index('ix_datasets_created_at', 'datasets', ['created_at'])


    def downgrade():
        op.drop_index('ix_datasets_created_at', table_name='datasets')
        op.drop_index('ix_datasets_user_id', table_name='datasets')
        op.drop_table('datasets')
    ```

    Update backend/app/models/__init__.py to export Dataset:
    ```python
    from app.models.dataset import Dataset
    ```
    Add Dataset to the __all__ list if it exists.
  </action>
  <verify>
    <automated>python -c "from app.models.dataset import Dataset; print('Dataset model imports successfully')" && grep -q "class Dataset" backend/app/models/dataset.py && echo "Dataset model created"</automated>
  </verify>
  <done>
    - Dataset model created with user_id, filename, file_size_bytes, s3_key, row_count fields
    - User model updated with datasets relationship (cascade delete)
    - Migration 003 created for datasets table with foreign key and unique constraint on s3_key
    - Dataset exported from models/__init__.py
  </done>
</task>

<task type="auto">
  <name>Task 2: Create StorageService for S3/MinIO operations</name>
  <files>
    backend/app/services/storage_service.py
  </files>
  <read_first>
    - backend/app/core/config.py (for Settings with storage config)
    - backend/app/services/profile_service.py (for service pattern reference)
  </read_first>
  <action>
    Create backend/app/services/storage_service.py:
    ```python
    import boto3
    from botocore.client import Config
    from botocore.exceptions import ClientError
    from typing import Optional
    from app.core.config import settings
    import logging

    logger = logging.getLogger(__name__)


    class StorageService:
        """
        S3/MinIO storage service with presigned URL generation.

        Works with both MinIO (dev) and AWS S3 (production).

        STOR-01: Datasets stored in MinIO
        STOR-03: Pre-rendered notebook outputs stored in MinIO/S3
        STOR-02: Dataset files have cryptographically secure URLs with expiration
        SEC-07: Server-side encryption enabled
        """

        def __init__(self):
            # Initialize boto3 S3 client with MinIO endpoint for dev, S3 for prod
            self.s3_client = boto3.client(
                's3',
                endpoint_url=settings.MINIO_ENDPOINT if settings.MINIO_ENDPOINT else None,
                aws_access_key_id=settings.MINIO_ACCESS_KEY if settings.MINIO_ENDPOINT else settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.MINIO_SECRET_KEY if settings.MINIO_ENDPOINT else settings.AWS_SECRET_ACCESS_KEY,
                config=Config(signature_version='s3v4'),
                region_name=settings.AWS_REGION or 'us-east-1'
            )

        def upload_file(
            self,
            file_path: str,
            bucket: str,
            key: str,
            content_type: str = 'application/octet-stream'
        ) -> str:
            """
            Upload a file to S3/MinIO.

            Args:
                file_path: Local file path to upload
                bucket: S3 bucket name
                key: S3 object key (e.g., 'datasets/user_123/data.csv')
                content_type: MIME type of the file

            Returns:
                The S3 key of the uploaded file

            Raises:
                ClientError: If upload fails
            """
            self.s3_client.upload_file(
                file_path,
                bucket,
                key,
                ExtraArgs={
                    'ContentType': content_type,
                    # SEC-07: Server-side encryption for data at rest
                    'ServerSideEncryption': 'AES256'
                }
            )
            return key

        def upload_fileobj(
            self,
            file_obj,
            bucket: str,
            key: str,
            content_type: str = 'application/octet-stream'
        ) -> str:
            """
            Upload a file-like object to S3/MinIO.

            Useful for streaming uploads without saving to disk.

            Args:
                file_obj: File-like object (e.g., from UploadFile)
                bucket: S3 bucket name
                key: S3 object key
                content_type: MIME type of the file

            Returns:
                The S3 key of the uploaded file
            """
            self.s3_client.upload_fileobj(
                file_obj,
                bucket,
                key,
                ExtraArgs={
                    'ContentType': content_type,
                    'ServerSideEncryption': 'AES256'
                }
            )
            return key

        def generate_presigned_url(
            self,
            bucket: str,
            key: str,
            expiration: int = 300
        ) -> str:
            """
            Generate a cryptographically secure presigned URL for S3/MinIO access.

            STOR-02: Dataset files have cryptographically secure URLs with expiration
            SEC-03: Dataset access restricted to notebook owner and viewers

            Args:
                bucket: S3 bucket name
                key: S3 object key (e.g., 'datasets/user_123/data.csv')
                expiration: URL validity in seconds (default 300 = 5 minutes)

            Returns:
                Presigned URL string

            Raises:
                ClientError: If URL generation fails
            """
            try:
                url = self.s3_client.generate_presigned_url(
                    'get_object',
                    Params={'Bucket': bucket, 'Key': key},
                    ExpiresIn=expiration
                )
                return url
            except ClientError as e:
                logger.error(f"Failed to generate presigned URL: {e}")
                raise Exception(f"Failed to generate presigned URL: {e}")

        def generate_presigned_post(
            self,
            bucket: str,
            key: str,
            fields: Optional[dict] = None,
            conditions: Optional[list] = None,
            expiration: int = 1800
        ) -> dict:
            """
            Generate a presigned POST URL for direct browser uploads.

            Args:
                bucket: S3 bucket name
                key: S3 object key
                fields: Form fields to include in the upload
                conditions: Conditions for the upload (e.g., content-type, max-size)
                expiration: URL validity in seconds (default 1800 = 30 minutes)

            Returns:
                Dict with 'url' and 'fields' for form POST
            """
            try:
                response = self.s3_client.generate_presigned_post(
                    Bucket=bucket,
                    Key=key,
                    Fields=fields or {},
                    Conditions=conditions or [],
                    ExpiresIn=expiration
                )
                return response
            except ClientError as e:
                logger.error(f"Failed to generate presigned POST: {e}")
                raise Exception(f"Failed to generate presigned POST: {e}")

        def delete_object(self, bucket: str, key: str) -> None:
            """
            Delete an object from S3/MinIO.

            Args:
                bucket: S3 bucket name
                key: S3 object key
            """
            try:
                self.s3_client.delete_object(Bucket=bucket, Key=key)
            except ClientError as e:
                logger.error(f"Failed to delete object: {e}")
                raise Exception(f"Failed to delete object: {e}")

        def check_bucket_exists(self, bucket: str) -> bool:
            """
            Check if a bucket exists.

            Args:
                bucket: S3 bucket name

            Returns:
                True if bucket exists, False otherwise
            """
            try:
                self.s3_client.head_bucket(Bucket=bucket)
                return True
            except ClientError:
                return False
    ```
  </action>
  <verify>
    <automated>python -c "from app.services.storage_service import StorageService; s = StorageService(); print('StorageService initialized:', hasattr(s, 'upload_file'))" && grep -q "def generate_presigned_url" backend/app/services/storage_service.py && echo "StorageService created"</automated>
  </verify>
  <done>
    - StorageService created with boto3 S3 client
    - upload_file method for local file uploads with ServerSideEncryption (SEC-07)
    - upload_fileobj method for streaming uploads
    - generate_presigned_url with 5-minute default expiration (STOR-02, SEC-03)
    - generate_presigned_post for direct browser uploads
    - delete_object for cleanup
    - check_bucket_exists for bucket validation
    - ClientError exception handling throughout
    - Logging configured for error tracking
  </done>
</task>

<task type="auto">
  <name>Task 3: Create Dataset schemas and DatasetService</name>
  <files>
    backend/app/schemas/dataset.py
    backend/app/services/dataset_service.py
  </files>
  <read_first>
    - backend/app/schemas/notebook.py (for schema pattern reference)
    - backend/app/services/notebook_service.py (for service pattern reference)
    - backend/app/services/storage_service.py (for storage operations)
  </read_first>
  <action>
    Create backend/app/schemas/dataset.py:
    ```python
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

        class Config:
            from_attributes = True


    class DatasetListResponse(BaseModel):
        """Response schema for list of user's datasets"""
        datasets: list[DatasetResponse]
        total: int
    ```

    Create backend/app/services/dataset_service.py:
    ```python
    import os
    import csv
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
            import time
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
    ```
  </action>
  <verify>
    <automated>python -c "from app.services.dataset_service import DatasetService; from app.schemas.dataset import DatasetResponse; print('Dataset service and schemas import successfully')"</automated>
  </verify>
  <done>
    - Dataset schemas created (DatasetCreateRequest, DatasetResponse, DatasetListResponse)
    - DatasetService created with upload_dataset, get_dataset, get_user_datasets, generate_download_url, delete_dataset methods
    - File type validation (CSV only) per NOTE-03
    - File size validation (100MB limit per MAX_DATASET_SIZE_MB)
    - Unique S3 key generation with user_id and timestamp
    - Streaming upload via upload_fileobj
    - Optional row counting for CSV preview
    - Ownership verification for access (SEC-03)
    - 5-minute presigned URL expiration (STOR-02)
    - Graceful handling of storage deletion failures
  </done>
</task>

</tasks>

<verification>
- Dataset model exists with s3_key, file_size_bytes, row_count fields
- StorageService can upload files and generate presigned URLs
- DatasetService validates CSV files and 100MB size limit
- Presigned URLs expire after 5 minutes (STOR-02)
- Server-side encryption enabled for uploads (SEC-07)
- Ownership check prevents cross-user access (SEC-03)
- Migration 003 created for datasets table
</verification>

<success_criteria>
- Dataset model imports successfully
- StorageService initializes with boto3 client
- DatasetService validates CSV files only
- File size limit enforced (100MB)
- Presigned URL generation uses 5-minute expiration
- Ownership verification prevents unauthorized access
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-01B-SUMMARY.md`
</output>
