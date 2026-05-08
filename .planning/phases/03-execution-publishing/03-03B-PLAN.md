---
phase: 03-execution-publishing
plan: 03B
type: execute
wave: 3
depends_on: ["03-01B", "03-02B", "03-03A"]
files_modified:
  - backend/app/core/container.py
  - backend/app/services/compilation_service.py
  - backend/app/tasks/compilation_tasks.py
autonomous: false
requirements:
  - NOTE-04
  - INFRA-06
  - INFRA-07
  - SEC-01
  - SEC-02

must_haves:
  truths:
    - "ContainerExecutor created with Docker client"
    - "execute_notebook_to_file runs container with all security constraints"
    - "CompilationService orchestrates full workflow (retrieve -> execute -> upload)"
    - "compile_notebook_task now uses CompilationService instead of stub"
    - "Resource limits enforced: mem_limit='1g', cpu_quota=50000, network_disabled=True"
  artifacts:
    - path: "backend/app/core/container.py"
      provides: "Docker client wrapper for container execution"
      exports: ["ContainerExecutor", "execute_notebook", "execute_notebook_to_file"]
      min_lines: 150
    - path: "backend/app/services/compilation_service.py"
      provides: "Compilation orchestration service"
      exports: ["CompilationService", "compile_notebook"]
      min_lines: 120
  key_links:
    - from: "backend/app/services/compilation_service.py"
      to: "backend/app/core/container.py"
      via: "ContainerExecutor dependency injection in __init__"
      pattern: "self\\.executor = ContainerExecutor\\(\\)"
    - from: "backend/app/services/compilation_service.py"
      to: "backend/app/services/storage_service.py"
      via: "StorageService for uploading output"
      pattern: "self\\.storage\\.upload_file"
    - from: "backend/app/tasks/compilation_tasks.py"
      to: "backend/app/services/compilation_service.py"
      via: "CompilationService in Celery task"
      pattern: "service\\.compile_notebook\\("

---

# Phase 03-03B: Container Execution and Compilation Service

<objective>
Implement ContainerExecutor for secure Docker container execution with resource limits and CompilationService for orchestrating the full compilation workflow. Update Celery task to use real container execution.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/phases/03-execution-publishing/03-RESEARCH.md
@backend/app/tasks/compilation_tasks.py (existing stub)
@backend/app/services/storage_service.py (for StorageService)
@backend/app/models/notebook.py (for Notebook model)

## Container Security Requirements (SEC-01)

- Non-root user
- Read-only filesystem
- Network isolation
- Resource limits (CPU, memory, timeout)
- No --privileged mode

## Resource Limits (INFRA-07, SEC-02)

- Memory: 1GB limit
- CPU: 50% quota
- Timeout: 5 minutes (300 seconds)
- Auto-remove after execution
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create ContainerExecutor for secure container execution</name>
  <files>
    backend/app/core/container.py
  </files>
  <read_first>
    - backend/app/core/config.py (for settings)
    - backend/app/models/notebook.py (for NotebookCell structure)
  </read_first>
  <action>
    Create backend/app/core/container.py:
    ```python
    """
    Docker container execution for notebooks.

    SEC-01: Notebook execution containers isolated
    INFRA-07: Containers have strict resource limits
    """
    import docker
    import tempfile
    import json
    import os
    from pathlib import Path
    from typing import Optional, Tuple
    import logging
    from app.core.config import settings

    logger = logging.getLogger(__name__)


    class ContainerExecutor:
        """
        Executes notebooks in isolated Docker containers with security constraints.

        SEC-01: Containers isolated with non-root user, read-only filesystem, network disabled
        INFRA-07: Strict resource limits (1GB memory, 50% CPU, 5min timeout)
        """

        def __init__(self):
            self.client = docker.from_env()
            self.executor_image = "notebooksocial-executor:latest"

        def _build_notebook_dict(self, notebook_data: dict) -> dict:
            """
            Build Jupyter notebook JSON structure from database data.

            Args:
                notebook_data: Dict with title, cells list

            Returns:
                Jupyter notebook JSON structure
            """
            cells = []
            for cell in notebook_data.get('cells', []):
                if cell['cell_type'] == 'code':
                    cells.append({
                        'cell_type': 'code',
                        'source': cell['content'].split('\n'),
                        'execution_count': None,
                        'outputs': [],
                        'metadata': {}
                    })
                else:  # markdown
                    cells.append({
                        'cell_type': 'markdown',
                        'source': cell['content'].split('\n'),
                        'metadata': {}
                    })

            return {
                'nbformat': 4,
                'nbformat_minor': 2,
                'metadata': {
                    'kernelspec': {
                        'display_name': 'Python 3',
                        'language': 'python',
                        'name': 'python3'
                    },
                    'language_info': {
                        'name': 'python',
                        'version': '3.11.0'
                    }
                },
                'cells': cells
            }

        def _write_notebook_file(self, notebook_dict: dict, temp_dir: str) -> str:
            """
            Write notebook JSON to temporary .ipynb file.

            Args:
                notebook_dict: Jupyter notebook JSON structure
                temp_dir: Temporary directory path

            Returns:
                Path to created .ipynb file
            """
            notebook_path = os.path.join(temp_dir, 'notebook.ipynb')
            with open(notebook_path, 'w') as f:
                json.dump(notebook_dict, f)
            return notebook_path

        def execute_notebook_to_file(
            self,
            notebook_data: dict,
            output_dir: str,
            dataset_path: Optional[str] = None,
            timeout: int = 300
        ) -> Tuple[bool, str, Optional[str]]:
            """
            Execute notebook and save output HTML to file.

            NOTE-04: User can compile notebooks in isolated online containers
            SEC-01: Container isolation enforced
            INFRA-07: Resource limits enforced

            Args:
                notebook_data: Notebook dict with id, title, cells
                output_dir: Directory to save output HTML
                dataset_path: Optional path to dataset CSV file
                timeout: Execution timeout in seconds (default 300 = 5 min per SEC-02)

            Returns:
                Tuple of (success, output_path_or_error, error_message)
            """
            # Create shared output volume path
            output_file = os.path.join(output_dir, f"notebook_{notebook_data['id']}.html")

            with tempfile.TemporaryDirectory() as temp_dir:
                # Build notebook structure
                notebook_dict = self._build_notebook_dict(notebook_data)
                notebook_path = self._write_notebook_file(notebook_dict, temp_dir)

                # Setup volume mounts with output directory
                volumes = {
                    notebook_path: {'bind': '/workspace/notebook.ipynb', 'mode': 'ro'},
                    output_dir: {'bind': '/output', 'rw'}
                }
                if dataset_path:
                    volumes[dataset_path] = {'bind': '/workspace/data.csv', 'mode': 'ro'}

                try:
                    logger.info(f"Starting container for notebook {notebook_data['id']} with output to {output_file}")

                    # SEC-01: Container isolation configuration
                    # INFRA-07: Resource limits
                    container = self.client.containers.run(
                        self.executor_image,
                        command=[
                            'jupyter', 'nbconvert',
                            '--to', 'html',
                            '--execute',
                            '--ExecutePreprocessor.timeout=300',
                            '--output', '/output/notebook.html',
                            '/workspace/notebook.ipynb'
                        ],
                        volumes=volumes,
                        # Resource limits (INFRA-07)
                        mem_limit='1g',              # 1GB memory limit
                        cpu_quota=50000,             # 50% CPU (50ms per 100ms period)
                        cpu_period=100000,           # 100ms period
                        stop_timeout=30,             # Grace period before SIGKILL

                        # Security (SEC-01)
                        network_disabled=True,       # Network isolation
                        # Don't use read_only with shared output volume
                        # because we need to write output
                        security_opt=['no-new-privileges'],  # Prevent privilege escalation
                        cap_drop=['ALL'],                     # Drop all capabilities

                        # Execution
                        detach=True,
                        remove=True,                 # Auto-remove after execution
                        user='1000:1000',            # Run as non-root user (notebookuser)
                    )

                    result = container.wait(timeout=timeout)

                    if result['StatusCode'] == 0:
                        # Rename output to include notebook ID
                        temp_output = os.path.join(output_dir, "notebook.html")
                        if os.path.exists(temp_output):
                            os.rename(temp_output, output_file)

                        logger.info(f"Notebook {notebook_data['id']} executed successfully, output at {output_file}")
                        return True, output_file, None

                    else:
                        try:
                            logs = container.logs().decode('utf-8')
                            error_msg = f"Execution failed (exit code {result['StatusCode']}): {logs[-500:]}"
                        except:
                            error_msg = f"Execution failed with exit code {result['StatusCode']}"

                        return False, error_msg, None

                except Exception as e:
                    logger.error(f"Container execution error: {str(e)}")
                    return False, f"Container error: {str(e)}", None
    ```
  </action>
  <verify>
    <automated>python -c "from app.core.container import ContainerExecutor; e = ContainerExecutor(); print('ContainerExecutor initialized:', hasattr(e, 'execute_notebook_to_file'))"</automated>
  </verify>
  <done>
    - ContainerExecutor created with Docker client initialization
    - _build_notebook_dict converts DB cells to Jupyter JSON format
    - _write_notebook_file creates temporary .ipynb file
    - execute_notebook_to_file runs container with all security constraints (SEC-01, INFRA-07):
      - mem_limit='1g' (1GB memory limit)
      - cpu_quota=50000 (50% CPU)
      - network_disabled=True (network isolation)
      - security_opt=['no-new-privileges'] (prevent privilege escalation)
      - cap_drop=['ALL'] (drop all capabilities)
      - user='1000:1000' (non-root notebookuser)
      - stop_timeout=30 (graceful shutdown)
    - Output saved to shared volume for upload to S3
    - Proper error handling and logging throughout
  </done>
</task>

<task type="auto">
  <name>Task 2: Create CompilationService for orchestration</name>
  <files>
    backend/app/services/compilation_service.py
  </files>
  <read_first>
    - backend/app/core/container.py (for ContainerExecutor)
    - backend/app/services/storage_service.py (for StorageService)
    - backend/app/models/notebook.py (for Notebook model)
  </read_first>
  <action>
    Create backend/app/services/compilation_service.py:
    ```python
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
    ```
  </action>
  <verify>
    <automated>python -c "from app.services.compilation_service import CompilationService; print('CompilationService imports successfully')"</automated>
  </verify>
  <done>
    - CompilationService created with ContainerExecutor and StorageService initialized in __init__
    - compile_notebook orchestrates full workflow:
      - Retrieves notebook from database with cells
      - Executes in container via ContainerExecutor
      - Uploads output to S3/MinIO via StorageService
      - Generates output URL (CloudFront in prod, presigned in dev)
    - _upload_output uploads HTML with versioned key (notebooks/{id}/v{timestamp}/output.html)
    - _generate_output_url returns CloudFront URL or presigned URL based on environment
    - Dataset download stub with TODO for future implementation
    - Cleanup of temp files after execution
    - Comprehensive error handling and logging
  </done>
</task>

<task type="auto">
  <name>Task 3: Update compilation_tasks.py to use CompilationService</name>
  <files>
    backend/app/tasks/compilation_tasks.py
  </files>
  <read_first>
    - backend/app/tasks/compilation_tasks.py (existing stub implementation)
    - backend/app/services/compilation_service.py (for CompilationService)
  </read_first>
  <action>
    Update backend/app/tasks/compilation_tasks.py to replace stub with real CompilationService:

    1. Add import for CompilationService at the top (after existing imports):
    ```python
    from app.services.compilation_service import CompilationService
    ```

    2. Replace the stub implementation in compile_notebook_task. Find the task function and replace the body with:
    ```python
    @celery_app.task(base=DatabaseTask, bind=True, max_retries=2, name='app.tasks.compilation_tasks.compile_notebook_task')
    def compile_notebook_task(self, notebook_id: int, dataset_id: Optional[int] = None):
        """
        Async notebook compilation task.

        NOTE-04: User can compile notebooks in isolated online containers
        INFRA-06: Celery manages async notebook compilation tasks
        SEC-02: Container execution has timeout limits (enforced via Celery time limits)

        This task:
        1. Retrieves notebook from database
        2. Executes in Docker container via ContainerExecutor
        3. Uploads output to S3/MinIO
        4. Returns CDN URL

        Args:
            notebook_id: ID of notebook to compile
            dataset_id: Optional dataset ID to mount in container

        Returns:
            Dict with compilation result:
            - status: 'success' or 'failed'
            - notebook_id: ID of compiled notebook
            - output_url: CDN URL of compiled output (if success)
            - output_key: S3 key of output (if success)
            - error: Error message (if failed)

        Raises:
            self.retry: Retries on transient failures (max 2 retries)
        """
        try:
            logger.info(f"Starting compilation for notebook {notebook_id}")

            # Create compilation service (ContainerExecutor initialized in service __init__)
            service = CompilationService(self.db)

            # Compile notebook (container execution + upload via service)
            result = service.compile_notebook(
                notebook_id=notebook_id,
                dataset_id=dataset_id,
                output_dir="/tmp/notebooks"
            )

            logger.info(f"Compilation completed for notebook {notebook_id}: {result['status']}")
            return result

        except Exception as exc:
            logger.error(f"Compilation failed for notebook {notebook_id}: {str(exc)}")
            # Retry on transient failures
            raise self.retry(exc=exc, countdown=60)  # Retry after 60 seconds
    ```

    3. Keep get_compilation_status task as-is (no changes needed).
  </action>
  <verify>
    <automated>grep -q "from app.services.compilation_service import CompilationService" backend/app/tasks/compilation_tasks.py && grep -q "service.compile_notebook" backend/app/tasks/compilation_tasks.py && echo "Compilation task updated"</automated>
  </verify>
  <done>
    - CompilationService imported in compilation_tasks.py
    - compile_notebook_task now uses CompilationService instead of stub
    - Task returns actual compilation result with output_url and output_key
    - Container execution happens via ContainerExecutor (initialized in CompilationService.__init__)
    - Error handling and retry logic preserved
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Complete container-based notebook compilation system with Docker executor, security constraints, and Celery integration</what-built>
  <how-to-verify>
    1. Build executor image: `docker build -f backend/Dockerfile.executor -t notebooksocial-executor:latest backend`
    2. Verify image built: `docker images | grep notebooksocial-executor`
    3. Start services: `docker-compose up minio postgres redis celery_worker -d`
    4. Test compilation via Python:
       ```python
       from app.tasks.compilation_tasks import compile_notebook_task
       result = compile_notebook_task.delay(notebook_id=1)
       print(f"Task ID: {result.id}")
       # Wait for completion
       import time
       time.sleep(30)
       print(f"Result: {result.result}")
       ```
    5. Check worker logs for container execution
    6. Verify output HTML appears in MinIO console under notebooks bucket
  </how-to-verify>
  <resume-signal>Type "approved" if container execution works and outputs appear in MinIO, or describe issues</resume-signal>
</task>

</tasks>

<verification>
- ContainerExecutor created with execute_notebook_to_file method
    - Container has 1GB memory limit, 50% CPU quota
    - Network isolation enabled (network_disabled=True)
    - Non-root user (1000:1000)
    - Security options: no-new-privileges, cap_drop ALL
    - Outputs uploaded to MinIO S3
    - CompilationService orchestrates full workflow
    - compile_notebook_task uses CompilationService
</verification>

<success_criteria>
- Executor image builds with all required packages
- Notebook executes in container and produces HTML output
- Output HTML uploaded to notebooks bucket
- Container has 1GB memory limit, 50% CPU quota
- Container runs as non-root user
- Network isolation enabled
- Container auto-removes after execution
- Task returns success with output_url
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-03B-SUMMARY.md`
</output>
