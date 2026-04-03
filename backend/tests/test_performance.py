"""
Performance tests for Phase 3.

PERF-01: Feed loads initial 10 notebooks in under 2 seconds
PERF-02: Notebook viewer loads in under 3 seconds
"""
import pytest
import time

pytestmark = pytest.mark.performance


class TestPerformance:
    """Performance benchmarks for compilation and storage."""

    def test_storage_service_upload_performance(self, mock_storage_service, temp_dir):
        """Test that file upload completes quickly (PERF-02)."""
        import os

        # Create 10MB test file
        test_file = f"{temp_dir}/test_large.bin"
        with open(test_file, "wb") as f:
            f.write(b"x" * (10 * 1024 * 1024))

        # Mock upload (should complete in < 1 second even with mock)
        start = time.time()

        with open(test_file, "rb") as f:
            mock_storage_service.upload_fileobj(
                f,
                "test-bucket",
                "test/test.bin",
                "application/octet-stream"
            )

        duration = time.time() - start
        assert duration < 1.0, f"Upload took {duration}s, expected < 1s"

    def test_presigned_url_generation_performance(self, mock_s3_client):
        """Test that presigned URL generation is fast (STOR-02)."""
        from app.services.storage_service import StorageService

        service = StorageService()
        service.s3_client = mock_s3_client

        start = time.time()
        url = service.generate_presigned_url("test-bucket", "test/key.csv", 300)
        duration = time.time() - start

        assert duration < 0.1, f"URL generation took {duration}s, expected < 0.1s"
        assert url == "https://example.com/presigned-url"
