"""
Tests for CompilationService.

NOTE-04: User can compile notebooks in isolated online containers
"""
import pytest
from unittest.mock import MagicMock, patch

pytestmark = pytest.mark.integration


class TestCompilationService:
    """Test compilation orchestration."""

    def test_compilation_service_initialization(self, db_session):
        """Test CompilationService initializes with dependencies."""
        from app.services.compilation_service import CompilationService

        with patch("app.services.compilation_service.ContainerExecutor"), \
             patch("app.services.compilation_service.StorageService"), \
             patch("app.services.compilation_service.DatasetService"):

            service = CompilationService(db_session)

            assert hasattr(service, "executor")
            assert hasattr(service, "storage")
            assert hasattr(service, "dataset_service")

    def test_compile_notebook_workflow(self, db_session, test_notebook, temp_dir):
        """Test full compilation workflow."""
        from app.services.compilation_service import CompilationService

        with patch("app.services.compilation_service.ContainerExecutor") as mock_executor, \
             patch("app.services.compilation_service.StorageService") as mock_storage:

            # Mock successful execution
            mock_executor_instance = MagicMock()
            mock_executor_instance.execute_notebook_to_file.return_value = (
                True,
                f"{temp_dir}/output.html",
                None
            )
            mock_executor.return_value = mock_executor_instance

            service = CompilationService(db_session)

            result = service.compile_notebook(
                notebook_id=test_notebook["id"],
                output_dir=temp_dir
            )

            assert result["status"] == "success"
            assert "output_url" in result

    def test_compile_notebook_not_found(self, db_session):
        """Test compilation fails for non-existent notebook."""
        from app.services.compilation_service import CompilationService

        with patch("app.services.compilation_service.ContainerExecutor"):
            service = CompilationService(db_session)

            result = service.compile_notebook(notebook_id=99999)

            assert result["status"] == "failed"
            assert "not found" in result["error"].lower()
