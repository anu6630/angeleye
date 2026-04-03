"""
Tests for CDNService.

STOR-04: Pre-rendered outputs served via CloudFront CDN
STOR-05: CDN cache invalidated when notebook updated
"""
import pytest
from unittest.mock import MagicMock, patch

pytestmark = pytest.mark.unit


class TestCDNService:
    """Test CDN operations."""

    def test_cdn_service_initialization(self):
        """Test CDNService initializes without CloudFront in dev."""
        from app.services.cdn_service import CDNService

        with patch("app.services.cdn_service.boto3.client") as mock_boto:
            mock_boto.return_value = None  # No CloudFront configured

            service = CDNService()

            assert service.storage is not None
            assert service.cloudfront is None

    def test_upload_html(self, temp_dir):
        """Test HTML upload to S3/MinIO."""
        from app.services.cdn_service import CDNService

        with patch("app.services.cdn_service.StorageService") as mock_storage_class:
            mock_storage = MagicMock()
            mock_storage_class.return_value = mock_storage

            service = CDNService()

            # Create test HTML
            html_content = "<html><body>Test</body></html>"
            key = service.upload_html(html_content, notebook_id=1, version="v123")

            assert "notebooks/1" in key
            assert "v123" in key

    def test_invalidate_notebook_no_cloudfront(self):
        """Test that invalidation skips gracefully without CloudFront."""
        from app.services.cdn_service import CDNService

        with patch("app.services.cdn_service.boto3.client") as mock_boto:
            mock_boto.return_value = None

            service = CDNService()
            result = service.invalidate_notebook(1)

            # Should return None without error in dev mode
            assert result is None

    def test_get_output_url_development(self):
        """Test output URL generation in development (presigned URL)."""
        from app.services.cdn_service import CDNService

        with patch("app.services.cdn_service.StorageService") as mock_storage_class:
            mock_storage = MagicMock()
            mock_storage.generate_presigned_url.return_value = "https://minio/presigned"
            mock_storage_class.return_value = mock_storage

            with patch("app.services.cdn_service.settings") as mock_settings:
                mock_settings.CLOUDFRONT_DOMAIN = ""
                mock_settings.NOTEBOOKS_BUCKET = "notebooks"

                service = CDNService()
                url = service.get_output_url("notebooks/1/v123/output.html")

                assert url == "https://minio/presigned"
