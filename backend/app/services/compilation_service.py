"""
Compilation orchestration service.

NOTE-04: User can compile notebooks in isolated online containers
INFRA-06: Celery manages async notebook compilation tasks
STOR-06: Static assets optimized for delivery
"""
from sqlalchemy.orm import Session
from typing import Optional, Tuple
import os
import shutil
import tempfile
from app.models.notebook import Notebook
from app.models.dataset import Dataset
from app.core.container import ContainerExecutor
from app.services.storage_service import StorageService
from app.services.dataset_service import DatasetService
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
        self.dataset_service = DatasetService(db)

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

    def _inline_local_assets(
        self,
        html_content: str,
        asset_paths: list,
        asset_filenames: list,
    ) -> str:
        """
        Replace bare relative <img src="filename"> references with data: URIs.

        nbconvert leaves Markdown ![](file.png) and HTML <img src="file.png"> as
        relative paths in the output HTML.  Because we render the HTML inside an
        iframe via srcDoc and lock down loads with CSP "img-src 'self' data:",
        relative references can never resolve.  Inlining each known local asset
        as a data URI makes Markdown + HTML methods work alongside the
        IPython.display path which already auto-embeds.

        Args:
            html_content: Rendered HTML from nbconvert
            asset_paths: Local filesystem paths of uploaded assets
            asset_filenames: Original filenames matching asset_paths

        Returns:
            HTML with local asset references replaced by data: URIs
        """
        if not asset_paths:
            return html_content

        import mimetypes
        import re as _re

        for src_path, original_name in zip(asset_paths, asset_filenames):
            if not original_name or not src_path or not os.path.exists(src_path):
                continue
            mime, _ = mimetypes.guess_type(original_name)
            if not mime or not mime.startswith('image/'):
                continue  # Only inline image assets; CSV etc. should never appear in <img>
            try:
                with open(src_path, 'rb') as f:
                    encoded = base64.b64encode(f.read()).decode('ascii')
            except Exception as e:
                logger.warning(f"Could not inline asset {original_name}: {e}")
                continue
            data_uri = f'data:{mime};base64,{encoded}'
            # Match src="filename" or src='filename' with the exact basename only.
            # Use the original (unsafe) name from the user; basename was already
            # enforced upstream, but escape regex metacharacters defensively.
            escaped = _re.escape(original_name)
            patterns = [
                _re.compile(rf'src="{escaped}"'),
                _re.compile(rf"src='{escaped}'"),
            ]
            replacements = 0
            for pat in patterns:
                html_content, n = pat.subn(f'src="{data_uri}"', html_content)
                replacements += n
            logger.info(f"Inlined asset '{original_name}' into {replacements} <img> tag(s)")

        return html_content

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
        user_id: Optional[int] = None,
        output_dir: str = "/tmp/notebooks",
        dataset_ids: Optional[list] = None,
    ) -> dict:
        """
        Compile a notebook and upload output to storage.

        Args:
            notebook_id: ID of notebook to compile
            dataset_id: Legacy single asset ID to mount in container
            user_id: ID of the requesting user (for asset ownership check)
            output_dir: Directory for temporary output files
            dataset_ids: Optional list of asset IDs to mount (datasets/images)

        Returns:
            Dict with compilation result:
            - status: 'success' or 'failed'
            - notebook_id: ID of compiled notebook
            - output_url: CDN/presigned URL of compiled output
            - output_key: S3 key of output (if success)
            - error: Error message (if failed)
        """
        os.makedirs(output_dir, exist_ok=True)

        notebook = self.db.query(Notebook).filter(Notebook.id == notebook_id).first()
        if not notebook:
            return {
                'status': 'failed',
                'notebook_id': notebook_id,
                'error': 'Notebook not found'
            }

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

        # Resolve asset id list (merge legacy single + new list, dedup, preserve order)
        resolved_ids: list = []
        seen: set = set()
        if dataset_id is not None:
            resolved_ids.append(dataset_id)
            seen.add(dataset_id)
        for did in (dataset_ids or []):
            if did not in seen:
                resolved_ids.append(did)
                seen.add(did)

        # Download every asset from S3 into a single shared temp dir for container mounting
        dataset_paths: list[str] = []
        dataset_filenames: list[str] = []
        dataset_tmp_dir: Optional[str] = None
        if resolved_ids:
            try:
                dataset_tmp_dir = tempfile.mkdtemp(prefix="nb_dataset_")
                for did in resolved_ids:
                    p, fname = self.dataset_service.download_for_compilation(
                        dataset_id=did,
                        user_id=user_id or notebook.user_id,
                        dest_dir=dataset_tmp_dir,
                    )
                    dataset_paths.append(p)
                    dataset_filenames.append(fname)
                    logger.info(f"Asset {did} ready at {p} (filename: {fname})")
            except Exception as e:
                logger.error(f"Failed to download assets {resolved_ids}: {e}")
                if dataset_tmp_dir and os.path.exists(dataset_tmp_dir):
                    shutil.rmtree(dataset_tmp_dir, ignore_errors=True)
                return {
                    'status': 'failed',
                    'notebook_id': notebook_id,
                    'error': f"Could not load asset: {e}"
                }

        try:
            success, result, error = self.executor.execute_notebook_to_file(
                notebook_data=notebook_data,
                output_dir=output_dir,
                dataset_paths=dataset_paths,
                dataset_filenames=dataset_filenames,
                timeout=300  # 5 minutes (SEC-02)
            )

            if not success:
                if dataset_tmp_dir and os.path.exists(dataset_tmp_dir):
                    shutil.rmtree(dataset_tmp_dir, ignore_errors=True)
                return {
                    'status': 'failed',
                    'notebook_id': notebook_id,
                    'error': error or 'Unknown execution error'
                }

            output_file = result  # result is the output file path on success

            # Validate that the output file actually exists on the filesystem
            if not os.path.exists(output_file):
                logger.error(f"Output file {output_file} was not found after container execution")
                if dataset_tmp_dir and os.path.exists(dataset_tmp_dir):
                    shutil.rmtree(dataset_tmp_dir, ignore_errors=True)
                return {
                    'status': 'failed',
                    'notebook_id': notebook_id,
                    'error': f"Output file not generated: {output_file}"
                }

            # Inline local image assets into data URIs while we still have the
            # source files available (asset tmp dir is deleted right after).
            if dataset_paths:
                try:
                    with open(output_file, 'r') as f:
                        html_pre = f.read()
                    html_post = self._inline_local_assets(html_pre, dataset_paths, dataset_filenames)
                    if html_post != html_pre:
                        with open(output_file, 'w') as f:
                            f.write(html_post)
                except Exception as e:
                    logger.warning(f"Asset inlining step failed (continuing): {e}")

            # Now safe to remove the temp asset dir
            if dataset_tmp_dir and os.path.exists(dataset_tmp_dir):
                shutil.rmtree(dataset_tmp_dir, ignore_errors=True)

            # Ensure buckets exist before uploading (INFRA-08)
            self.storage.ensure_bucket_exists(settings.NOTEBOOKS_BUCKET)

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

            # SEC: block external image loads at view time. Allow same-origin and
            # data: URIs so matplotlib base64 charts and locally-uploaded assets
            # (embedded as data: by nbconvert / IPython.display) keep rendering.
            csp_meta = (
                '<meta http-equiv="Content-Security-Policy" '
                "content=\"img-src 'self' data:;\">"
            )
            if '<head>' in optimized_html:
                optimized_html = optimized_html.replace('<head>', f'<head>{csp_meta}', 1)
            else:
                optimized_html = f'{csp_meta}\n{optimized_html}'

            # Enforce output size limit
            if not self._check_output_size(optimized_html):
                size_mb = len(optimized_html.encode('utf-8')) / (1024 * 1024)
                raise ValueError(
                    f"Notebook output is {size_mb:.1f}MB, which exceeds the 10MB limit. "
                    "Reduce the number of plots or use lower-resolution figures."
                )

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
