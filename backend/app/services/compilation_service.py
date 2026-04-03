"""
Compilation orchestration service.

NOTE-04: User can compile notebooks in isolated online containers
INFRA-06: Celery manages async notebook compilation tasks
"""
from sqlalchemy.orm import Session
from typing import Optional
import os
from app.models.notebook import Notebook
from app.core.container import ContainerExecutor
from app.services.storage_service import StorageService
from app.core.config import settings
import logging

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
        Upload notebook output HTML to S3/MinIO.

        STOR-03: Pre-rendered notebook outputs stored in MinIO/S3
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
