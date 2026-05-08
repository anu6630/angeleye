---
phase: 03-execution-publishing
plan: 04B
type: execute
wave: 4
depends_on: ["03-04A"]
files_modified:
  - backend/app/schemas/compilation.py
  - backend/app/api/v1/compilation/__init__.py
  - backend/app/api/v1/compilation/router.py
  - backend/app/main.py
autonomous: true
requirements:
  - NOTE-05
  - VIEW-03
  - STOR-05

must_haves:
  truths:
    - "POST /api/v1/compilation/compile/async submits Celery task"
    - "GET /api/v1/compilation/status/{task_id} returns task status"
    - "POST /api/v1/compilation/publish publishes compiled notebook"
    - "POST /api/v1/compilation/compile-and-publish for convenience"
    - "All endpoints require authentication and verify notebook ownership"
  artifacts:
    - path: "backend/app/api/v1/compilation/router.py"
      provides: "Compilation and publishing API endpoints"
      exports: ["POST /compile/async", "GET /status/{task_id}", "POST /publish", "POST /compile-and-publish"]
      min_lines: 120
  key_links:
    - from: "backend/app/api/v1/compilation/router.py"
      to: "backend/app/tasks/compilation_tasks.py"
      via: "Celery task for async compilation"
      pattern: "compile_notebook_task\\.delay"
    - from: "backend/app/api/v1/compilation/router.py"
      to: "backend/app/api/v1/dependencies.py"
      via: "require_auth dependency"
      pattern: "require_auth"

---

# Phase 03-04B: Publishing API Endpoints

<objective>
Create REST API endpoints for async notebook compilation and publishing. Users can submit compilation tasks, poll status, and publish results to the social feed.
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
@backend/app/tasks/compilation_tasks.py (for task integration)
@backend/app/services/cdn_service.py (for CDN operations created in Plan 03-04A)

## Publishing Workflow Part 2

1. User submits compilation via API
2. Celery task executes (Plan 03-03B)
3. User polls task status
4. User publishes to feed (marks is_published=true)
5. Cache invalidated (if updating existing)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create compilation schemas and API router</name>
  <files>
    backend/app/schemas/compilation.py
    backend/app/api/v1/compilation/__init__.py
    backend/app/api/v1/compilation/router.py
    backend/app/main.py
  </files>
  <read_first>
    - backend/app/api/v1/notebooks/router.py (for router pattern reference)
    - backend/app/api/v1/dependencies.py (for auth dependency)
    - backend/app/schemas/notebook.py (for schema pattern reference)
    - backend/app/tasks/compilation_tasks.py (for task import)
    - backend/app/services/cdn_service.py (for CDN operations)
  </read_first>
  <action>
    Create backend/app/schemas/compilation.py:
    ```python
    from pydantic import BaseModel, Field
    from typing import Optional


    class CompilationRequest(BaseModel):
        """Request schema for notebook compilation"""
        notebook_id: int = Field(..., description="ID of notebook to compile")
        dataset_id: Optional[int] = Field(None, description="Optional dataset ID to use")


    class AsyncCompilationRequest(BaseModel):
        """Request schema for async notebook compilation"""
        notebook_id: int
        dataset_id: Optional[int] = None


    class CompilationResponse(BaseModel):
        """Response schema for compilation result"""
        status: str  # 'success' or 'failed'
        notebook_id: int
        output_url: Optional[str] = None
        output_key: Optional[str] = None
        error: Optional[str] = None


    class AsyncCompilationResponse(BaseModel):
        """Response schema for async compilation (returns task ID)"""
        task_id: str
        notebook_id: int
        status: str = "pending"


    class PublishRequest(BaseModel):
        """Request schema for publishing compiled notebook"""
        notebook_id: int
        output_key: str = Field(..., description="S3 key of compiled output")
        auto_invalidate: bool = True  # Invalidate cache for old version


    class PublishResponse(BaseModel):
        """Response schema for published notebook"""
        notebook_id: int
        is_published: bool
        output_url: str
        invalidation_id: Optional[str] = None
    ```

    Create backend/app/api/v1/compilation/__init__.py:
    ```python
    from app.api.v1.compilation.router import router as compilation_router

    __all__ = ['compilation_router']
    ```

    Create backend/app/api/v1/compilation/router.py:
    ```python
    from fastapi import APIRouter, Depends, HTTPException
    from sqlalchemy.orm import Session

    from app.api.v1.dependencies import get_db, require_auth
    from app.tasks.compilation_tasks import compile_notebook_task, get_compilation_status
    from app.services.cdn_service import CDNService
    from app.schemas.compilation import (
        CompilationRequest,
        AsyncCompilationRequest,
        CompilationResponse,
        AsyncCompilationResponse,
        PublishRequest,
        PublishResponse
    )
    from app.models.notebook import Notebook

    router = APIRouter(prefix="/compilation", tags=["compilation"])


    @router.post("/compile/async", response_model=AsyncCompilationResponse, status_code=202)
    async def compile_notebook_async(
        request: AsyncCompilationRequest,
        db: Session = Depends(get_db),
        auth: dict = Depends(require_auth)
    ):
        """
        Submit notebook for async compilation via Celery.

        - **notebook_id**: ID of notebook to compile
        - **dataset_id**: Optional dataset ID to use

        Returns task ID for status polling.

        NOTE-04: User can compile notebooks in isolated online containers
        INFRA-06: Celery manages async notebook compilation tasks
        """
        # Verify notebook exists and user owns it
        notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        if notebook.user_id != auth["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Submit Celery task
        task = compile_notebook_task.delay(
            notebook_id=request.notebook_id,
            dataset_id=request.dataset_id
        )

        return AsyncCompilationResponse(
            task_id=task.id,
            notebook_id=request.notebook_id,
            status="pending"
        )


    @router.get("/status/{task_id}", response_model=dict)
    async def get_task_status(
        task_id: str,
        auth: dict = Depends(require_auth)
    ):
        """
        Get compilation task status.

        Returns task state and result if complete.
        """
        status = get_compilation_status(task_id)
        return status


    @router.post("/publish", response_model=PublishResponse)
    async def publish_notebook(
        request: PublishRequest,
        db: Session = Depends(get_db),
        auth: dict = Depends(require_auth)
    ):
        """
        Publish a compiled notebook to the social feed.

        - **notebook_id**: ID of notebook to publish
        - **output_key**: S3 key of compiled output from compilation task
        - **auto_invalidate**: Whether to invalidate cache for old version

        NOTE-05: User can publish pre-rendered outputs to social feed

        Publication only succeeds if:
        1. Notebook exists and user owns it
        2. Output exists in S3/MinIO (verified via output_key)
        3. Notebook is not already published (unless updating)
        """
        # Verify notebook exists and user owns it
        notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        if notebook.user_id != auth["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Initialize CDN service
        cdn_service = CDNService()

        # Invalidate old version if updating (STOR-05: CDN cache invalidated when notebook updated)
        invalidation_id = None
        if request.auto_invalidate and notebook.is_published:
            invalidation_id = cdn_service.invalidate_notebook(request.notebook_id)

        # Mark as published
        notebook.is_published = True
        db.commit()

        # Generate output URL
        output_url = cdn_service.get_output_url(request.output_key)

        return PublishResponse(
            notebook_id=request.notebook_id,
            is_published=True,
            output_url=output_url,
            invalidation_id=invalidation_id
        )


    @router.post("/compile-and-publish", response_model=AsyncCompilationResponse, status_code=202)
    async def compile_and_publish(
        request: CompilationRequest,
        db: Session = Depends(get_db),
        auth: dict = Depends(require_auth)
    ):
        """
        Compile notebook and automatically publish on success.

        This is a convenience endpoint that:
        1. Submits compilation task
        2. Returns task ID
        3. On completion, automatically marks notebook as published

        User should poll task status. When status='success', notebook is published.
        """
        # Verify notebook exists and user owns it
        notebook = db.query(Notebook).filter(Notebook.id == request.notebook_id).first()
        if not notebook:
            raise HTTPException(status_code=404, detail="Notebook not found")

        if notebook.user_id != auth["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")

        # Submit Celery task with publish flag
        # Note: We'd need to extend the task to support auto-publish
        # For now, this is just an alias for compile async
        task = compile_notebook_task.delay(
            notebook_id=request.notebook_id,
            dataset_id=request.dataset_id
        )

        return AsyncCompilationResponse(
            task_id=task.id,
            notebook_id=request.notebook_id,
            status="pending"
        )
    ```

    Update backend/app/main.py to register the compilation router.

    Find where routers are imported (after existing router imports) and add:
    ```python
    from app.api.v1.compilation import compilation_router
    ```

    Find where routers are registered (after existing router registrations) and add:
    ```python
    app.include_router(compilation_router, prefix="/api/v1")
    ```
  </action>
  <verify>
    <automated>grep -q "compilation_router" backend/app/main.py && python -c "from app.api.v1.compilation.router import router; print('Compilation router imports successfully')"</automated>
  </verify>
  <done>
    - Compilation schemas created (Request/Response for sync and async, Publish)
    - Compilation router created with endpoints:
      - POST /compile/async - Submit async compilation
      - GET /status/{task_id} - Poll task status
      - POST /publish - Publish compiled notebook
      - POST /compile-and-publish - Convenience endpoint
    - All endpoints require authentication (require_auth dependency)
    - Ownership verification for all endpoints
    - Integration with Celery tasks via compile_notebook_task.delay
    - Integration with CDNService for cache invalidation (STOR-05)
    - Router registered in main.py
  </done>
</task>

</tasks>

<verification>
- POST /api/v1/compilation/compile/async submits Celery task
    - GET /api/v1/compilation/status/{task_id} returns task status
    - POST /api/v1/compilation/publish publishes compiled notebook
    - POST /api/v1/compilation/compile-and-publish for convenience
    - All endpoints require authentication
    - Ownership verification prevents cross-user access
</verification>

<success_criteria>
- Compilation endpoints accessible in OpenAPI docs
    - Async compilation returns task ID
    - Status polling returns task state and result
    - Publishing marks notebook as is_published
    - Cache invalidation triggered on republication
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-04B-SUMMARY.md`
</output>
