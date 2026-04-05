"""
Unit tests for SearchService.

Tests Meilisearch integration, notebook indexing, and search operations.
Uses factory functions for test data and mocks for external services.
"""
import sys
import pytest
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

# Mock meilisearch before importing SearchService
sys.modules['meilisearch'] = MagicMock()
sys.modules['meilisearch.errors'] = MagicMock()

from app.services.search_service import SearchService
from tests.test_factories import create_user, create_notebook, create_notebook_cell


class TestSearchServiceIndex:
    """Test notebook indexing operations"""

    @patch('app.services.search_service.meilisearch.Client')
    def test_index_notebook(self, mock_meilisearch_client, db_session: Session):
        """Test indexing a notebook in Meilisearch"""
        # Setup mock client
        mock_client_instance = MagicMock()
        mock_index = MagicMock()
        mock_client_instance.index.return_value = mock_index
        mock_meilisearch_client.return_value = mock_client_instance

        service = SearchService(db_session)

        user = create_user(db_session, username="testauthor")
        notebook = create_notebook(db_session, user_id=user.id, title="Test Notebook")

        # Add cells
        create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="code",
            content="print('hello world')",
            order_index=0
        )
        create_notebook_cell(
            db_session,
            notebook_id=notebook.id,
            cell_type="markdown",
            content="# Heading",
            order_index=1
        )

        # Index the notebook
        service.index_notebook(notebook)

        # Verify update_documents was called
        mock_index.update_documents.assert_called_once()

        # Get the call arguments
        call_args = mock_index.update_documents.call_args
        documents = call_args[0][0]

        assert len(documents) == 1
        doc = documents[0]
        assert doc["id"] == notebook.id
        assert doc["title"] == "Test Notebook"
        assert doc["author"] == "testauthor"
        assert "print('hello world')" in doc["content"]
        assert "# Heading" not in doc["content"]  # Markdown cells not included

    @patch('app.services.search_service.meilisearch.Client')
    def test_index_notebook_handles_failure(self, mock_meilisearch_client, db_session: Session):
        """Test that indexing failures are logged but don't raise exceptions"""
        # Setup mock client to raise exception
        mock_client_instance = MagicMock()
        mock_index = MagicMock()
        mock_index.update_documents.side_effect = Exception("Meilisearch connection failed")
        mock_client_instance.index.return_value = mock_index
        mock_meilisearch_client.return_value = mock_client_instance

        service = SearchService(db_session)

        user = create_user(db_session)
        notebook = create_notebook(db_session, user_id=user.id)

        # Should not raise exception
        service.index_notebook(notebook)

        # Verify update_documents was attempted
        mock_index.update_documents.assert_called_once()


class TestSearchServiceSearch:
    """Test search operations"""

    @patch('app.services.search_service.meilisearch.Client')
    def test_search_notebooks(self, mock_meilisearch_client, db_session: Session):
        """Test searching notebooks"""
        # Setup mock client
        mock_client_instance = MagicMock()
        mock_index = MagicMock()
        mock_client_instance.index.return_value = mock_index

        # Mock search response
        mock_index.search.return_value = {
            "hits": [
                {
                    "id": 1,
                    "title": "Python Tutorial",
                    "content": "print('hello')",
                    "author": "user1"
                },
                {
                    "id": 2,
                    "title": "Advanced Python",
                    "content": "import pandas",
                    "author": "user2"
                }
            ],
            "estimatedTotalHits": 2
        }

        mock_meilisearch_client.return_value = mock_client_instance

        service = SearchService(db_session)

        results = service.search_notebooks(
            query="python",
            limit=10
        )

        assert len(results["notebook_ids"]) == 2
        assert results["total"] == 2
        assert 1 in results["notebook_ids"]
        assert 2 in results["notebook_ids"]
        assert results["from_meilisearch"] is True

        # Verify search was called with correct parameters
        mock_index.search.assert_called_once_with("python", {"limit": 10})

    @patch('app.services.search_service.meilisearch.Client')
    def test_search_with_filters(self, mock_meilisearch_client, db_session: Session):
        """Test searching with tab filter"""
        # Setup mock client
        mock_client_instance = MagicMock()
        mock_index = MagicMock()
        mock_client_instance.index.return_value = mock_index
        mock_index.search.return_value = {"hits": [], "estimatedTotalHits": 0}
        mock_meilisearch_client.return_value = mock_client_instance

        service = SearchService(db_session)

        # Search for original notebooks only
        service.search_notebooks(
            query="test",
            tab="originals",
            limit=10
        )

        # Verify filter was applied
        call_args = mock_index.search.call_args
        # Check that search was called with filter
        assert call_args[0][0] == "test"
        assert call_args[0][1]["filter"] == "parent_id IS NULL"

    @patch('app.services.search_service.meilisearch.Client')
    def test_search_forks_tab(self, mock_meilisearch_client, db_session: Session):
        """Test searching with forks filter"""
        # Setup mock client
        mock_client_instance = MagicMock()
        mock_index = MagicMock()
        mock_client_instance.index.return_value = mock_index
        mock_index.search.return_value = {"hits": [], "estimatedTotalHits": 0}
        mock_meilisearch_client.return_value = mock_client_instance

        service = SearchService(db_session)

        # Search for forks only
        service.search_notebooks(
            query="test",
            tab="forks",
            limit=10
        )

        # Verify filter was applied
        call_args = mock_index.search.call_args
        # Check that search was called with filter
        assert call_args[0][0] == "test"
        assert call_args[0][1]["filter"] == "parent_id IS NOT NULL"

    @patch('app.services.search_service.meilisearch.Client')
    def test_search_empty_query(self, mock_meilisearch_client, db_session: Session):
        """Test searching with empty query"""
        # Setup mock client
        mock_client_instance = MagicMock()
        mock_index = MagicMock()
        mock_client_instance.index.return_value = mock_index
        mock_index.search.return_value = {"hits": [], "estimatedTotalHits": 0}
        mock_meilisearch_client.return_value = mock_client_instance

        service = SearchService(db_session)

        results = service.search_notebooks(query="", limit=10)

        assert results["notebook_ids"] == []
        assert results["total"] == 0


class TestSearchServiceCreateIndex:
    """Test index creation operations"""

    @patch('app.services.search_service.meilisearch.Client')
    def test_create_index(self, mock_meilisearch_client, db_session: Session):
        """Test creating Meilisearch index"""
        # Setup mock client
        mock_client_instance = MagicMock()
        mock_index = MagicMock()
        mock_client_instance.index.return_value = mock_index
        mock_client_instance.create_index.return_value = {"uid": "test-index"}
        mock_meilisearch_client.return_value = mock_client_instance

        service = SearchService(db_session)

        service.create_index()

        # Verify index was created
        mock_client_instance.create_index.assert_called_once()

        # Verify searchable attributes were configured
        mock_index.update_searchable_attributes.assert_called_once_with(
            ["title", "content", "author"]
        )

        # Verify filterable attributes were configured
        mock_index.update_filterable_attributes.assert_called_once_with(["parent_id"])

    @patch('app.services.search_service.meilisearch.Client')
    def test_create_index_handles_existing_index(self, mock_meilisearch_client, db_session: Session):
        """Test that create_index handles existing index gracefully"""
        # Setup mock client to raise error for existing index
        mock_client_instance = MagicMock()
        from meilisearch.errors import MeilisearchError
        mock_client_instance.create_index.side_effect = MeilisearchError("Index already exists")
        mock_meilisearch_client.return_value = mock_client_instance

        service = SearchService(db_session)

        # Should not raise exception
        service.create_index()

        # Verify create_index was attempted
        mock_client_instance.create_index.assert_called_once()
