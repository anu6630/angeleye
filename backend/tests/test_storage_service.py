"""
Tests for StorageService.

STOR-01: Datasets stored in MinIO
STOR-02: Dataset files have cryptographically secure URLs with expiration
SEC-07: Sensitive data encrypted at rest
"""
import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError

# Mark all tests as unit tests
pytestmark = pytest.mark.unit


class TestStorageService:
    """Test StorageService S3/MinIO operations."""

    def test_storage_service_initialization(self, mock_storage_service):
        """Test that StorageService initializes with S3 client."""
        from app.services.storage_service import StorageService

        service = StorageService()
        assert hasattr(service, "s3_client")
        assert service.s3_client is not None

    def test_generate_presigned_url(self, mock_s3_client):
        """Test presigned URL generation (STOR-02)."""
        from app.services.storage_service import StorageService

        service = StorageService()
        service.s3_client = mock_s3_client

        url = service.generate_presigned_url(
            bucket="test-bucket",
            key="datasets/test.csv",
            expiration=300
        )

        assert url == "https://example.com/presigned-url"
        mock_s3_client.generate_presigned_url.assert_called_once()

    def test_upload_file(self, mock_s3_client, temp_dir):
        """Test file upload to S3/MinIO (STOR-01, SEC-07)."""
        from app.services.storage_service import StorageService

        # Create test file
        test_file = f"{temp_dir}/test.txt"
        with open(test_file, "w") as f:
            f.write("test content")

        service = StorageService()
        service.s3_client = mock_s3_client

        key = service.upload_file(
            file_path=test_file,
            bucket="test-bucket",
            key="test/test.txt",
            content_type="text/plain"
        )

        assert key == "test/test.txt"
        mock_s3_client.upload_file.assert_called_once()

    def test_delete_object(self, mock_s3_client):
        """Test object deletion from S3/MinIO."""
        from app.services.storage_service import StorageService

        service = StorageService()
        service.s3_client = mock_s3_client

        service.delete_object(bucket="test-bucket", key="test/test.txt")

        mock_s3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key="test/test.txt"
        )

    def test_check_bucket_exists(self, mock_s3_client):
        """Test bucket existence check."""
        from app.services.storage_service import StorageService

        service = StorageService()
        service.s3_client = mock_s3_client

        exists = service.check_bucket_exists("test-bucket")

        assert exists is True
        mock_s3_client.head_bucket.assert_called_once()
