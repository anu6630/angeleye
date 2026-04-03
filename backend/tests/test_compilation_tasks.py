"""
Tests for Celery compilation tasks.

INFRA-06: Celery manages async notebook compilation tasks
"""
import pytest
from unittest.mock import MagicMock, patch
from celery import Celery

pytestmark = pytest.mark.integration


@pytest.fixture
def mock_celery_task():
    """Mock Celery task with bind=True support."""
    task = MagicMock()
    task.request = MagicMock()
    task.request.id = "test-task-id"
    return task


class TestCompilationTasks:
    """Test async compilation tasks."""

    def test_get_notebook_with_cells(self, db_session, test_notebook):
        """Test notebook retrieval with cells ordered."""
        from app.tasks.compilation_tasks import get_notebook_with_cells

        notebook_data = get_notebook_with_cells(test_notebook["id"], db_session)

        assert notebook_data["id"] == test_notebook["id"]
        assert len(notebook_data["cells"]) == 2
        assert notebook_data["cells"][0]["order_index"] == 0

    def test_compile_notebook_task_success(self, db_session, test_notebook, mock_celery_task):
        """Test successful compilation task execution."""
        from app.tasks.compilation_tasks import compile_notebook_task

        with patch("app.tasks.compilation_tasks.CompilationService") as mock_service_class:
            mock_service = MagicMock()
            mock_service.compile_notebook.return_value = {
                "status": "success",
                "notebook_id": test_notebook["id"],
                "output_url": "https://example.com/output",
                "output_key": "notebooks/1/v123/output.html"
            }
            mock_service_class.return_value = mock_service

            # Bind task to mock
            compile_notebook_task.bind = MagicMock(return_value=compile_notebook_task)
            compile_notebook_task.db = db_session

            result = compile_notebook_task(test_notebook["id"])

            assert result["status"] == "success"
            assert "output_url" in result

    def test_get_compilation_status(self):
        """Test task status polling."""
        from app.tasks.compilation_tasks import get_compilation_status
        from celery.result import AsyncResult

        with patch("app.tasks.compilation_tasks.AsyncResult") as mock_result:
            mock_result_instance = MagicMock()
            mock_result_instance.state = "SUCCESS"
            mock_result_instance.successful.return_value = True
            mock_result_instance.result = {"status": "success"}
            mock_result.return_value = mock_result_instance

            status = get_compilation_status("test-task-id")

            assert status["state"] == "SUCCESS"
            assert status["result"]["status"] == "success"
