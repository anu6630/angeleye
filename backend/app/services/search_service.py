import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_
import meilisearch
from meilisearch.errors import MeilisearchError, MeilisearchCommunicationError

from app.core.config import settings
from app.models.notebook import Notebook
from app.models.user import User

logger = logging.getLogger(__name__)


class SearchService:
    """Service for Meilisearch integration with PostgreSQL fallback"""

    def __init__(self, db: Session):
        self.db = db
        self.client = meilisearch.Client(
            settings.MEILISEARCH_URL,
            timeout=settings.MEILISEARCH_TIMEOUT
        )
        self.index_name = settings.MEILISEARCH_INDEX_NAME

    def create_index(self) -> None:
        """Create Meilisearch index with field configuration"""
        try:
            # Create index with primary key
            self.client.create_index(self.index_name, {"primaryKey": "id"})

            # Configure searchable fields
            index = self.client.index(self.index_name)
            index.update searchable_attributes(["title", "content", "author"])

            # Configure filterable fields (for faceted search)
            index.update_filterable_attributes(["parent_id"])

            # Configure sortable fields
            index.update_sortable_attributes(["created_at"])

            # Set ranking rules
            index.update_ranking_rules([
                "words",
                "typo",
                "proximity",
                "attribute",
                "sort",
                "exactness"
            ])

            logger.info(f"Created Meilisearch index: {self.index_name}")

        except MeilisearchError as e:
            logger.warning(f"Failed to create Meilisearch index (may already exist): {e}")

    def index_notebook(self, notebook: Notebook) -> None:
        """Index a notebook in Meilisearch

        Per CONTEXT.md D-19: Real-time sync on every save, log failures.
        Sync failures should not block notebook save operations.
        """
        try:
            # Load cells if not already loaded
            if not notebook.cells:
                from app.models.notebook_cell import NotebookCell
                cells = (
                    self.db.query(NotebookCell)
                    .filter(NotebookCell.notebook_id == notebook.id)
                    .all()
                )
            else:
                cells = notebook.cells

            # Concatenate code cell content for search
            content = "\n".join([
                cell.content for cell in cells
                if cell.cell_type == "code"
            ])

            # Build document
            document = {
                "id": notebook.id,
                "title": notebook.title,
                "content": content,
                "author": notebook.user.username,
                "parent_id": notebook.parent_id,  # null for originals, int for forks
                "is_published": notebook.is_published,
                "created_at": notebook.created_at.isoformat()
            }

            # Update index
            self.client.index(self.index_name).update_documents([document])

        except Exception as e:
            # Log error but don't fail - search index failures shouldn't block saves
            logger.warning(f"Failed to index notebook {notebook.id} in Meilisearch: {e}")

    def search_notebooks(
        self,
        query: str,
        tab: str = "all",
        limit: int = 50
    ) -> Dict:
        """Search notebooks with faceted filtering

        Per CONTEXT.md D-20: Fallback to PostgreSQL LIKE on connection failure.

        Args:
            query: Search query string
            tab: Filter tab ("all", "originals", "forks")
            limit: Max results to return

        Returns:
            Dict with notebook_ids, total, from_meilisearch flag
        """
        try:
            # Try Meilisearch first
            index = self.client.index(self.index_name)

            # Build filter for faceted search
            filter_expr = None
            if tab == "originals":
                filter_expr = "parent_id IS NULL"
            elif tab == "forks":
                filter_expr = "parent_id IS NOT NULL"

            # Execute search
            search_params = {"limit": limit}
            if filter_expr:
                search_params["filter"] = filter_expr

            results = index.search(query, search_params)

            # Extract notebook IDs
            notebook_ids = [int(hit["id"]) for hit in results.get("hits", [])]
            total = results.get("estimatedTotalHits", 0)

            return {
                "notebook_ids": notebook_ids,
                "total": total,
                "from_meilisearch": True
            }

        except MeilisearchCommunicationError:
            # Fallback to PostgreSQL
            logger.warning("Meilisearch unavailable, falling back to PostgreSQL LIKE search")

            # Build base query
            notebooks_query = (
                self.db.query(Notebook.id)
                .join(User, Notebook.user_id == User.id)
                .filter(Notebook.is_published == True)
                .filter(Notebook.is_archived == False)
                .filter(
                    or_(
                        Notebook.title.ilike(f"%{query}%"),
                        User.username.ilike(f"%{query}%")
                    )
                )
            )

            # Apply fork status filter
            if tab == "originals":
                notebooks_query = notebooks_query.filter(Notebook.parent_id.is_(None))
            elif tab == "forks":
                notebooks_query = notebooks_query.filter(Notebook.parent_id.isnot(None))

            # Execute query
            results = notebooks_query.limit(limit).all()
            notebook_ids = [row.id for row in results]

            # Get total count
            total = len(notebook_ids)

            return {
                "notebook_ids": notebook_ids,
                "total": total,
                "from_meilisearch": False
            }

        except Exception as e:
            logger.error(f"Search failed: {e}")
            return {
                "notebook_ids": [],
                "total": 0,
                "from_meilisearch": False
            }

    def bootstrap_index(self) -> None:
        """Bootstrap Meilisearch index with existing published notebooks

        Checks if index exists, creates if not, then indexes all published notebooks.
        """
        try:
            # Check if index exists
            self.client.get_index(self.index_name)
            logger.info(f"Index {self.index_name} already exists, skipping bootstrap")
            return

        except MeilisearchError:
            # Index doesn't exist, create it
            logger.info(f"Index {self.index_name} does not exist, creating...")
            self.create_index()

        # Query all published notebooks
        notebooks = (
            self.db.query(Notebook)
            .filter(Notebook.is_published == True)
            .filter(Notebook.is_archived == False)
            .all()
        )

        # Index each notebook
        count = 0
        for notebook in notebooks:
            try:
                self.index_notebook(notebook)
                count += 1
            except Exception as e:
                logger.warning(f"Failed to index notebook {notebook.id} during bootstrap: {e}")

        logger.info(f"Bootstrapped Meilisearch index with {count} notebooks")
