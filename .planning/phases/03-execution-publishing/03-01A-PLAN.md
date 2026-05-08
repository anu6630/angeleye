---
phase: 03-execution-publishing
plan: 01A
type: execute
wave: 1
depends_on: []
files_modified:
  - backend/requirements.txt
  - docker-compose.yml
  - backend/app/core/config.py
autonomous: true
requirements:
  - STOR-01
  - STOR-03
  - SEC-07

must_haves:
  truths:
    - "MinIO service runs in Docker Compose for local S3-compatible storage"
    - "boto3 and minio Python packages installed"
    - "Storage configuration added to Settings (MINIO_ENDPOINT, buckets)"
    - "MinIO accessible at localhost:9000 (API) and localhost:9001 (console)"
  artifacts:
    - path: "backend/requirements.txt"
      provides: "Python dependencies for storage"
      contains: "boto3==1.42.83"
      min_lines: 1
    - path: "docker-compose.yml"
      provides: "MinIO service definition"
      contains: "minio:"
      min_lines: 15
    - path: "backend/app/core/config.py"
      provides: "Storage settings (MINIO_ENDPOINT, buckets, AWS config)"
      contains: "MINIO_ENDPOINT"
      min_lines: 10
  key_links:
    - from: "docker-compose.yml"
      to: "MinIO"
      via: "minio service definition"
      pattern: "minio:"
    - from: "backend/app/core/config.py"
      to: "MinIO/S3"
      via: "MINIO_ENDPOINT configuration"
      pattern: "MINIO_ENDPOINT.*localhost"

---

# Phase 03-01A: Storage Infrastructure (MinIO and Dependencies)

<objective>
Set up MinIO S3-compatible storage service in Docker Compose and install required Python dependencies (boto3, minio, pillow). This is infrastructure for dataset and notebook output storage.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/03-execution-publishing/03-RESEARCH.md
@backend/requirements.txt (existing dependencies)
@docker-compose.yml (existing services)
@backend/app/core/config.py (existing settings)

## Dependencies from RESEARCH.md

- boto3==1.42.83 for S3/MinIO operations
- minio==7.2.20 for Python SDK
- pillow==12.2.0 for image optimization

## Why This Plan First

MinIO infrastructure must exist before StorageService (Plan 03-01B) can be implemented. This is pure infrastructure setup.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install storage dependencies and configure Settings</name>
  <files>
    backend/requirements.txt
    backend/app/core/config.py
  </files>
  <read_first>
    - backend/requirements.txt
    - backend/app/core/config.py
  </read_first>
  <action>
    Add Phase 3 storage dependencies to backend/requirements.txt (append to end):
    ```text
    # Phase 3: Storage and CDN
    boto3==1.42.83
    minio==7.2.20
    pillow==12.2.0
    ```

    Add storage configuration to backend/app/core/config.py Settings class.
    Find the Settings class definition and add these fields after existing fields:
    ```python
    # Storage (STOR-01: Datasets stored in MinIO, STOR-03: Outputs stored in MinIO/S3)
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = "minioadmin"
    MINIO_SECRET_KEY: str = "minioadmin"
    DATASETS_BUCKET: str = "datasets"
    NOTEBOOKS_BUCKET: str = "notebooks"

    # AWS S3 (production)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"

    # CDN (STOR-04: Pre-rendered outputs served via CloudFront)
    CLOUDFRONT_DISTRIBUTION_ID: str = ""
    CLOUDFRONT_DOMAIN: str = ""

    # File upload limits (STOR-01: Max 100MB for datasets)
    MAX_DATASET_SIZE_MB: int = 100
    ```

    Ensure the Settings class has proper validation. Add this import at the top if not present:
    ```python
    from pydantic_settings import BaseSettings
    ```
  </action>
  <verify>
    <automated>grep -q "boto3==1.42.83" backend/requirements.txt && grep -q "minio==7.2.20" backend/requirements.txt && grep -q "pillow==12.2.0" backend/requirements.txt && grep -q "MINIO_ENDPOINT" backend/app/core/config.py && echo "Dependencies and configuration added"</automated>
  </verify>
  <done>
    - boto3==1.42.83 added to requirements.txt for AWS SDK
    - minio==7.2.20 added for MinIO Python SDK
    - pillow==12.2.0 added for image optimization
    - MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY settings added
    - DATASETS_BUCKET and NOTEBOOKS_BUCKET bucket names configured
    - AWS settings (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION) for production
    - CLOUDFRONT_DISTRIBUTION_ID and CLOUDFRONT_DOMAIN for CDN integration
    - MAX_DATASET_SIZE_MB set to 100 (STOR-01 file size limit)
  </done>
</task>

<task type="auto">
  <name>Task 2: Add MinIO service to docker-compose.yml</name>
  <files>
    docker-compose.yml
  </files>
  <read_first>
    - docker-compose.yml
  </read_first>
  <action>
    Add MinIO service to docker-compose.yml.

    Find the services section and add the minio service before the backend service:
    ```yaml
  minio:
    image: minio/minio:latest
    container_name: notebooksocial-minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    ```

    Update the volumes section at the bottom of docker-compose.yml to include minio_data:
    ```yaml
    volumes:
      postgres_data:
      redis_data:
      minio_data:
    ```

    If backend service exists, add MinIO dependency to its depends_on section and add MINIO environment variables:
    ```yaml
    environment:
      - MINIO_ENDPOINT=http://minio:9000
      - MINIO_ACCESS_KEY=minioadmin
      - MINIO_SECRET_KEY=minioadmin
    ```
  </action>
  <verify>
    <automated>grep -q "minio:" docker-compose.yml && grep -q "minio_data:" docker-compose.yml && grep -q "9000:9000" docker-compose.yml && echo "MinIO service added"</automated>
  </verify>
  <done>
    - MinIO service defined with latest image
    - Ports 9000 (API) and 9001 (console) exposed
    - minio_data volume for persistent storage
    - Healthcheck configured for /minio/health/live
    - Volumes section updated with minio_data
    - Backend service has MINIO_ENDPOINT environment variable if backend exists
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>MinIO S3-compatible storage service running in Docker Compose with Python dependencies installed</what-built>
  <how-to-verify>
    1. Start MinIO: `docker-compose up minio -d`
    2. Check MinIO is running: `docker ps | grep minio`
    3. Access MinIO console: Open http://localhost:9001 in browser
    4. Login with minioadmin/minioadmin
    5. Verify healthcheck: `curl http://localhost:9000/minio/health/live`
    6. Create two buckets manually via console:
       - "datasets" for CSV file uploads
       - "notebooks" for compiled notebook outputs
  </how-to-verify>
  <resume-signal>Type "approved" if MinIO is running and buckets are created, or describe issues</resume-signal>
</task>

</tasks>

<verification>
- boto3==1.42.83 in requirements.txt
- minio==7.2.20 in requirements.txt
- pillow==12.2.0 in requirements.txt
- MINIO_ENDPOINT, DATASETS_BUCKET, NOTEBOOKS_BUCKET in Settings
- MinIO service in docker-compose.yml
- minio_data volume defined
- MinIO accessible at localhost:9000 and localhost:9001
- Buckets created: datasets, notebooks
</verification>

<success_criteria>
- MinIO starts successfully with `docker-compose up minio -d`
- MinIO console accessible at http://localhost:9001
- Can login with minioadmin/minioadmin
- datasets and notebooks buckets created
- Healthcheck endpoint returns 200
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-01A-SUMMARY.md`
</output>
