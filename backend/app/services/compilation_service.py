"""
Compilation orchestration service.

NOTE-04: User can compile notebooks in isolated online containers
INFRA-06: Celery manages async notebook compilation tasks
STOR-06: Static assets optimized for delivery
"""
from sqlalchemy.orm import Session
from typing import Optional, Tuple
import os
from app.models.notebook import Notebook
from app.core.container import ContainerExecutor
from app.services.storage_service import StorageService
from app.core.config import settings
import logging
from PIL import Image
import io
import re
import base64

logger = logging.getLogger(__name__)


class CompilationService:
    """
    Orchestrates notebook compilation workflow.

    1. Retrieves notebook from database
    2. Downloads dataset from S3 (if provided)
    3. Executes notebook in container
    4. Uploads output to S3/MinIO
    5. Returns CDN URL

    NOTE-04: User can compile notebooks in isolated online containers
    INFRA-06: Celery manages async compilation tasks
    """

    def __init__(self, db: Session):
        self.db = db
        self.executor = ContainerExecutor()
        self.storage = StorageService()

    def _optimize_html_images(self, html_content: str) -> Tuple[str, int]:
        """
        Optimize embedded images in notebook HTML output.

        Finds base64-encoded images, converts them to optimized format,
        and returns updated HTML with size savings.

        Args:
            html_content: Original HTML from nbconvert

        Returns:
            Tuple of (optimized_html, bytes_saved)
        """
        # Pattern to find base64-encoded images (PNG, JPEG)
        # Matches: src="data:image/png;base64,iVBORw0KG..."
        pattern = r'src="(data:image/(png|jpeg|jpg);base64,([A-Za-z0-9+/=]+))"'

        total_saved = 0

        def optimize_image(match):
            nonlocal total_saved
            data_uri = match.group(1)
            img_type = match.group(2)
            base64_data = match.group(3)

            try:
                # Decode base64
                img_data = base64.b64decode(base64_data)
                original_size = len(img_data)

                # Open with Pillow
                img = Image.open(io.BytesIO(img_data))

                # Convert to RGB if necessary (for JPEG)
                if img.mode in ('RGBA', 'LA', 'P'):
                    # Create white background for transparency
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    if img.mode == 'P':
                        img = img.convert('RGBA')
                    background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
                    img = background

                # Resize if too large (max 2048px on longest side)
                max_dimension = 2048
                if max(img.size) > max_dimension:
                    img.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)

                # Save as WebP if JPEG-like, otherwise PNG
                output = io.BytesIO()
                if img_type in ('jpeg', 'jpg'):
                    img.save(output, format='WEBP', quality=85, method=6)
                else:
                    # For PNG-like images with transparency
                    if img.mode == 'RGBA':
                        img.save(output, format='WEBP', quality=85, method=6, lossless=False)
                    else:
                        img.save(output, format='PNG', optimize=True)

                optimized_data = output.getvalue()
                optimized_size = len(optimized_data)
                saved = original_size - optimized_size
                total_saved += saved

                # Re-encode as base64
                optimized_base64 = base64.b64encode(optimized_data).decode('ascii')

                # Always use WebP for optimized images
                return f'src="data:image/webp;base64,{optimized_base64}"'

            except Exception as e:
                logger.warning(f"Failed to optimize image: {e}")
                # Return original if optimization fails
                return match.group(0)

        # Replace all images with optimized versions
        optimized_html = re.sub(pattern, optimize_image, html_content)

        logger.info(f"Image optimization saved {total_saved} bytes")
        return optimized_html, total_saved

    def _check_output_size(self, html_content: str, max_size_mb: int = 10) -> bool:
        """
        Check if output HTML size is within limits.

        Args:
            html_content: HTML content
            max_size_mb: Maximum size in megabytes

        Returns:
            True if size is acceptable, False otherwise
        """
        size_bytes = len(html_content.encode('utf-8'))
        max_bytes = max_size_mb * 1024 * 1024
        return size_bytes <= max_bytes

    def compile_notebook(
        self,
        notebook_id: int,
        dataset_id: Optional[int] = None,
        output_dir: str = "/tmp/notebooks"
    ) -> dict:
        """
        Compile a notebook and upload output to storage.

        Args:
            notebook_id: ID of notebook to compile
            dataset_id: Optional dataset ID to mount in container
            output_dir: Directory for temporary output files

        Returns:
            Dict with compilation result:
            - status: 'success' or 'failed'
            - notebook_id: ID of compiled notebook
            - output_url: CDN/presigned URL of compiled output
            - output_key: S3 key of output (if success)
            - error: Error message (if failed)
        """
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Get notebook from database
        notebook = self.db.query(Notebook).filter(Notebook.id == notebook_id).first()
        if not notebook:
            return {
                'status': 'failed',
                'notebook_id': notebook_id,
                'error': 'Notebook not found'
            }

        # Build notebook data structure
        notebook_data = {
            'id': notebook.id,
            'title': notebook.title,
            'cells': [
                {
                    'cell_type': cell.cell_type,
                    'content': cell.content,
                    'order_index': cell.order_index
                }
                for cell in notebook.cells
            ]
        }

        # Download dataset if provided (TODO: implement in future plan)
        dataset_path = None
        if dataset_id:
            logger.info(f"Dataset {dataset_id} requested - TODO: download from S3")

        # Execute notebook in container
        try:
            success, result, error = self.executor.execute_notebook_to_file(
                notebook_data=notebook_data,
                output_dir=output_dir,
                dataset_path=dataset_path,
                timeout=300  # 5 minutes (SEC-02)
            )

            # Cleanup dataset temp file if exists
            if dataset_path and os.path.exists(dataset_path):
                os.unlink(dataset_path)

            if not success:
                return {
                    'status': 'failed',
                    'notebook_id': notebook_id,
                    'error': error or 'Unknown execution error'
                }

            output_file = result  # result is the output file path on success

            # Upload output to S3/MinIO
            output_key = self._upload_output(output_file, notebook_id)

            # Generate URL for output
            output_url = self._generate_output_url(output_key)

            logger.info(f"Notebook {notebook_id} compiled successfully, output at {output_url}")

            return {
                'status': 'success',
                'notebook_id': notebook_id,
                'output_url': output_url,
                'output_key': output_key
            }

        except Exception as e:
            logger.error(f"Compilation failed for notebook {notebook_id}: {str(e)}")
            return {
                'status': 'failed',
                'notebook_id': notebook_id,
                'error': str(e)
            }

    def _upload_output(self, output_file: str, notebook_id: int) -> str:
        """
        Upload notebook output HTML to S3/MinIO with image optimization.

        STOR-03: Pre-rendered notebook outputs stored in MinIO/S3
        STOR-06: Static assets optimized for delivery
        SEC-07: Server-side encryption enabled

        Args:
            output_file: Path to output HTML file
            notebook_id: Notebook ID

        Returns:
            S3 key of uploaded output
        """
        import time
        timestamp = int(time.time())
        key = f'notebooks/{notebook_id}/v{timestamp}/output.html'

        try:
            # Read and optimize HTML
            with open(output_file, 'r') as f:
                html_content = f.read()

            # Optimize embedded images (STOR-06)
            optimized_html, bytes_saved = self._optimize_html_images(html_content)

            # Check output size limit
            if not self._check_output_size(optimized_html):
                logger.warning(f"Notebook {notebook_id} output exceeds size limit")

            # Write optimized content back to file
            with open(output_file, 'w') as f:
                f.write(optimized_html)

            # Upload via StorageService
            self.storage.upload_file(
                file_path=output_file,
                bucket=settings.NOTEBOOKS_BUCKET,
                key=key,
                content_type='text/html'
            )

            # Cleanup local output file
            if os.path.exists(output_file):
                os.unlink(output_file)

            return key

        except Exception as e:
            logger.error(f"Failed to upload output for notebook {notebook_id}: {e}")
            raise

    def _generate_output_url(self, output_key: str) -> str:
        """
        Generate URL for notebook output.

        Production: CloudFront URL (cached, public)
        Development: Presigned MinIO URL (1 hour expiry)

        VIEW-03: Outputs served via CDN for performance

        Args:
            output_key: S3 key of output file

        Returns:
            URL to access output
        """
        # Production: CloudFront URL
        if settings.CLOUDFRONT_DOMAIN:
            return f"{settings.CLOUDFRONT_DOMAIN}/{output_key}"
        # Development: presigned URL
        else:
            return self.storage.generate_presigned_url(
                bucket=settings.NOTEBOOKS_BUCKET,
                key=output_key,
                expiration=3600  # 1 hour for dev
            )
