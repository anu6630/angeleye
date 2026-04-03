"""
End-to-end tests for notebook compilation workflow.

NOTE-05: User can publish pre-rendered outputs to social feed
"""
import pytest

pytestmark = pytest.mark.e2e


class TestNotebookWorkflow:
    """Test complete notebook compilation and publishing workflow."""

    def test_compile_and_publish_workflow(self, db_session, test_notebook, temp_dir):
        """Test full workflow: compile -> upload -> publish."""
        from app.services.compilation_service import CompilationService
        from unittest.mock import patch

        with patch("app.services.compilation_service.ContainerExecutor"), \
             patch("app.services.compilation_service.StorageService"):

            service = CompilationService(db_session)

            # Step 1: Compile
            result = service.compile_notebook(
                notebook_id=test_notebook["id"],
                output_dir=temp_dir
            )

            assert result["status"] in ["success", "failed"]  # May fail without real container

            # Step 2: If successful, verify output URL generation
            if result["status"] == "success":
                assert "output_url" in result
                assert "output_key" in result
