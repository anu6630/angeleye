---
phase: 03-execution-publishing
plan: 01C
type: execute
wave: 3
depends_on: ["03-01B"]
files_modified:
  - backend/app/api/v1/datasets/router.py
  - backend/app/api/v1/datasets/__init__.py
  - backend/app/main.py
autonomous: true
requirements:
  - NOTE-03
  - STOR-02
  - SEC-03

must_haves:
  truths:
    - "POST /api/v1/datasets endpoint accepts CSV file uploads"
    - "GET /api/v1/datasets lists user's datasets"
    - "GET /api/v1/datasets/{id} returns dataset with fresh presigned URL"
    - "DELETE /api/v1/datasets/{id} deletes dataset and file"
    - "All endpoints require authentication (require_auth dependency)"
  artifacts:
    - path: "backend/app/api/v1/datasets/router.py"
      provides: "Dataset API endpoints"
      exports: ["POST /datasets", "GET /datasets", "GET /datasets/{id}", "DELETE /datasets/{id}"]
      min_lines: 80
  key_links:
    - from: "backend/app/api/v1/datasets/router.py"
      to: "backend/app/services/dataset_service.py"
      via: "DatasetService dependency injection"
      pattern: "DatasetService\\(db\\)"
    - from: "backend/app/api/v1/datasets/router.py"
      to: "backend/app/api/v1/dependencies.py"
      via: "require_auth dependency"
      pattern: "require_auth"

---

# Phase 03-01C: Dataset API Endpoints

<objective>
Create REST API endpoints for dataset upload, listing, retrieval, and deletion. All endpoints require authentication and enforce ownership rules for secure access.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/03-execution-publishing/03-RESEARCH.md
@backend/app/api/v1/notebooks/router.py (for router pattern reference)
@backend/app/api/v1/dependencies.py (for auth dependency)
@backend/app/services/dataset_service.py (for business logic)
@backend/app/schemas/dataset.py (for request/response schemas)

## API Contract

This plan creates the dataset API router that downstream plans (03-05B frontend integration) will consume.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create dataset API router with all CRUD endpoints</name>
  <files>
    backend/app/api/v1/datasets/__init__.py
    backend/app/api/v1/datasets/router.py
    backend/app/main.py
  </files>
  <read_first>
    - backend/app/api/v1/notebooks/router.py (for router pattern reference)
    - backend/app/api/v1/dependencies.py (for auth dependency)
    - backend/app/services/dataset_service.py (for business logic)
    - backend/app/main.py (for router registration)
  </read_first>
  <action>
    Create backend/app/api/v1/datasets/__init__.py:
    ```python
    from app.api.v1.datasets.router import router as datasets_router

    __all__ = ['datasets_router']
    ```

    Create backend/app/api/v1/datasets/router.py:
    ```python
    from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
    from sqlalchemy.orm import Session
    from typing import Optional

    from app.api.v1.dependencies import get_db, require_auth
    from app.services.dataset_service import DatasetService
    from app.schemas.dataset import DatasetResponse, DatasetListResponse

    router = APIRouter(prefix="/datasets", tags=["datasets"])


    @router.post("", response_model=DatasetResponse, status_code=201)
    async def upload_dataset(
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        auth: dict = Depends(require_auth)
    ):
        """
        Upload a CSV dataset file.

        - **file**: CSV file (max 100MB)
        - Returns dataset metadata without download URL (fetch separately for fresh URL)

        NOTE-03: User can upload datasets (CSV files) to support charts and data visualization
        """
        service = DatasetService(db)
        dataset = await service.upload_dataset(file, auth["user_id"])
        return DatasetResponse(
            id=dataset.id,
            filename=dataset.filename,
            original_filename=dataset.original_filename,
            file_size_bytes=dataset.file_size_bytes,
            content_type=dataset.content_type,
            row_count=dataset.row_count,
            created_at=dataset.created_at,
            download_url=None  # Don't include URL in upload response
        )


    @router.get("", response_model=DatasetListResponse)
    async def list_datasets(
        limit: int = 50,
        db: Session = Depends(get_db),
        auth: dict = Depends(require_auth)
    ):
        """
        List current user's datasets.

        Returns list of datasets with metadata but no download URLs.
        """
        service = DatasetService(db)
        datasets = service.get_user_datasets(auth["user_id"], limit)
        return DatasetListResponse(
            datasets=[
                DatasetResponse(
                    id=d.id,
                    filename=d.filename,
                    original_filename=d.original_filename,
                    file_size_bytes=d.file_size_bytes,
                    content_type=d.content_type,
                    row_count=d.row_count,
                    created_at=d.created_at,
                    download_url=None
                )
                for d in datasets
            ],
            total=len(datasets)
        )


    @router.get("/{dataset_id}", response_model=DatasetResponse)
    async def get_dataset(
        dataset_id: int,
        db: Session = Depends(get_db),
        auth: dict = Depends(require_auth)
    ):
        """
        Get dataset metadata with fresh download URL.

        STOR-02: Dataset files have cryptographically secure URLs with expiration
        SEC-03: Dataset access restricted to notebook owner and viewers
        """
        service = DatasetService(db)
        dataset = service.get_dataset(dataset_id, auth["user_id"])
        download_url = service.generate_download_url(dataset)

        return DatasetResponse(
            id=dataset.id,
            filename=dataset.filename,
            original_filename=dataset.original_filename,
            file_size_bytes=dataset.file_size_bytes,
            content_type=dataset.content_type,
            row_count=dataset.row_count,
            created_at=dataset.created_at,
            download_url=download_url
        )


    @router.delete("/{dataset_id}", status_code=204)
    async def delete_dataset(
        dataset_id: int,
        db: Session = Depends(get_db),
        auth: dict = Depends(require_auth)
    ):
        """
        Delete a dataset and its file from storage.

        Only the dataset owner can delete their datasets.
        """
        service = DatasetService(db)
        service.delete_dataset(dataset_id, auth["user_id"])
        return None
    ```

    Update backend/app/main.py to register the datasets router.

    Find the section where routers are imported (after existing router imports) and add:
    ```python
    from app.api.v1.datasets import datasets_router
    ```

    Find where routers are registered (after existing router registrations) and add:
    ```python
    app.include_router(datasets_router, prefix="/api/v1")
    ```
  </action>
  <verify>
    <automated>grep -q "datasets_router" backend/app/main.py && python -c "from app.api.v1.datasets.router import router; print('Dataset router imports successfully')"</automated>
  </verify>
  <done>
    - Dataset router created with POST /upload, GET /, GET /{id}, DELETE /{id} endpoints
    - All endpoints require authentication (require_auth dependency)
    - POST endpoint accepts CSV file upload via UploadFile
    - GET / returns list of user's datasets without download URLs
    - GET /{id} returns dataset with fresh presigned download URL (STOR-02)
    - DELETE /{id} deletes dataset and file from storage
    - Router registered in main.py
    - Ownership verification enforced (SEC-03)
  </done>
</task>

</tasks>

<verification>
- POST /api/v1/datasets accepts CSV file uploads
- GET /api/v1/datasets lists user's datasets
- GET /api/v1/datasets/{id} returns dataset with fresh presigned URL
- DELETE /api/v1/datasets/{id} deletes dataset and file
- All endpoints require authentication
- Router registered in main.py
- Ownership verification prevents cross-user access
</verification>

<success_criteria>
- Dataset endpoints accessible in OpenAPI docs
- File upload accepts CSV files only
- File size limit enforced (100MB)
- Presigned URLs generated with 5-minute expiration
- Only dataset owner can access/delete their datasets
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-01C-SUMMARY.md`
</output>
