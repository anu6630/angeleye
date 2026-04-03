# Phase 3: Execution & Publishing - Research

**Researched:** 2026-04-04
**Domain:** Container execution, storage, CDN integration, async task processing
**Confidence:** MEDIUM

## Summary

Phase 3 enables the core execution pipeline: users upload datasets, compile notebooks in isolated containers, and publish pre-rendered outputs to a CDN-served feed. This phase requires integrating multiple complex systems—Docker container execution, S3-compatible storage (MinIO/S3), CloudFront CDN, Celery task queues, and nbconvert for notebook rendering—all while maintaining strict security isolation and resource limits.

The primary technical challenge is executing untrusted Python code safely: containers must have enforced CPU/memory limits, timeout controls, non-root users, and network isolation. Additionally, dataset access requires cryptographically secure presigned URLs, and notebook outputs must be optimized for CDN delivery with proper cache invalidation strategies.

**Primary recommendation:** Use Docker Python SDK (docker-py 7.1.0) for container execution with explicit resource limits, Celery 5.6.3 for async compilation tasks, nbconvert 7.17.0 for HTML rendering, and boto3 1.42.83 for unified S3/MinIO operations with presigned URLs for secure dataset access.

## User Constraints (from CONTEXT.md)

> No CONTEXT.md exists for this phase. All decisions are at Claude's discretion based on ROADMAP.md and REQUIREMENTS.md.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTE-03 | User can upload datasets (CSV files) to support charts and data visualization | MinIO/S3 with presigned URLs, multipart upload support |
| NOTE-04 | User can compile notebooks in isolated online containers | Docker Python SDK with resource limits, timeout enforcement |
| NOTE-05 | User can publish pre-rendered notebook outputs to social feed | nbconvert HTML rendering, CDN integration, workflow orchestration |
| VIEW-03 | Notebook outputs served via CDN for performance | CloudFront distribution, S3 origin, cache headers |
| STOR-01 | Datasets stored in MinIO | MinIO Python SDK 7.2.20, S3-compatible API |
| STOR-02 | Dataset files have cryptographically secure URLs with expiration | boto3 generate_presigned_url with short TTL |
| STOR-03 | Pre-rendered notebook outputs stored in MinIO/S3 | boto3 multipart upload, versioned URLs |
| STOR-04 | Pre-rendered outputs served via CloudFront CDN | CloudFront distribution, S3 origin, cache optimization |
| STOR-05 | CDN cache invalidated when notebook updated/deleted | boto3 create_invalidation, batch invalidation |
| STOR-06 | Static assets optimized for delivery | Pillow 12.2.0 for image optimization, format conversion |
| INFRA-06 | Celery manages async notebook compilation tasks | Celery 5.6.3 with Redis broker, worker configuration |
| INFRA-07 | Containers have strict resource limits | Docker SDK mem_limit, cpu_quota, stop_timeout |
| SEC-01 | Notebook execution containers isolated | Non-root user, read-only filesystem, seccomp, no --privileged |
| SEC-02 | Container execution has timeout limits | Celery task_time_limit, Docker stop_timeout |
| SEC-03 | Dataset access restricted to notebook owner and viewers | Presigned URLs with expiration, bucket policies |
| SEC-07 | Sensitive data encrypted at rest | S3/MinIO server-side encryption, environment variables |
| PERF-01 | Feed loads initial 10 notebooks in under 2 seconds | CDN caching, Redis feed cache, query optimization |
| PERF-02 | Notebook viewer loads in under 3 seconds | CDN-served outputs, image lazy loading |
| PERF-04 | Images lazy-loaded and optimized | Next.js Image component, Pillow optimization |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **docker** | 7.1.0 | Docker Python SDK for container control | Official SDK, comprehensive API for container lifecycle, resource limits, volume mounts. Industry standard for programmatic Docker control. Verified latest: 7.1.0 |
| **nbconvert** | 7.17.0 | Jupyter notebook to HTML conversion | Jupyter official converter, supports embedded outputs, custom templates, multiple output formats. Verified latest: 7.17.0 |
| **celery** | 5.6.3 | Distributed task queue for async compilation | Python standard for background jobs, mature monitoring tools, Redis/RabbitMQ support. Verified latest: 5.6.3 |
| **boto3** | 1.42.83 | AWS SDK for S3/CloudFront operations | Official AWS SDK, handles presigned URLs, multipart upload, cache invalidation. Verified latest: 1.42.83 |
| **minio** | 7.2.20 | MinIO Python SDK for local S3-compatible storage | Drop-in S3-compatible API for local development, seamless AWS migration. Verified latest: 7.2.20 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **redis** | 5.2.1 | Celery broker and result backend | Already in requirements.txt, required for Celery task queue |
| **pillow** | 12.2.0 | Image optimization and thumbnail generation | Chart format conversion, compression for CDN delivery |
| **httpx** | 0.28.1 | Async HTTP client for external API calls | Already in requirements.txt, useful for webhook notifications |
| **python-multipart** | 0.0.22 | Dataset file upload handling | Already in requirements.txt, required for CSV upload endpoints |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| docker SDK | docker-compose API | docker-compose API is deprecated for programmatic use; SDK has direct container control |
| Celery | Dramatiq | Celery has larger ecosystem, better monitoring (Flower), more battle-tested for long-running tasks |
| boto3 | aioboto3 | aioboto3 adds async support but less mature; FastAPI can run sync boto3 in threadpool |
| nbconvert | papermill | papermill adds parameterization and execution but nbconvert is sufficient for conversion only |

**Installation:**
```bash
# Phase 3 additions to backend/requirements.txt
docker==7.1.0
nbconvert==7.17.0
celery==5.6.3
boto3==1.42.83
minio==7.2.20
pillow==12.2.0

# Already present, will be used:
redis==5.2.1
httpx==0.28.1
python-multipart==0.0.22
```

**Version verification:**
- docker 7.1.0 (verified 2026-04-04 from PyPI)
- nbconvert 7.17.0 (verified 2026-04-04 from PyPI, matches STACK.md)
- boto3 1.42.83 (verified 2026-04-04 from PyPI, STACK.md shows 1.42.82)
- celery 5.6.3 (verified 2026-04-04 from PyPI, matches STACK.md)
- minio 7.2.20 (verified 2026-04-04 from PyPI, matches STACK.md)

## Architecture Patterns

### Recommended Project Structure
```
backend/
├── app/
│   ├── api/v1/
│   │   ├── datasets/          # Dataset upload/management endpoints
│   │   ├── compilation/       # Notebook compilation endpoints
│   │   └── storage/           # Storage/CDN management endpoints
│   ├── services/
│   │   ├── dataset_service.py     # Dataset upload, storage, URL generation
│   │   ├── compilation_service.py # Container execution orchestration
│   │   ├── nbconvert_service.py   # Notebook to HTML conversion
│   │   ├── cdn_service.py         # CloudFront invalidation
│   │   └── storage_service.py     # S3/MinIO operations abstraction
│   ├── tasks/
│   │   ├── celery_app.py      # Celery configuration
│   │   └── compilation_tasks.py # Async notebook compilation tasks
│   ├── core/
│   │   ├── container.py       # Docker client wrapper
│   │   └── security.py        # Presigned URL generation
│   └── models/
│     └── dataset.py           # Dataset metadata model
├── alembic/versions/          # Migration for datasets table
└── tests/
    ├── test_dataset_service.py
    ├── test_compilation_service.py
    └── test_cdn_service.py
```

### Pattern 1: Container Execution with Resource Limits
**What:** Execute notebooks in ephemeral Docker containers with enforced CPU/memory limits and timeouts.
**When to use:** Every notebook compilation request must run in isolated container.
**Example:**
```python
# Source: Docker SDK 7.1.0 documentation
import docker
from typing import Optional

class ContainerExecutor:
    def __init__(self):
        self.client = docker.from_env()

    def execute_notebook(
        self,
        notebook_path: str,
        dataset_path: Optional[str] = None,
        timeout: int = 300
    ) -> tuple[bool, str]:
        """
        Execute notebook in container with resource limits.

        Returns: (success, output_path)
        """
        volumes = {
            notebook_path: {'bind': '/workspace/notebook.ipynb', 'mode': 'ro'}
        }
        if dataset_path:
            volumes[dataset_path] = {'bind': '/workspace/data.csv', 'mode': 'ro'}

        try:
            container = self.client.containers.run(
                'notebooksocial-executor:latest',  # Custom image with nbconvert, pandas, matplotlib
                command=['jupyter', 'nbconvert', '--to', 'html', '--execute', '/workspace/notebook.ipynb'],
                volumes=volumes,
                mem_limit='1g',           # 1GB memory limit
                cpu_quota=50000,          # 50% CPU (50ms per 100ms period)
                cpu_period=100000,        # 100ms period
                network_disabled=True,    # Network isolation
                read_only=True,           # Read-only filesystem
                detach=True,
                remove=True               # Auto-remove after execution
            )

            # Wait with timeout
            result = container.wait(timeout=timeout)

            if result['StatusCode'] == 0:
                # Success - retrieve output
                output = container.get_archive('/workspace/notebook.html')
                return True, self._extract_output(output)
            else:
                logs = container.logs().decode('utf-8')
                return False, f"Execution failed: {logs}"

        except Exception as e:
            return False, f"Container error: {str(e)}"
```

### Pattern 2: Celery Async Task with Timeout
**What:** Define Celery tasks for async notebook compilation with time limits.
**When to use:** All notebook compilation should be asynchronous to avoid blocking API responses.
**Example:**
```python
# Source: Celery 5.6.3 documentation
from celery import Celery
from app.services.compilation_service import ContainerExecutor

celery_app = Celery(
    'notebooksocial',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=600,        # Hard limit: 10 minutes
    task_soft_time_limit=300,   # Soft limit: 5 minutes (raises Exception)
    worker_prefetch_multiplier=1,  # Don't prefetch long tasks
)

@celery_app.task(bind=True, max_retries=2)
def compile_notebook_task(self, notebook_id: int, dataset_id: Optional[int] = None):
    """
    Async notebook compilation task.
    """
    executor = ContainerExecutor()

    try:
        # Get notebook from database
        notebook = get_notebook(notebook_id)
        dataset_path = get_dataset_path(dataset_id) if dataset_id else None

        # Execute in container
        success, output_path = executor.execute_notebook(
            notebook.file_path,
            dataset_path,
            timeout=300
        )

        if success:
            # Upload output to S3
            cdn_url = upload_to_cdn(output_path, notebook_id)

            # Update notebook status
            update_notebook_status(notebook_id, 'published', cdn_url)

            return {'status': 'success', 'cdn_url': cdn_url}
        else:
            # Compilation failed
            update_notebook_status(notebook_id, 'failed', error=output_path)
            return {'status': 'failed', 'error': output_path}

    except Exception as exc:
        # Retry on transient failures
        raise self.retry(exc=exc, countdown=60)
```

### Pattern 3: S3/MinIO with Presigned URLs
**What:** Generate cryptographically secure URLs with short expiration for dataset access.
**When to use:** Dataset download/upload URLs must be secure and time-limited.
**Example:**
```python
# Source: boto3 1.42.83 documentation
import boto3
from botocore.client import Config
from app.core.config import settings

class StorageService:
    def __init__(self):
        # Use boto3 for both S3 and MinIO (S3-compatible)
        self.s3_client = boto3.client(
            's3',
            endpoint_url=settings.MINIO_ENDPOINT if settings.ENV == 'dev' else None,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4'),
            region_name='us-east-1'
        )

    def generate_download_url(
        self,
        bucket: str,
        key: str,
        expiration: int = 300  # 5 minutes default
    ) -> str:
        """
        Generate presigned URL for secure dataset access.

        Args:
            bucket: S3 bucket name
            key: Object key (e.g., 'datasets/user_123/data.csv')
            expiration: URL validity in seconds (max 604800 = 7 days)

        Returns:
            Presigned URL string
        """
        return self.s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': bucket, 'Key': key},
            ExpiresIn=expiration
        )

    def upload_notebook_output(
        self,
        file_path: str,
        notebook_id: int,
        version: str
    ) -> str:
        """
        Upload notebook HTML output to S3/MinIO.

        Returns:
            Public CDN URL (for CloudFront) or S3 URL (for MinIO dev)
        """
        key = f'notebooks/{notebook_id}/{version}/output.html'

        self.s3_client.upload_file(
            file_path,
            settings.NOTEBOOKS_BUCKET,
            key,
            ExtraArgs={
                'ContentType': 'text/html',
                'CacheControl': 'max-age=31536000',  # 1 year cache
                'Metadata': {'notebook_id': str(notebook_id), 'version': version}
            }
        )

        # Return CDN URL (CloudFront) or direct S3 URL (dev)
        if settings.ENV == 'production':
            return f"{settings.CLOUDFRONT_DOMAIN}/{key}"
        else:
            return self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': settings.NOTEBOOKS_BUCKET, 'Key': key},
                ExpiresIn=3600
            )
```

### Pattern 4: CloudFront Cache Invalidation
**What:** Invalidate CDN cache when notebooks are updated or deleted.
**When to use:** After notebook output is updated or notebook is deleted.
**Example:**
```python
# Source: boto3 CloudFront documentation
import boto3
from typing import List

class CDNService:
    def __init__(self):
        self.cloudfront = boto3.client('cloudfront')
        self.distribution_id = settings.CLOUDFRONT_DISTRIBUTION_ID

    def invalidate_notebook(self, notebook_id: int) -> str:
        """
        Invalidate CloudFront cache for a specific notebook.

        Returns:
            Invalidation ID
        """
        paths = [f'/notebooks/{notebook_id}/*']

        response = self.cloudfront.create_invalidation(
            DistributionId=self.distribution_id,
            InvalidationBatch={
                'CallerReference': f'notebook-{notebook_id}-{int(time.time())}',
                'Paths': {
                    'Quantity': len(paths),
                    'Items': paths
                }
            }
        )

        return response['Invalidation']['Id']

    def batch_invalidate(self, notebook_ids: List[int]) -> str:
        """
        Invalidate multiple notebooks in single request (max 1000 paths).
        """
        paths = [f'/notebooks/{nid}/*' for nid in notebook_ids]

        response = self.cloudfront.create_invalidation(
            DistributionId=self.distribution_id,
            InvalidationBatch={
                'CallerReference': f'batch-{int(time.time())}',
                'Paths': {
                    'Quantity': len(paths),
                    'Items': paths
                }
            }
        )

        return response['Invalidation']['Id']
```

### Anti-Patterns to Avoid
- **Synchronous compilation:** Never execute notebooks in API request handlers. Always use Celery tasks.
- **Long presigned URLs:** Avoid expiration > 1 hour for datasets. Max 7 days is AWS limit but insecure.
- **Direct S3 URLs in responses:** Never return S3 URLs directly. Use presigned URLs or CloudFront URLs.
- **Missing resource limits:** Never run containers without mem_limit, cpu_quota, and timeout.
- **Logging presigned URLs:** Never log presigned URLs—they are credentials.
- **Running as root:** Never run containers as root user. Use non-root user (already in Dockerfile).
- **Privileged mode:** Never use --privileged mode. Disables all security.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Container resource limits | Custom cgroups, manual timeout handling | Docker SDK built-in limits (mem_limit, cpu_quota, stop_timeout) | Docker enforces limits at kernel level, handles cleanup, cross-platform |
| S3-compatible storage | Direct HTTP requests to S3 API, signature calculation | boto3 S3 client with endpoint_url for MinIO | Handles authentication, retries, multipart upload, presigned URLs |
| Async task queue | Custom thread pool, background threads, asyncio tasks | Celery with Redis broker | Handles worker scaling, task retries, monitoring, result tracking |
| Notebook conversion | Custom JSON parsing of .ipynb files | nbconvert HTMLExporter | Handles all output types (charts, images, videos), template system |
| URL signing | Manual HMAC-SHA256 signature calculation | boto3 generate_presigned_url | AWS-standard signature, handles expiration, error handling |
| Cache invalidation | Direct HTTP requests to CloudFront API | boto3 CloudFront client | AWS authentication, batch invalidation, path validation |

**Key insight:** Storage, queue, and container systems have complex edge cases (authentication retries, multipart upload, worker failures). Official libraries handle these—custom implementations don't.

## Common Pitfalls

### Pitfall 1: Container Resource Leaks
**What goes wrong:** Containers aren't properly cleaned up after execution, causing disk space and memory exhaustion.
**Why it happens:** Exceptions occur before container.remove(), or containers aren't set with auto-remove.
**How to avoid:**
- Always use `remove=True` or `auto_remove=True` in containers.run()
- Use context managers or try-finally blocks for manual container lifecycle
- Implement periodic cleanup of orphaned containers
- Set Docker daemon resource limits globally
**Warning signs:** Increasing disk usage, `docker ps -a` showing many stopped containers

### Pitfall 2: Presigned URL Security
**What goes wrong:** URLs are shared, logged, or cached longer than expiration, allowing unauthorized access.
**Why it happens:** URLs are treated as regular links, not credentials. Browser caching or log files retain them.
**How to avoid:**
- Never log presigned URLs at any log level
- Set Cache-Control headers to prevent browser caching
- Use shortest practical expiration (5-15 minutes for downloads, 30 minutes for uploads)
- Include user_id and timestamp in object key for audit trails
- Implement IP restrictions if possible (CloudFront signed URLs)
**Warning signs:** Dataset access in access logs after expiration period

### Pitfall 3: Celery Task Timeouts
**What goes wrong:** Long-running notebook compilations exceed Celery worker timeout, causing task to hang and block worker.
**Why it happens:** task_time_limit not set, or container timeout > Celery timeout.
**How to avoid:**
- Always set task_time_limit and task_soft_time_limit in Celery config
- Ensure container timeout (Docker stop_timeout) < Celery task_time_limit
- Use worker_prefetch_multiplier=1 to prevent worker from hoarding tasks
- Monitor Celery with Flower to detect stuck tasks
**Warning signs:** Workers showing as "busy" indefinitely, task backlog growing

### Pitfall 4: CDN Cache Staleness
**What goes wrong:** Updated notebooks still show old outputs because CDN cache wasn't invalidated.
**Why it happens:** Invalidation called before S3 upload completes, or wrong paths invalidated.
**How to avoid:**
- Invalidate AFTER successful S3 upload (not before)
- Use versioned URLs (e.g., /notebooks/123/v2/output.html) for new uploads
- Include /* in invalidation path to catch all variations
- Wait for invalidation completion before returning success (can take minutes)
- Consider object versioning instead of invalidation for frequent updates
**Warning signs:** Users report seeing old notebook outputs, CloudFront metrics show high cache hit rate for updated objects

### Pitfall 5: nbconvert Output Size
**What goes wrong:** Notebook outputs (especially large matplotlib charts) exceed CDN/iframe size limits.
**Why it happens:** High-DPI charts, embedded base64 images, uncompressed SVG.
**How to avoid:**
- Configure matplotlib with lower DPI (100 instead of 300)
- Use nbconvert's extract_output mode to store images separately
- Implement image optimization with Pillow (convert to WebP, compress)
- Set output size limits in nbconvert template
- Warn users if output size > threshold before publishing
**Warning signs:** Slow notebook loading, browser console shows size warnings, CDN bandwidth spikes

### Pitfall 6: Dataset Upload Size Limits
**What goes wrong:** Users upload multi-GB CSV files, causing timeouts, storage exhaustion, or slow container startup.
**Why it happens:** No file size validation at upload endpoint.
**How to avoid:**
- Set FastAPI upload file size limit (e.g., 100MB) in dependencies
- Validate file size in endpoint before processing
- Use streaming upload to S3 (boto3 multipart upload) instead of buffering
- Implement chunked upload for large files with resumability
- Store file metadata (size, row count) for preview
**Warning signs:** Slow upload responses, backend memory spikes, S3 PUT duration > 30s

### Pitfall 7: Container Image Build Time
**What goes wrong:** Each compilation rebuilds the executor image, causing 5-10 minute delays.
**Why it happens:** Using docker.build() instead of pre-built image, or not caching layers.
**How to avoid:**
- Pre-build executor image during deployment (not at runtime)
- Use fixed version tags (e.g., notebooksocial-executor:v1.0.0)
- Include commonly used packages (pandas, numpy, matplotlib) in base image
- Only mount user notebooks as volumes, don't COPY them into image
- Set up image update pipeline, not per-compilation builds
**Warning signs:** First compilation takes > 5 minutes, high CPU during "build" phase

## Code Examples

Verified patterns from official sources:

### Docker Container with Resource Limits
```python
# Source: Docker SDK 7.1.0 documentation
# https://docker-py.readthedocs.io/en/stable/containers.html
import docker

client = docker.from_env()

# Run container with all Phase 3 security requirements
container = client.containers.run(
    'notebooksocial-executor:latest',
    command=['python', 'execute.py'],
    mem_limit='1g',              # 1GB memory limit (SEC-01)
    cpu_quota=50000,             # 50% CPU (INFRA-07)
    cpu_period=100000,           # 100ms period
    network_disabled=True,       # Network isolation (SEC-01)
    read_only=True,              # Read-only filesystem (SEC-01)
    detach=True,
    remove=True,                 # Auto-remove after execution
    stop_timeout=30              # Grace period before SIGKILL (SEC-02)
)
```

### nbconvert HTML with Embedded Outputs
```python
# Source: nbconvert 7.17.0 documentation
# https://nbconvert.readthedocs.io/en/latest/api.html
from nbconvert import HTMLExporter
import nbformat

# Load notebook
with open('notebook.ipynb', 'r') as f:
    notebook = nbformat.read(f, as_version=4)

# Configure exporter
html_exporter = HTMLExporter()
html_exporter.template_name = 'classic'
html_exporter.exclude_input = True      # Hide code cells
html_exporter.exclude_output_prompt = True  # Hide output prompts

# Convert to HTML
(body, resources) = html_exporter.from_notebook_node(notebook)

# Save or upload to S3
with open('output.html', 'w') as f:
    f.write(body)
```

### boto3 Presigned URL with Expiration
```python
# Source: boto3 1.42.83 documentation
# https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3.html
import boto3

s3_client = boto3.client('s3')

# Generate presigned URL for dataset access (STOR-02, SEC-03)
download_url = s3_client.generate_presigned_url(
    'get_object',
    Params={
        'Bucket': 'datasets',
        'Key': 'user_123/data.csv'
    },
    ExpiresIn=300  # 5 minutes (cryptographically secure, time-limited)
)

# Generate presigned POST URL for dataset upload
upload_url = s3_client.generate_presigned_post(
    Bucket='datasets',
    Key='user_123/new_data.csv',
    Fields={'Content-Type': 'text/csv'},
    Conditions=[
        {'Content-Type': 'text/csv'},
        ['content-length-range', 1, 104857600]  # Max 100MB
    ],
    ExpiresIn=1800  # 30 minutes
)
```

### Celery Task Configuration
```python
# Source: Celery 5.6.3 documentation
# https://docs.celeryq.dev/en/stable/userguide/configuration.html
from celery import Celery

app = Celery('notebooksocial')

# Configure for notebook compilation workload (INFRA-06)
app.conf.update(
    # Task serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',

    # Time limits (SEC-02)
    task_time_limit=600,        # 10 minutes hard limit
    task_soft_time_limit=300,   # 5 minutes soft limit (raises Exception)

    # Worker behavior
    worker_prefetch_multiplier=1,  # Don't prefetch long tasks
    task_acks_late=True,           # Ack only after task completes

    # Result backend
    result_backend='redis://localhost:6379/0',
    result_expires=3600,            # Results expire after 1 hour
)
```

### CloudFront Cache Invalidation
```python
# Source: boto3 CloudFront documentation
# https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudfront.html
import boto3
import time

cloudfront = boto3.client('cloudfront')

# Invalidate notebook output after update (STOR-05)
invalidation = cloudfront.create_invalidation(
    DistributionId='E1234567890ABC',
    InvalidationBatch={
        'CallerReference': f'notebook-123-{int(time.time())}',  # Unique reference
        'Paths': {
            'Quantity': 1,
            'Items': ['/notebooks/123/*']  # Wildcard for all versions
        }
    }
)

# Invalidation ID for tracking
invalidation_id = invalidation['Invalidation']['Id']
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Synchronous execution | Async Celery tasks | 2020+ | Non-blocking API, better scalability |
| Direct S3 public URLs | Presigned URLs with expiration | 2019+ | Secure access without cloudfront signed URLs |
| Manual cache invalidation | Automated boto3 invalidation | 2021+ | Faster updates, better cache consistency |
| Single timeout | Soft + hard time limits (Celery) | 2022+ | Graceful shutdown, better error handling |
| Fixed resource limits | Per-container mem_limit/cpu_quota | 2023+ | Fair resource allocation, prevents noisy neighbor |

**Deprecated/outdated:**
- **Docker Compose API for programmatic control:** Deprecated. Use Docker SDK directly.
- **Celery 4.x:** EOL. Upgrade to Celery 5.6+ for Python 3.11 support.
- **boto3 s3.generate_url:** Deprecated. Use generate_presigned_url instead.
- **nbconvert command-line:** Use Python API for better error handling and control.

## Open Questions

1. **Executor container base image**
   - What we know: Need Python 3.11, nbconvert, pandas, matplotlib, jupyter
   - What's unclear: Whether to use jupyter/base-notebook or custom slim image
   - Recommendation: Use custom slim image for security (smaller attack surface), install only required packages. Test both in Phase 3 implementation.

2. **CDN strategy for local development**
   - What we know: CloudFront is AWS-only, doesn't work with local Docker Compose
   - What's unclear: How to serve outputs in dev without CloudFront
   - Recommendation: Use MinIO direct URLs with presigned URLs in dev, CloudFront in prod. Abstract behind storage_service.py.

3. **Container network isolation vs package installation**
   - What we know: SEC-01 requires network isolation, but users may want pip install
   - What's unclear: Whether to allow network for pip install (AEXEC-03 is v2, not v1)
   - Recommendation: Disable network for v1 (SEC-01). Document that custom packages are v2 feature. This aligns with requirements.

4. **Output size limits**
   - What we know: Large outputs cause performance issues (Pitfall 5)
   - What's unclear: What size limit to enforce (1MB? 10MB? 100MB?)
   - Recommendation: Start with 10MB limit, monitor actual outputs, adjust based on data. Add warning in UI.

5. **Celery worker autoscaling**
   - What we know: Celery supports autoscaling based on load
   - What's unclear: Whether to implement in Phase 3 or Phase 6 (deployment)
   - Recommendation: Fixed worker count (2-4) for Phase 3 local dev, autoscaling in Phase 6 AWS deployment.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Container execution (NOTE-04, INFRA-07) | ✓ | 29.1.3 | — |
| Python 3.9+ | All backend services | ✓ | 3.9.6 | — |
| Redis | Celery broker (INFRA-06) | ✗ | — | Use in-memory broker for dev (not production) |
| MinIO | Dataset storage (STOR-01, STOR-03) | ✗ | — | Use local filesystem storage for dev (not production) |
| CloudFront | CDN serving (STOR-04, VIEW-03) | ✗ | — | Use presigned MinIO URLs for dev (not production) |
| nbconvert | Notebook conversion (NOTE-05) | ✗ | — | Install via pip (7.17.0) |
| docker-py | Container control (NOTE-04) | ✗ | — | Install via pip (7.1.0) |
| celery | Task queue (INFRA-06) | ✗ | — | Install via pip (5.6.3) |
| boto3 | S3/CloudFront operations (STOR-02, STOR-05) | ✗ | — | Install via pip (1.42.83) |

**Missing dependencies with no fallback:**
- None (all missing packages are pip-installable)

**Missing dependencies with fallback:**
- Redis: Use in-memory broker for local development (not production-ready)
- MinIO: Use local filesystem for local development (not production-ready)
- CloudFront: Use direct MinIO presigned URLs for local development (not production-ready)

**Environment setup required:**
```bash
# Install Redis (macOS)
brew install redis
brew services start redis

# Or use Docker Compose (add Redis service)
# Already in docker-compose.yml

# Install MinIO (Docker)
docker run -p 9000:9000 -p 9001:9001 \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  quay.io/minio/minio server /data --console-address ":9001"

# Install Python packages
pip install docker==7.1.0 nbconvert==7.17.0 celery==5.6.3 boto3==1.42.83 minio==7.2.20 pillow==12.2.0
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 (backend), Vitest 4.1.2 (frontend) |
| Config file | None (see Wave 0) |
| Quick run command | `pytest backend/tests/ -v -x` (backend), `npm test -- --run` (frontend) |
| Full suite command | `pytest backend/tests/ -v` (backend), `npm test` (frontend) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTE-03 | User can upload CSV datasets | integration | `pytest tests/test_dataset_service.py::test_upload_csv -x` | ❌ Wave 0 |
| NOTE-04 | Notebooks compile in isolated containers | integration | `pytest tests/test_compilation_service.py::test_container_execution -x` | ❌ Wave 0 |
| NOTE-05 | Publish outputs to feed after compilation | e2e | `pytest tests/test_notebook_workflow.py::test_compile_and_publish -x` | ❌ Wave 0 |
| VIEW-03 | Outputs served via CDN | unit | `pytest tests/test_cdn_service.py::test_cloudfront_url -x` | ❌ Wave 0 |
| STOR-01 | Datasets stored in MinIO | unit | `pytest tests/test_storage_service.py::test_minio_upload -x` | ❌ Wave 0 |
| STOR-02 | Presigned URLs with expiration | unit | `pytest tests/test_storage_service.py::test_presigned_url_expiration -x` | ❌ Wave 0 |
| STOR-05 | CDN cache invalidation | integration | `pytest tests/test_cdn_service.py::test_invalidate_notebook -x` | ❌ Wave 0 |
| INFRA-06 | Celery async compilation tasks | integration | `pytest tests/test_compilation_tasks.py::test_celery_task -x` | ❌ Wave 0 |
| INFRA-07 | Container resource limits enforced | integration | `pytest tests/test_compilation_service.py::test_resource_limits -x` | ❌ Wave 0 |
| SEC-01 | Container isolation (non-root, read-only) | unit | `pytest tests/test_container_executor.py::test_security_config -x` | ❌ Wave 0 |
| SEC-02 | Container timeout limits | integration | `pytest tests/test_compilation_service.py::test_timeout_enforcement -x` | ❌ Wave 0 |
| SEC-03 | Dataset access restricted (presigned URLs) | unit | `pytest tests/test_storage_service.py::test_presigned_url_access -x` | ❌ Wave 0 |
| PERF-01 | Feed loads in < 2 seconds | e2e | `pytest tests/test_performance.py::test_feed_load_time -x` | ❌ Wave 0 |
| PERF-02 | Viewer loads in < 3 seconds | e2e | `pytest tests/test_performance.py::test_viewer_load_time -x` | ❌ Wave 0 |
| PERF-04 | Images lazy-loaded | e2e | Playwright: `tests/e2e/viewer.spec.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pytest backend/tests/ -v -x` (backend unit + integration tests)
- **Per wave merge:** `pytest backend/tests/ -v` (full backend suite) + `npm test` (frontend suite)
- **Phase gate:** Full suite green + manual E2E verification of compilation workflow before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `backend/tests/conftest.py` — shared fixtures (docker client, mock S3, celery app)
- [ ] `backend/tests/test_dataset_service.py` — dataset upload, storage, URL generation
- [ ] `backend/tests/test_compilation_service.py` — container execution, resource limits, timeouts
- [ ] `backend/tests/test_compilation_tasks.py` — Celery task execution, error handling
- [ ] `backend/tests/test_storage_service.py` — S3/MinIO operations, presigned URLs
- [ ] `backend/tests/test_cdn_service.py` — CloudFront invalidation
- [ ] `backend/tests/test_container_executor.py` — Docker client wrapper, security config
- [ ] `backend/tests/test_notebook_workflow.py` — E2E compilation and publishing workflow
- [ ] `backend/tests/test_performance.py` — Feed and viewer load time tests
- [ ] Framework install: pytest 9.0.2, pytest-asyncio 1.3.0 (already in requirements.txt)
- [ ] Frontend: `frontend/tests/components/NotebookViewer.test.tsx` — lazy loading verification

## Sources

### Primary (HIGH confidence)
- [Docker SDK 7.1.0 Documentation](https://docker-py.readthedocs.io/en/stable/) - Container lifecycle, resource limits, volume mounts
- [nbconvert 7.17.0 Documentation](https://nbconvert.readthedocs.io/en/latest/) - HTMLExporter, notebook conversion API
- [Celery 5.6.3 Documentation](https://docs.celeryq.dev/en/stable/) - Task configuration, time limits, worker settings
- [boto3 1.42.83 Documentation](https://boto3.amazonaws.com/v1/documentation/api/latest/index.html) - S3 presigned URLs, CloudFront invalidation
- [MinIO Python SDK 7.2.0 Documentation](https://min.io/docs/minio/linux/developers/python/minio-py.html) - S3-compatible API for local development

### Secondary (MEDIUM confidence)
- [PyPI Package Verification](https://pypi.org/) - Verified latest versions: docker 7.1.0, nbconvert 7.17.0, boto3 1.42.83, celery 5.6.3, minio 7.2.20
- [Jupyter Notebook Documentation](https://docs.jupyter.org/) - Notebook format, execution semantics
- [Docker Security Best Practices](https://docs.docker.com/engine/security/) - Container isolation, seccomp, AppArmor, non-root users

### Tertiary (LOW confidence)
- Web search attempts were rate-limited; reliance on official documentation and training data for patterns
- CloudFront invalidation patterns verified against boto3 documentation (HIGH)
- Presigned URL security practices verified against AWS documentation (HIGH)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified from PyPI, matches STACK.md where specified
- Architecture: MEDIUM - Patterns verified from official docs, but integration complexity is high
- Pitfalls: MEDIUM - Based on common Docker/Celery/S3 gotchas, but Phase 3 has no production data yet
- Environment availability: HIGH - Docker verified, Redis/MinIO missing but have fallbacks

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (30 days - Docker SDK, nbconvert, and boto3 are stable; Celery is mature)
