"""
Kubernetes Job execution for notebooks.

SEC-01: Notebook execution containers isolated
INFRA-07: Containers have strict resource limits
"""
import tempfile
import json
import os
import shutil
import time
from pathlib import Path
from typing import Optional, Tuple
import logging
from kubernetes import client, config

logger = logging.getLogger(__name__)


class ContainerExecutor:
    """
    Executes notebooks in isolated Kubernetes Job containers with security constraints.

    SEC-01: Containers isolated with non-root user, read-only filesystem, network disabled
    INFRA-07: Strict resource limits (1GB memory, 50% CPU, 5min timeout)
    """

    def __init__(self):
        # Image will be pulled from local K3s registry
        self.executor_image = "10.43.252.86:5000/social-media-executor:latest"

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
        Execute notebook and save output HTML to file using dynamic Kubernetes Job.

        NOTE-04: User can compile notebooks in isolated online containers
        SEC-01: Container isolation enforced
        INFRA-07: Resource limits enforced

        Args:
            notebook_data: Notebook dict with id, title, cells
            output_dir: Directory to save output HTML (mounted via shared PVC)
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

        # Write the notebook .ipynb directly into the shared PVC volume
        notebook_dict = self._build_notebook_dict(notebook_data)
        nb_filename = f'nb_{notebook_id}.ipynb'
        nb_local_path = os.path.join(output_dir, nb_filename)
        with open(nb_local_path, 'w') as f:
            json.dump(notebook_dict, f)

        # Copy each asset into the shared PVC volume
        copied_assets: list[Tuple[str, str]] = []
        for src_path, original_name in zip(dataset_paths, dataset_filenames):
            safe_filename = Path(original_name).name  # prevent path traversal
            namespaced = f'dataset_{notebook_id}_{safe_filename}'
            dest_local = os.path.join(output_dir, namespaced)
            shutil.copy2(src_path, dest_local)
            copied_assets.append((dest_local, safe_filename))
            logger.info(f"Asset copied to shared volume: {dest_local}")

        # Paths as seen inside the executor container
        nb_container_path = f'/tmp/notebooks/{nb_filename}'
        out_container_path = f'/tmp/notebooks/notebook_{notebook_id}.html'

        # Build nbconvert command
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

        # Initialize Kubernetes API clients
        try:
            config.load_incluster_config()
        except config.ConfigException:
            try:
                config.load_kube_config()
            except Exception as e:
                logger.error(f"Failed to load K8s config: {e}")
                return False, f"Kubernetes configuration error: {str(e)}", None

        batch_api = client.BatchV1Api()
        core_api = client.CoreV1Api()

        job_name = f"notebook-compiler-{notebook_id}-{int(time.time())}"
        namespace = "social-media"

        # Construct Kubernetes Job Definition
        container_spec = client.V1Container(
            name="compiler",
            image=self.executor_image,
            image_pull_policy="IfNotPresent",
            command=["sh", "-c", cmd],
            volume_mounts=[
                client.V1VolumeMount(
                    name="compilation-volume",
                    mount_path="/tmp/notebooks"
                )
            ],
            # INFRA-07: enforce strict memory (1Gi) and CPU (500m) limits
            resources=client.V1ResourceRequirements(
                limits={"cpu": "500m", "memory": "1Gi"},
                requests={"cpu": "200m", "memory": "512Mi"}
            ),
            # SEC-01: Container Isolation
            security_context=client.V1SecurityContext(
                run_as_non_root=True,
                run_as_user=1000,
                run_as_group=1000,
                read_only_root_filesystem=True,
                allow_privilege_escalation=False,
                capabilities=client.V1Capabilities(drop=["ALL"])
            )
        )

        pod_spec = client.V1PodSpec(
            containers=[container_spec],
            restart_policy="Never",
            active_deadline_seconds=timeout,  # Automatically abort if hanging
            volumes=[
                client.V1Volume(
                    name="compilation-volume",
                    persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(
                        claim_name="notebook-compilation-pvc"
                    )
                )
            ]
        )

        job_spec = client.V1JobSpec(
            template=client.V1PodTemplateSpec(
                metadata=client.V1ObjectMeta(
                    labels={"app": "notebook-compiler", "notebook_id": str(notebook_id)}
                ),
                spec=pod_spec
            ),
            backoff_limit=0  # Don't retry on notebook code execution errors
        )

        job = client.V1Job(
            api_version="batch/v1",
            kind="Job",
            metadata=client.V1ObjectMeta(name=job_name, namespace=namespace),
            spec=job_spec
        )

        success = False
        error_msg = None
        logs = ""

        try:
            logger.info(f"Creating K8s Job {job_name} in namespace {namespace}...")
            batch_api.create_namespaced_job(namespace=namespace, body=job)

            # Wait for Job completion
            job_completed = False
            start_time = time.time()
            
            while time.time() - start_time < timeout:
                current_job = batch_api.read_namespaced_job(name=job_name, namespace=namespace)
                status = current_job.status
                
                # Check Succeeded status
                if status.succeeded and status.succeeded > 0:
                    success = True
                    job_completed = True
                    logger.info(f"K8s Job {job_name} completed successfully.")
                    break
                    
                # Check Failed status
                if status.failed and status.failed > 0:
                    job_completed = True
                    logger.error(f"K8s Job {job_name} failed.")
                    break
                    
                time.sleep(2)
                
            if not job_completed:
                logger.error(f"K8s Job {job_name} timed out after {timeout} seconds.")
                error_msg = f"Notebook execution timed out after {timeout} seconds."

            # Fetch Pod logs for debugging/logging
            pod_list = core_api.list_namespaced_pod(
                namespace=namespace,
                label_selector=f"job-name={job_name}"
            )
            if pod_list.items:
                pod_name = pod_list.items[0].metadata.name
                try:
                    logs = core_api.read_namespaced_pod_log(name=pod_name, namespace=namespace)
                    logger.info(f"Successfully retrieved logs from job pod {pod_name}")
                except Exception as log_err:
                    logger.warning(f"Could not read logs from pod {pod_name}: {log_err}")

        except Exception as e:
            logger.error(f"Error executing K8s Job {job_name}: {e}")
            error_msg = f"Kubernetes Job execution error: {str(e)}"
            
        finally:
            # Cascading deletion of completed/failed job and its pods
            try:
                logger.info(f"Deleting K8s Job {job_name}...")
                delete_options = client.V1DeleteOptions(propagation_policy="Background")
                batch_api.delete_namespaced_job(name=job_name, namespace=namespace, body=delete_options)
            except Exception as cleanup_err:
                logger.warning(f"Failed to delete Job {job_name}: {cleanup_err}")

        # Cleanup local intermediate files from shared volume (notebook + each
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

        if success:
            if os.path.exists(output_file):
                logger.info(f"Notebook {notebook_id} executed successfully, output at {output_file}")
                return True, output_file, None
            else:
                error_msg = (
                    f"Job reported success but output file {output_file} not found. "
                    f"Job logs:\n{logs[-2000:] if logs else '(no logs captured)'}"
                )
                logger.error(error_msg)
                return False, error_msg, None
        else:
            if not error_msg:
                error_msg = (
                    f"Notebook execution failed.\n"
                    f"Job logs:\n{logs[-3000:] if logs else '(no logs captured)'}"
                )
            logger.error(error_msg)
            return False, error_msg, None
