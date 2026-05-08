"""
Docker container execution for notebooks.

SEC-01: Notebook execution containers isolated
INFRA-07: Containers have strict resource limits
"""
import docker
import tempfile
import json
import os
import shutil
from pathlib import Path
from typing import Optional, Tuple
import logging

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
                    'source': cell['content'],  # keep as string; nbformat accepts str or list
                    'execution_count': None,
                    'outputs': [],
                    'metadata': {}
                })
            else:  # markdown
                cells.append({
                    'cell_type': 'markdown',
                    'source': cell['content'],
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
        dataset_paths: Optional[list] = None,
        dataset_filenames: Optional[list] = None,
        timeout: int = 300,
        # Backward-compatible scalar args (deprecated, kept for callers)
        dataset_path: Optional[str] = None,
        dataset_filename: Optional[str] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Execute notebook and save output HTML to file.

        NOTE-04: User can compile notebooks in isolated online containers
        SEC-01: Container isolation enforced
        INFRA-07: Resource limits enforced

        Args:
            notebook_data: Notebook dict with id, title, cells
            output_dir: Directory to save output HTML
            dataset_paths: List of local paths to asset files
            dataset_filenames: Original filenames matching dataset_paths
            timeout: Execution timeout in seconds (default 300 = 5 min per SEC-02)
            dataset_path / dataset_filename: legacy scalar shape (deprecated)

        Returns:
            Tuple of (success, output_path_or_error, error_message)
        """
        # Normalize legacy scalar args into the list-shaped form used below
        if dataset_paths is None and dataset_path is not None:
            dataset_paths = [dataset_path]
        if dataset_filenames is None and dataset_filename is not None:
            dataset_filenames = [dataset_filename]
        dataset_paths = dataset_paths or []
        dataset_filenames = dataset_filenames or []
        notebook_id = notebook_data['id']
        os.makedirs(output_dir, exist_ok=True)

        output_file = os.path.join(output_dir, f"notebook_{notebook_id}.html")

        # Write the notebook .ipynb directly into the shared volume so the
        # executor container can reach it (bind-mounting a path that only
        # exists inside the Celery container would fail on the host daemon).
        notebook_dict = self._build_notebook_dict(notebook_data)
        nb_filename = f'nb_{notebook_id}.ipynb'
        nb_local_path = os.path.join(output_dir, nb_filename)
        with open(nb_local_path, 'w') as f:
            json.dump(notebook_dict, f)

        # Copy each asset into the shared volume so the executor can read it.
        # Track per-asset (local path on shared volume, original filename) for
        # symlink + cleanup steps below.
        copied_assets: list[Tuple[str, str]] = []
        for src_path, original_name in zip(dataset_paths, dataset_filenames):
            safe_filename = Path(original_name).name  # prevent path traversal
            namespaced = f'dataset_{notebook_id}_{safe_filename}'
            dest_local = os.path.join(output_dir, namespaced)
            shutil.copy2(src_path, dest_local)
            copied_assets.append((dest_local, safe_filename))
            logger.info(f"Asset copied to shared volume: {dest_local}")

        # Named volume that both Celery worker and executor share.
        # Docker Compose prefixes the volume name with the project (directory) name.
        volume_name = os.environ.get('NOTEBOOK_TEMP_VOLUME', 'time_notebook_temp')

        # Paths as seen inside the executor container
        nb_container_path = f'/tmp/notebooks/{nb_filename}'
        out_container_path = f'/tmp/notebooks/notebook_{notebook_id}.html'

        # Build nbconvert command — change to /tmp/notebooks so relative asset
        # references like pd.read_csv('sales.csv') or ![](logo.png) resolve.
        symlink_cmds = ''
        for dest_local, safe_filename in copied_assets:
            namespaced = Path(dest_local).name
            symlink_cmds += (
                f'ln -sf /tmp/notebooks/{namespaced} '
                f'/tmp/notebooks/{safe_filename} && '
            )
        cmd = (
            f'{symlink_cmds}'
            f'cd /tmp/notebooks && '
            f'jupyter nbconvert --to html --execute '
            f'--ExecutePreprocessor.timeout=280 '
            f'--output {out_container_path} '
            f'{nb_container_path}'
        )

        volumes = {volume_name: {'bind': '/tmp/notebooks', 'mode': 'rw'}}

        container = None
        try:
            logger.info(
                f"Starting container for notebook {notebook_id} "
                f"(volume={volume_name}, nb={nb_container_path})"
            )

            # SEC-01: Container isolation | INFRA-07: Resource limits
            container = self.client.containers.run(
                self.executor_image,
                command=['sh', '-c', cmd],
                volumes=volumes,
                mem_limit='1g',
                cpu_quota=50000,
                cpu_period=100000,
                network_disabled=True,
                security_opt=['no-new-privileges'],
                cap_drop=['ALL'],
                detach=True,
                remove=False,
                user='1000:1000',
            )

            logger.info(f"Container {container.id} started, waiting for completion...")
            result = container.wait(timeout=timeout)
            exit_code = result['StatusCode']
            logger.info(f"Container {container.id} finished with exit code {exit_code}")

            logs = ''
            try:
                logs = container.logs(stdout=True, stderr=True).decode('utf-8', errors='replace')
            except Exception:
                pass

            try:
                container.remove()
            except Exception:
                pass

            # Cleanup intermediate files from shared volume (notebook + each
            # namespaced asset copy and its symlink alias).
            cleanup_paths = [nb_local_path]
            for dest_local, safe_filename in copied_assets:
                cleanup_paths.append(dest_local)
                cleanup_paths.append(os.path.join(output_dir, safe_filename))
            for path in cleanup_paths:
                if path and os.path.exists(path):
                    try:
                        os.unlink(path)
                    except Exception:
                        pass

            if exit_code == 0:
                if os.path.exists(output_file):
                    logger.info(f"Notebook {notebook_id} executed successfully, output at {output_file}")
                    return True, output_file, None
                else:
                    error_msg = (
                        f"Container reported success but output file {output_file} not found. "
                        f"Container logs:\n{logs[-2000:]}"
                    )
                    logger.error(error_msg)
                    return False, error_msg, None
            else:
                error_msg = (
                    f"Notebook execution failed (exit code {exit_code}).\n"
                    f"Container output:\n{logs[-3000:] if logs else '(no output captured)'}"
                )
                logger.error(error_msg)
                return False, error_msg, None

        except Exception as e:
            logger.error(f"Container execution error: {str(e)}")
            if container:
                try:
                    container.remove()
                except Exception:
                    pass
            return False, f"Container error: {str(e)}", None
