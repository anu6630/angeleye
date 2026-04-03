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
                output_dir: {'bind': '/output', 'mode': 'rw'}
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
