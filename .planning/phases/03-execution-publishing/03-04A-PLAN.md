---
phase: 03-execution-publishing
plan: 04A
type: execute
wave: 3
depends_on: ["03-03B"]
files_modified:
  - backend/app/services/cdn_service.py
  - backend/app/models/notebook.py
  - backend/alembic/versions/004_add_notebook_output_fields.py
  - backend/app/services/compilation_service.py
autonomous: true
requirements:
  - NOTE-05
  - VIEW-03
  - STOR-03
  - STOR-04
  - STOR-05
  - PERF-01
  - PERF-02

must_haves:
  truths:
    - "CDNService uploads HTML to S3/MinIO with versioned keys"
    - "CDNService returns CloudFront URL in production, presigned URL in development"
    - "CDNService handles missing CLOUDFRONT_DISTRIBUTION_ID gracefully"
    - "Notebook model has output_s3_key, output_version, output_url, compiled_at fields"
    - "CompilationService updates notebook metadata after successful compilation"
  artifacts:
    - path: "backend/app/services/cdn_service.py"
      provides: "CDN and cache invalidation service"
      exports: ["CDNService", "upload_html", "get_output_url", "invalidate_notebook"]
      min_lines: 100
    - path: "backend/app/models/notebook.py"
      provides: "Notebook model with output fields"
      contains: "output_s3_key"
      min_lines: 50
  key_links:
    - from: "backend/app/services/compilation_service.py"
      to: "backend/app/services/cdn_service.py"
      via: "CDNService for output URL generation"
      pattern: "self\\.cdn\\.get_output_url|self\\.cdn\\.upload_html"
    - from: "backend/app/services/cdn_service.py"
      to: "MinIO/S3"
      via: "StorageService for HTML uploads"
      pattern: "self\\.storage\\.upload_file"

---

# Phase 03-04A: CDN Service and Notebook Output Storage

<objective>
Create CDNService for uploading notebook outputs to S3/MinIO with versioned URLs, cache invalidation support, and CloudFront integration. Add output metadata fields to Notebook model and update CompilationService to store results.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/03-execution-publishing/03-RESEARCH.md
@backend/app/services/storage_service.py (for StorageService)
@backend/app/core/config.py (for CDN settings)
@backend/app/models/notebook.py (existing model)

## Publishing Workflow Part 1

1. Task executes notebook in container (Plan 03-03B)
2. Output HTML uploaded to S3/MinIO with versioned key
3. Task returns CDN/presigned URL
4. Notebook metadata updated with output information
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create CDNService for S3 upload and cache invalidation</name>
  <files>
    backend/app/services/cdn_service.py
  </files>
  <read_first>
    - backend/app/services/storage_service.py (for StorageService)
    - backend/app/core/config.py (for CDN settings)
  </read_first>
  <action>
    Create backend/app/services/cdn_service.py:
    ```python
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
    ```
  </action>
  <verify>
    <automated>python -c "from app.services.cdn_service import CDNService; c = CDNService(); print('CDNService initialized:', hasattr(c, 'upload_html'))"</automated>
  </verify>
  <done>
    - CDNService created with StorageService integration
    - upload_html uploads HTML to S3/MinIO with versioned key (notebooks/{id}/{version}/output.html)
    - get_output_url returns CloudFront URL (prod) or presigned URL (dev)
    - invalidate_notebook creates CloudFront invalidation for notebook paths
    - batch_invalidate invalidates multiple notebooks (up to 1000)
    - Graceful handling when CloudFront not configured (dev mode)
    - CDNService handles missing CLOUDFRONT_DISTRIBUTION_ID gracefully with try/except
  </done>
</task>

<task type="auto">
  <name>Task 2: Update Notebook model with output fields and CompilationService</name>
  <files>
    backend/app/models/notebook.py
    backend/alembic/versions/004_add_notebook_output_fields.py
    backend/app/services/compilation_service.py
  </files>
  <read_first>
    - backend/app/models/notebook.py (existing model)
    - backend/alembic/versions (for migration pattern)
    - backend/app/services/compilation_service.py (to update with metadata storage)
  </read_first>
  <action>
    Update backend/app/models/notebook.py to add output fields.

    Find the Notebook class and add these fields after `is_published`:
    ```python
    # Pre-rendered output (STOR-03: outputs stored in S3/MinIO, VIEW-03: served via CDN)
    output_s3_key = Column(String(500), nullable=True)  # S3 key of latest output
    output_version = Column(String(50), nullable=True)  # Version timestamp
    output_url = Column(Text, nullable=True)  # Public CDN URL
    compiled_at = Column(DateTime(timezone=True), nullable=True)  # Last compilation time
    ```

    Create migration backend/alembic/versions/004_add_notebook_output_fields.py:
    ```python
    """add notebook output fields

    Revision ID: 004
    Revises: 003
    Create Date: 2026-04-04

    """
    from alembic import op
    import sqlalchemy as sa


    revision = '004'
    down_revision = '003'
    branch_labels = None
    depends_on = None


    def upgrade():
        op.add_column('notebooks', sa.Column('output_s3_key', sa.String(length=500), nullable=True))
        op.add_column('notebooks', sa.Column('output_version', sa.String(length=50), nullable=True))
        op.add_column('notebooks', sa.Column('output_url', sa.Text(), nullable=True))
        op.add_column('notebooks', sa.Column('compiled_at', sa.DateTime(timezone=True), nullable=True))


    def downgrade():
        op.drop_column('notebooks', 'compiled_at')
        op.drop_column('notebooks', 'output_url')
        op.drop_column('notebooks', 'output_version')
        op.drop_column('notebooks', 'output_s3_key')
    ```

    Update backend/app/services/compilation_service.py to:
    1. Add import at top: `from sqlalchemy.sql import func`
    2. Update the success case in compile_notebook method (before the return statement):
    Find the line `logger.info(f"Notebook {notebook_id} compiled successfully, output at {output_url}")` and add before it:
    ```python
                # Update notebook with output metadata
                notebook.output_s3_key = output_key
                notebook.output_version = key.split('/')[-2]  # Extract version from key
                notebook.output_url = output_url
                notebook.compiled_at = func.now()
                self.db.commit()
    ```
  </action>
  <verify>
    <automated>grep -q "output_s3_key" backend/app/models/notebook.py && grep -q "notebook.output_s3_key = output_key" backend/app/services/compilation_service.py && grep -q "from sqlalchemy.sql import func" backend/app/services/compilation_service.py && echo "Notebook model and CompilationService updated"</automated>
  </verify>
  <done>
    - Notebook model updated with output_s3_key, output_version, output_url, compiled_at fields
    - Migration 004 created for new fields
    - CompilationService updates notebook.output_s3_key after successful compilation
    - CompilationService updates notebook.output_version from S3 key
    - CompilationService updates notebook.output_url with CDN/presigned URL
    - CompilationService updates notebook.compiled_at timestamp using func.now()
    - sqlalchemy.sql.func imported for timestamp generation
  </done>
</task>

</tasks>

<verification>
- CDNService created with upload_html, get_output_url, invalidate_notebook methods
    - Notebook model has output_s3_key, output_version, output_url, compiled_at fields
    - Migration 004 created
    - CompilationService updates notebook metadata after compilation
    - CDNService handles missing CLOUDFRONT_DISTRIBUTION_ID gracefully
</verification>

<success_criteria>
- CDNService can upload HTML to S3/MinIO with versioned keys
- Output URLs return CloudFront URL (prod) or presigned URL (dev)
- Cache invalidation works when CloudFront is configured
- Compilation task stores output metadata on notebook model
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-04A-SUMMARY.md`
</output>
