"""
CDN service for notebook output delivery and cache invalidation.

STOR-04: Pre-rendered outputs served via CloudFront CDN
STOR-05: CDN cache invalidated when notebook updated/deleted
VIEW-03: Notebook outputs served via CDN for performance
"""
import boto3
from typing import Optional
from app.core.config import settings
from app.services.storage_service import StorageService
import logging

logger = logging.getLogger(__name__)


class CDNService:
    """
    CDN service for notebook output delivery and cache invalidation.

    STOR-04: Pre-rendered outputs served via CloudFront CDN
    STOR-05: CDN cache invalidated when notebook updated/deleted
    VIEW-03: Notebook outputs served via CDN for performance

    In development: Uses MinIO with presigned URLs
    In production: Uses CloudFront CDN with S3 origin
    """

    def __init__(self):
        self.storage = StorageService()
        self.cloudfront = None

        # Initialize CloudFront client for production (STOR-04)
        # CDNService handles missing CLOUDFRONT_DISTRIBUTION_ID gracefully
        if settings.CLOUDFRONT_DISTRIBUTION_ID:
            try:
                self.cloudfront = boto3.client('cloudfront')
            except Exception as e:
                logger.warning(f"Failed to initialize CloudFront client: {e}")

    def upload_html(
        self,
        html_content: str,
        notebook_id: int,
        version: str
    ) -> str:
        """
        Upload notebook HTML output to S3/MinIO.

        Args:
            html_content: HTML content of rendered notebook
            notebook_id: Notebook ID
            version: Version string (e.g., timestamp)

        Returns:
            S3 key of uploaded output

        STOR-03: Pre-rendered notebook outputs stored in MinIO/S3
        """
        import tempfile
        import os

        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False) as f:
            f.write(html_content)
            temp_path = f.name

        try:
            # Generate versioned key (STOR-05: versioned URLs for cache busting)
            key = f'notebooks/{notebook_id}/{version}/output.html'

            # Upload via StorageService (uses server-side encryption per SEC-07)
            self.storage.upload_file(
                file_path=temp_path,
                bucket=settings.NOTEBOOKS_BUCKET,
                key=key,
                content_type='text/html'
            )

            logger.info(f"Uploaded notebook {notebook_id} output to {key}")
            return key

        finally:
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    def get_output_url(self, s3_key: str) -> str:
        """
        Get URL for notebook output.

        Production: CloudFront URL (cached, public)
        Development: Presigned MinIO URL (1 hour expiry)

        Args:
            s3_key: S3 key of output file

        Returns:
            URL to access output

        VIEW-03: Outputs served via CDN for performance
        """
        # Production: CloudFront URL
        if settings.CLOUDFRONT_DOMAIN:
            return f"{settings.CLOUDFRONT_DOMAIN}/{s3_key}"
        # Development: Presigned URL
        else:
            return self.storage.generate_presigned_url(
                bucket=settings.NOTEBOOKS_BUCKET,
                key=s3_key,
                expiration=3600  # 1 hour for dev
            )

    def invalidate_notebook(self, notebook_id: int, old_s3_key: Optional[str] = None) -> Optional[str]:
        """
        Invalidate CloudFront cache for a notebook.

        Args:
            notebook_id: Notebook ID
            old_s3_key: Old S3 key to invalidate (if updating)

        Returns:
            Invalidation ID (in production), None in development

        STOR-05: CDN cache invalidated when notebook updated/deleted
        """
        if not self.cloudfront:
            logger.info(f"Skipping cache invalidation for notebook {notebook_id} (no CloudFront configured)")
            return None

        try:
            import time

            # Invalidate all paths for this notebook
            paths = [f'/notebooks/{notebook_id}/*']

            # Also invalidate specific old version if provided
            if old_s3_key:
                paths.append(f'/{old_s3_key}')

            response = self.cloudfront.create_invalidation(
                DistributionId=settings.CLOUDFRONT_DISTRIBUTION_ID,
                InvalidationBatch={
                    'CallerReference': f'notebook-{notebook_id}-{int(time.time())}',
                    'Paths': {
                        'Quantity': len(paths),
                        'Items': paths
                    }
                }
            )

            invalidation_id = response['Invalidation']['Id']
            logger.info(f"Created CloudFront invalidation {invalidation_id} for notebook {notebook_id}")
            return invalidation_id

        except Exception as e:
            logger.error(f"Failed to create CloudFront invalidation for notebook {notebook_id}: {e}")
            # Don't fail publication if invalidation fails
            return None

    def batch_invalidate(self, notebook_ids: list[int]) -> Optional[str]:
        """
        Invalidate multiple notebooks in single request.

        Args:
            notebook_ids: List of notebook IDs

        Returns:
            Invalidation ID (in production), None in development
        """
        if not self.cloudfront:
            return None

        try:
            import time

            # CloudFront supports up to 1000 paths per invalidation
            paths = [f'/notebooks/{nid}/*' for nid in notebook_ids[:1000]]

            response = self.cloudfront.create_invalidation(
                DistributionId=settings.CLOUDFRONT_DISTRIBUTION_ID,
                InvalidationBatch={
                    'CallerReference': f'batch-{int(time.time())}',
                    'Paths': {
                        'Quantity': len(paths),
                        'Items': paths
                    }
                }
            )

            invalidation_id = response['Invalidation']['Id']
            logger.info(f"Created batch CloudFront invalidation {invalidation_id} for {len(notebook_ids)} notebooks")
            return invalidation_id

        except Exception as e:
            logger.error(f"Failed to create batch invalidation: {e}")
            return None
