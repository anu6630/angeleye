---
phase: 03-execution-publishing
plan: 03A
type: execute
wave: 2
depends_on: ["03-01A", "03-02A"]
files_modified:
  - backend/requirements.txt
  - backend/Dockerfile.executor
autonomous: true
requirements:
  - NOTE-04
  - SEC-01
  - INFRA-07

must_haves:
  truths:
    - "docker==7.1.0 installed in requirements.txt"
    - "nbconvert==7.17.0 installed in requirements.txt"
    - "Dockerfile.executor created with Python 3.11-slim base"
    - "Executor image includes jupyter, nbconvert, pandas, numpy, matplotlib, seaborn, scipy, scikit-learn, plotly"
    - "Non-root user (notebookuser) created with UID 1000 (SEC-01)"
  artifacts:
    - path: "backend/requirements.txt"
      provides: "Container execution dependencies"
      contains: "docker==7.1.0"
      min_lines: 2
    - path: "backend/Dockerfile.executor"
      provides: "Container image for notebook execution"
      contains: "FROM python:3.11-slim"
      min_lines: 50
  key_links:
    - from: "backend/Dockerfile.executor"
      to: "Docker daemon"
      via: "docker build -f Dockerfile.executor"
      pattern: "FROM python:3.11-slim"

---

# Phase 03-03A: Executor Docker Image and Docker SDK

<objective>
Create the Docker executor image with Python data science packages (jupyter, nbconvert, pandas, matplotlib, etc.) and install Docker SDK for programmatic container control. This is infrastructure for secure notebook execution.
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
@backend/Dockerfile (for reference)

## Security Requirements (SEC-01)

- Non-root user
- Minimal packages
- Resource limits configured at runtime (not in image)

## Resource Limits (INFRA-07)

Applied at runtime in ContainerExecutor, not in image.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Docker SDK and create executor Dockerfile</name>
  <files>
    backend/requirements.txt
    backend/Dockerfile.executor
  </files>
  <read_first>
    - backend/requirements.txt
    - backend/Dockerfile (for reference)
  </read_first>
  <action>
    Add docker SDK to backend/requirements.txt (append to end):
    ```text
    # Phase 3: Container Execution (NOTE-04, SEC-01, INFRA-07)
    docker==7.1.0
    nbconvert==7.17.0
    ```

    Create backend/Dockerfile.executor:
    ```dockerfile
    # Notebook executor container image
    # This image runs in isolated containers to execute user notebooks
    # Built with security features: non-root user, minimal packages
    #
    # SEC-01: Notebook execution containers isolated
    # INFRA-07: Containers have strict resource limits

    FROM python:3.11-slim

    # Set environment variables
    ENV PYTHONUNBUFFERED=1 \
        PYTHONDONTWRITEBYTECODE=1 \
        # Matplotlib backend for non-interactive plotting
        MPLBACKEND=Agg \
        # Limit NumPy/OMP threads to prevent CPU exhaustion
        OMP_NUM_THREADS=2 \
        MKL_NUM_THREADS=2 \
        OPENBLAS_NUM_THREADS=2

    # Install system dependencies (minimal)
    RUN apt-get update && apt-get install -y --no-install-recommends \
        # Required for matplotlib
        libfreetype6-dev \
        libpng-dev \
        # Required for some pandas operations
        gcc \
        && rm -rf /var/lib/apt/lists/*

    # Install Python packages for notebook execution
    # These packages are commonly used in data science notebooks
    RUN pip install --no-cache-dir \
        jupyter==1.1.1 \
        nbconvert==7.17.0 \
        pandas==3.0.2 \
        numpy==2.4.4 \
        matplotlib==3.10.8 \
        seaborn==0.13.2 \
        scipy==1.15.2 \
        scikit-learn==1.8.0 \
        plotly==5.24.1

    # Create non-root user for security (SEC-01)
    RUN useradd -m -u 1000 notebookuser && \
        mkdir -p /workspace && \
        chown -R notebookuser:notebookuser /workspace

    # Set working directory
    WORKDIR /workspace

    # Switch to non-root user
    USER notebookuser

    # Default command (will be overridden by celery task)
    CMD ["jupyter", "nbconvert", "--version"]
    ```
  </action>
  <verify>
    <automated>grep -q "docker==7.1.0" backend/requirements.txt && grep -q "nbconvert==7.17.0" backend/requirements.txt && grep -q "USER notebookuser" backend/Dockerfile.executor && echo "Docker SDK and executor configured"</automated>
  </verify>
  <done>
    - docker==7.1.0 added to requirements.txt for Docker Python SDK
    - nbconvert==7.17.0 added for notebook to HTML conversion
    - Dockerfile.executor created with:
      - Python 3.11-slim base image
      - jupyter, nbconvert, pandas, numpy, matplotlib, seaborn, scipy, scikit-learn, plotly
      - Non-root user (notebookuser) with UID 1000 (SEC-01)
      - Minimal system dependencies (libfreetype6-dev, libpng-dev, gcc)
      - MPLBACKEND=Agg for non-interactive plotting
      - Thread limits (OMP_NUM_THREADS=2) to prevent CPU exhaustion
      - /workspace directory owned by notebookuser
  </done>
</task>

</tasks>

<verification>
- docker==7.1.0 in requirements.txt
- nbconvert==7.17.0 in requirements.txt
- Dockerfile.executor created with non-root user (notebookuser)
- Executor image includes all data science packages
- MPLBACKEND=Agg configured for headless plotting
</verification>

<success_criteria>
- Dockerfile.executor exists and is valid
- Image can be built with: docker build -f backend/Dockerfile.executor -t notebooksocial-executor:latest backend
- Built image contains notebookuser user
- All required Python packages install successfully
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-publishing/03-03A-SUMMARY.md`
</output>
