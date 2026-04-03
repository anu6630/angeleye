"""
Compilation orchestration service.

NOTE-04: User can compile notebooks in isolated online containers
INFRA-06: Celery manages async notebook compilation tasks
"""
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from typing import Optional
import os
from app.models.notebook import Notebook
from app.core.config import settings
from app.services.storage_service import StorageService
from app.services.cdn_service import CDNService
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
        self.storage = StorageService()
        self.cdn = CDNService()

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

        # STUB: Container execution will be implemented when ContainerExecutor is available
        # For now, we'll create a minimal HTML output
        try:
            # Generate HTML output (stub implementation)
            html_content = self._generate_stub_html(notebook_data)

            # Upload output via CDN service
            import time
            version = str(int(time.time()))
            output_key = self.cdn.upload_html(
                html_content=html_content,
                notebook_id=notebook_id,
                version=version
            )

            # Generate URL for output
            output_url = self.cdn.get_output_url(output_key)

            # Update notebook with output metadata
            notebook.output_s3_key = output_key
            notebook.output_version = output_key.split('/')[-2]  # Extract version from key
            notebook.output_url = output_url
            notebook.compiled_at = func.now()
            self.db.commit()

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

    def _generate_stub_html(self, notebook_data: dict) -> str:
        """
        Generate stub HTML output for notebook.

        This is a temporary stub until ContainerExecutor is implemented.
        """
        cells_html = ""
        for cell in notebook_data['cells']:
            if cell['cell_type'] == 'code':
                cells_html += f'<div class="code-cell"><pre>{cell["content"]}</pre></div>\n'
            else:
                cells_html += f'<div class="markdown-cell"><p>{cell["content"]}</p></div>\n'

        return f"""<!DOCTYPE html>
<html>
<head>
    <title>{notebook_data['title']}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .code-cell {{ background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }}
        .markdown-cell {{ margin: 10px 0; }}
        pre {{ white-space: pre-wrap; }}
    </style>
</head>
<body>
    <h1>{notebook_data['title']}</h1>
    {cells_html}
</body>
</html>"""
