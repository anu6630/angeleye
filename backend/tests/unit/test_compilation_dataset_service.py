"""
Unit tests for CompilationService.

Tests compilation workflow with mocked container execution.
Uses factory functions for test data and mocks for external services.

Note: DatasetService tests omitted due to async upload complexity.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.compilation_service import CompilationService
from tests.test_factories import create_user, create_notebook


class TestCompilationService:
    """Test notebook compilation workflow"""

    @patch('app.services.compilation_service.ContainerExecutor')
    @patch('app.services.compilation_service.StorageService')
    def test_compile_notebook_success(self, mock_storage_class, mock_executor_class, db_session: Session):
        """Test successful notebook compilation"""
        # Setup mocks
        mock_executor_instance = MagicMock()
        mock_executor_instance.execute_notebook.return_value = {
            "status": "success",
            "outputs": [{"cell_id": 1, "output": "Hello World"}]
        }
        mock_executor_class.return_value = mock_executor_instance

        mock_storage_instance = MagicMock()
        mock_storage_class.return_value = mock_storage_instance

        service = CompilationService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Compile notebook - should not raise
        result = service.compile_notebook(notebook.id, user.id)

        assert result is not None

    @patch('app.services.compilation_service.ContainerExecutor')
    @patch('app.services.compilation_service.StorageService')
    def test_compile_notebook_failure(self, mock_storage_class, mock_executor_class, db_session: Session):
        """Test compilation failure handling"""
        # Setup mocks
        mock_executor_instance = MagicMock()
        mock_executor_instance.execute_notebook.return_value = {
            "status": "error",
            "error": "Syntax error"
        }
        mock_executor_class.return_value = mock_executor_instance

        mock_storage_instance = MagicMock()
        mock_storage_class.return_value = mock_storage_instance

        service = CompilationService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Compile notebook - should handle error gracefully
        result = service.compile_notebook(notebook.id, user.id)

        assert result is not None

