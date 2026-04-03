"""
Tests for DatasetService.

NOTE-03: User can upload datasets (CSV files)
STOR-02: Dataset access restricted to notebook owner and viewers
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from fastapi import UploadFile, HTTPException
import io

pytestmark = pytest.mark.unit


class TestDatasetService:
    """Test dataset upload and management."""

    def test_upload_dataset_csv_success(self, db_session, test_user, sample_csv_file):
        """Test successful CSV dataset upload (NOTE-03)."""
        from app.services.dataset_service import DatasetService
        from app.models.dataset import Dataset

        service = DatasetService(db_session)

        # Create mock file
        file = MagicMock(spec=UploadFile)
        file.filename = "test_data.csv"
        file.file._file = open(sample_csv_file, "rb")
        file.file._file.seek(0)
        file.file.read.return_value = b"name,age,city\nAlice,30,NYC\n"

        with patch.object(service, "storage") as mock_storage:
            dataset = service.upload_dataset(file, test_user["id"])

        assert dataset.filename is not None
        assert dataset.original_filename == "test_data.csv"
        assert dataset.content_type == "text/csv"
        assert dataset.user_id == test_user["id"]
        file.file._file.close()

    def test_upload_dataset_invalid_format(self, db_session, test_user):
        """Test that non-CSV files are rejected."""
        from app.services.dataset_service import DatasetService

        service = DatasetService(db_session)

        file = MagicMock(spec=UploadFile)
        file.filename = "test.txt"

        with pytest.raises(HTTPException) as exc:
            service.upload_dataset(file, test_user["id"])

        assert exc.value.status_code == 400
        assert "Only CSV files" in str(exc.value.detail)

    def test_get_dataset_ownership_check(self, db_session, test_user):
        """Test that users can only access their own datasets (STOR-02, SEC-03)."""
        from app.services.dataset_service import DatasetService
        from app.models.dataset import Dataset

        service = DatasetService(db_session)

        # Create dataset for different user
        dataset = Dataset(
            user_id=999,  # Different user
            filename="other.csv",
            original_filename="other.csv",
            file_size_bytes=100,
            content_type="text/csv",
            s3_key="datasets/999/other.csv"
        )
        db_session.add(dataset)
        db_session.commit()

        # Try to access as test_user
        with pytest.raises(HTTPException) as exc:
            service.get_dataset(dataset.id, test_user["id"])

        assert exc.value.status_code == 403

    def test_generate_download_url_expiration(self, db_session, test_user, mock_storage_service):
        """Test that download URLs have expiration (STOR-02)."""
        from app.services.dataset_service import DatasetService
        from app.models.dataset import Dataset

        service = DatasetService(db_session)

        dataset = Dataset(
            user_id=test_user["id"],
            filename="test.csv",
            original_filename="test.csv",
            file_size_bytes=100,
            content_type="text/csv",
            s3_key="datasets/test.csv"
        )
        db_session.add(dataset)
        db_session.commit()

        with patch.object(service, "storage") as mock_storage:
            mock_storage.generate_presigned_url.return_value = "https://example.com/url"

            url = service.generate_download_url(dataset)

            assert url == "https://example.com/url"
            # Verify expiration parameter is 300 seconds (5 minutes)
            mock_storage.generate_presigned_url.assert_called_once()
            call_args = mock_storage.generate_presigned_url.call_args
            assert call_args[1]["expiration"] == 300
