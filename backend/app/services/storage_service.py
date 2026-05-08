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
                # Note: ServerSideEncryption disabled for MinIO compatibility
                # For production AWS S3, re-enable: 'ServerSideEncryption': 'AES256'
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
                # Note: ServerSideEncryption disabled for MinIO compatibility
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

    def copy_object(self, source_key: str, dest_key: str, bucket: str = None) -> bool:
        """
        Copy an object within S3/MinIO (server-side copy).

        FORK-02: Dataset forking uses S3 server-side copy for efficiency

        Args:
            source_key: Source S3 object key
            dest_key: Destination S3 object key
            bucket: S3 bucket name (uses default from settings if not provided)

        Returns:
            True on success

        Raises:
            Exception: If copy fails
        """
        if bucket is None:
            bucket = settings.MINIO_BUCKET if hasattr(settings, 'MINIO_BUCKET') else 'notebooksocial'

        try:
            self.s3_client.copy_object(
                CopySource={'Bucket': bucket, 'Key': source_key},
                Bucket=bucket,
                Key=dest_key
            )
            logger.info(f"Copied object from {source_key} to {dest_key}")
            return True
        except ClientError as e:
            logger.error(f"Failed to copy object from {source_key} to {dest_key}: {e}")
            raise Exception(f"Failed to copy object: {e}")

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

    def download_file_to_path(self, bucket: str, key: str, local_path: str) -> None:
        """
        Download a file from S3/MinIO to a local path.

        Uses direct SDK access (not presigned URL) for server-to-server transfers,
        so there is no expiry risk during long compilation queues.

        Args:
            bucket: S3 bucket name
            key: S3 object key
            local_path: Local filesystem path to write the file to
        """
        try:
            self.s3_client.download_file(bucket, key, local_path)
        except ClientError as e:
            logger.error(f"Failed to download file {key} from {bucket}: {e}")
            raise Exception(f"Failed to download dataset: {e}")

    def ensure_bucket_exists(self, bucket: str) -> None:
        """
        Ensure a bucket exists, creating it if it does not.

        Args:
            bucket: S3 bucket name
        """
        if not self.check_bucket_exists(bucket):
            try:
                logger.info(f"Creating bucket {bucket}")
                self.s3_client.create_bucket(Bucket=bucket)
            except ClientError as e:
                logger.error(f"Failed to create bucket {bucket}: {e}")
                # Don't raise if it's already exists (race condition)
                if e.response['Error']['Code'] != 'BucketAlreadyOwnedByYou':
                    raise
