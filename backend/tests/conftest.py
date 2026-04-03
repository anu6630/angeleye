"""
Shared pytest fixtures for Phase 3 tests.

TEST-01: Backend has unit tests for all API endpoints
TEST-02: Frontend has component tests for UI components
"""
import pytest
import tempfile
import os
from typing import Generator
from unittest.mock import Mock, MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from docker import DockerClient
import boto3

from app.db.base import Base
from app.core.config import settings


# ===== Database Fixtures =====

@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a fresh database session for each test."""
    # Use in-memory SQLite for fast tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Create tables
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture(scope="function")
def test_user(db_session: Session) -> dict:
    """Create a test user in the database."""
    from app.models.user import User

    user = User(
        oauth_provider="google",
        oauth_id="test-google-id-123",
        username="testuser",
        email="test@example.com",
        avatar_url="https://example.com/avatar.jpg"
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    return {
        "id": user.id,
        "user_id": user.id,
        "oauth_provider": "google",
        "username": "testuser",
        "email": "test@example.com"
    }


@pytest.fixture(scope="function")
def test_notebook(db_session: Session, test_user: dict) -> dict:
    """Create a test notebook in the database."""
    from app.models.notebook import Notebook
    from app.models.notebook_cell import NotebookCell

    notebook = Notebook(
        user_id=test_user["id"],
        title="Test Notebook",
        description="A test notebook for compilation",
        is_published=False
    )
    db_session.add(notebook)
    db_session.commit()
    db_session.refresh(notebook)

    # Add some cells
    cell1 = NotebookCell(
        notebook_id=notebook.id,
        cell_type="code",
        content="print('Hello, World!')",
        order_index=0
    )
    cell2 = NotebookCell(
        notebook_id=notebook.id,
        cell_type="markdown",
        content="# Test Heading",
        order_index=1
    )
    db_session.add_all([cell1, cell2])
    db_session.commit()

    return {
        "id": notebook.id,
        "notebook_id": notebook.id,
        "user_id": notebook.user_id,
        "title": notebook.title,
        "cells": [
            {"cell_type": "code", "content": "print('Hello, World!')", "order_index": 0},
            {"cell_type": "markdown", "content": "# Test Heading", "order_index": 1}
        ]
    }


# ===== Mock Docker Fixture =====

@pytest.fixture(scope="function")
def mock_docker_client() -> Mock:
    """Mock Docker client for container execution tests."""
    mock_client = MagicMock(spec=DockerClient)

    # Mock container
    mock_container = MagicMock()
    mock_container.wait.return_value = {"StatusCode": 0}
    mock_container.logs.return_value = b"Execution completed"
    mock_client.containers.run.return_value = mock_container
    mock_client.containers.list.return_value = []

    return mock_client


# ===== Mock S3/MinIO Fixture =====

@pytest.fixture(scope="function")
def mock_s3_client() -> Mock:
    """Mock boto3 S3 client for storage tests."""
    mock_client = MagicMock(spec=boto3.client)

    # Mock upload operations
    mock_client.upload_file.return_value = None
    mock_client.upload_fileobj.return_value = None
    mock_client.generate_presigned_url.return_value = "https://example.com/presigned-url"
    mock_client.generate_presigned_post.return_value = {
        "url": "https://example.com/presigned-post",
        "fields": {"key": "value"}
    }
    mock_client.delete_object.return_value = None
    mock_client.head_bucket.return_value = True

    return mock_client


@pytest.fixture(scope="function")
def mock_storage_service(mock_s3_client: Mock) -> Mock:
    """Mock StorageService for tests."""
    from unittest.mock import patch

    with patch("app.services.storage_service.boto3.client") as mock_boto:
        mock_boto.client.return_value = mock_s3_client

        from app.services.storage_service import StorageService
        service = StorageService()

        # Override client with mock
        service.s3_client = mock_s3_client

        yield service


# ===== Mock Celery Fixture =====

@pytest.fixture(scope="function")
def mock_celery_app() -> Mock:
    """Mock Celery app for task tests."""
    mock_app = MagicMock()
    mock_app.conf.update = MagicMock()
    mock_app.autodiscover_tasks = MagicMock()
    return mock_app


# ===== Temporary Directory Fixture =====

@pytest.fixture(scope="function")
def temp_dir() -> Generator[str, None, None]:
    """Create a temporary directory for file operations."""
    with tempfile.TemporaryDirectory() as tmpdir:
        yield tmpdir


# ===== Sample CSV File Fixture =====

@pytest.fixture(scope="function")
def sample_csv_file(temp_dir: str) -> str:
    """Create a sample CSV file for testing dataset upload."""
    import csv

    csv_path = os.path.join(temp_dir, "test_data.csv")
    with open(csv_path, "w", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(["name", "age", "city"])
        writer.writerow(["Alice", 30, "New York"])
        writer.writerow(["Bob", 25, "San Francisco"])
        writer.writerow(["Charlie", 35, "Chicago"])

    return csv_path


# ===== Mock Redis Fixture =====

@pytest.fixture(scope="function")
def mock_redis() -> Mock:
    """Mock Redis client for Celery tests."""
    mock_client = MagicMock()
    mock_client.ping.return_value = True
    mock_client.get.return_value = None
    mock_client.set.return_value = True
    mock_client.delete.return_value = 1
    return mock_client


# ===== Auth Fixture =====

@pytest.fixture(scope="function")
def auth_headers(test_user: dict) -> dict:
    """Mock authentication headers for API tests."""
    return {
        "Authorization": f"Bearer mock-token-{test_user['id']}",
        "Content-Type": "application/json"
    }
