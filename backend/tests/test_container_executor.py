"""
Tests for ContainerExecutor.

SEC-01: Notebook execution containers isolated
INFRA-07: Containers have strict resource limits
"""
import pytest
from unittest.mock import MagicMock, patch

pytestmark = pytest.mark.unit


class TestContainerExecutor:
    """Test Docker container execution."""

    def test_container_executor_initialization(self, mock_docker_client):
        """Test ContainerExecutor initializes with Docker client."""
        from app.core.container import ContainerExecutor

        with patch("app.core.container.docker.from_env") as mock_docker:
            mock_docker.return_value = mock_docker_client

            executor = ContainerExecutor()

            assert executor.client is not None
            assert executor.executor_image == "notebooksocial-executor:latest"

    def test_build_notebook_dict(self, test_notebook):
        """Test notebook dict conversion for Jupyter format."""
        from app.core.container import ContainerExecutor

        executor = ContainerExecutor()
        notebook_dict = executor._build_notebook_dict(test_notebook)

        assert notebook_dict["nbformat"] == 4
        assert len(notebook_dict["cells"]) == 2
        assert notebook_dict["cells"][0]["cell_type"] == "code"
        assert notebook_dict["cells"][1]["cell_type"] == "markdown"

    def test_execute_notebook_resource_limits(self, test_notebook, mock_docker_client):
        """Test that containers are created with resource limits (INFRA-07, SEC-01)."""
        from app.core.container import ContainerExecutor

        with patch("app.core.container.docker.from_env") as mock_docker:
            mock_docker.return_value = mock_docker_client

            executor = ContainerExecutor()
            success, result, _ = executor.execute_notebook(test_notebook)

            # Verify container was called with security limits
            call_kwargs = mock_docker_client.containers.run.call_args.kwargs
            assert call_kwargs["mem_limit"] == "1g"
            assert call_kwargs["cpu_quota"] == 50000
            assert call_kwargs["network_disabled"] is True
            assert call_kwargs["read_only"] is True
            assert call_kwargs["user"] == "1000:1000"

    def test_execute_notebook_timeout(self, test_notebook, mock_docker_client):
        """Test that container execution respects timeout (SEC-02)."""
        from app.core.container import ContainerExecutor

        with patch("app.core.container.docker.from_env") as mock_docker:
            mock_docker.return_value = mock_docker_client

            executor = ContainerExecutor()
            # Test with custom timeout
            success, result, _ = executor.execute_notebook(
                test_notebook,
                timeout=600  # 10 minutes
            )

            call_kwargs = mock_docker_client.containers.run.call_args.kwargs
            assert call_kwargs["stop_timeout"] == 30
