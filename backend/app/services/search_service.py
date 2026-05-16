import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

# Optional Meilisearch import - allows backend to start without Meilisearch
try:
    import meilisearch
    from meilisearch.errors import MeilisearchError, MeilisearchCommunicationError
    MEILISEARCH_AVAILABLE = True
except ImportError:
    MEILISEARCH_AVAILABLE = False
    meilisearch = None
    MeilisearchError = Exception
    MeilisearchCommunicationError = Exception

from app.core.config import settings
from app.models.notebook import Notebook
from app.models.user import User
from app.models.group import Group

logger = logging.getLogger(__name__)


class SearchService:
    """Service for Meilisearch integration with PostgreSQL fallback"""

    def __init__(self, db: Session):
        self.db = db
        if MEILISEARCH_AVAILABLE and hasattr(settings, 'MEILISEARCH_URL'):
            try:
                self.client = meilisearch.Client(
                    settings.MEILISEARCH_URL,
                    timeout=getattr(settings, 'MEILISEARCH_TIMEOUT', 5)
                )
                self.notebooks_index = "notebooks"
                self.users_index = "users"
                self.groups_index = "groups"
                self.meilisearch_enabled = True
                # Optional: configure indices on init to ensure settings are applied
                # Note: In production, this might be done via a startup script
            except Exception as e:
                logger.warning(f"Meilisearch initialization failed: {e}, falling back to PostgreSQL search")
                self.meilisearch_enabled = False
        else:
            self.meilisearch_enabled = False
            logger.info("Meilisearch not available, using PostgreSQL search")

    def create_indices(self) -> None:
        """Create Meilisearch indices with field configuration"""
        if not self.meilisearch_enabled:
            return

        try:
            # 1. Notebooks Index
            try:
                self.client.create_index(self.notebooks_index, {"primaryKey": "id"})
            except Exception:
                # If it already exists, we might need to ensure settings are updated
                pass
            
            nb_idx = self.client.index(self.notebooks_index)
            nb_idx.update_searchable_attributes(["title", "content", "author"])
            nb_idx.update_filterable_attributes(["parent_id", "group_id", "is_published"])
            nb_idx.update_sortable_attributes(["created_at"])

            # 2. Users Index
            try:
                self.client.create_index(self.users_index, {"primaryKey": "id"})
            except Exception:
                pass
                
            u_idx = self.client.index(self.users_index)
            u_idx.update_searchable_attributes(["username", "display_name"])
            u_idx.update_filterable_attributes(["is_active"])

            # 3. Groups Index
            try:
                self.client.create_index(self.groups_index, {"primaryKey": "id"})
            except Exception:
                pass
                
            g_idx = self.client.index(self.groups_index)
            g_idx.update_searchable_attributes(["name", "description", "slug"])
            g_idx.update_filterable_attributes(["visibility"])

            logger.info("Meilisearch indices configured successfully")
        except Exception as e:
            logger.warning(f"Failed to configure Meilisearch indices: {e}")

    def delete_indices(self) -> None:
        """Delete all search indices"""
        if not self.meilisearch_enabled:
            return
        try:
            self.client.delete_index(self.notebooks_index)
            self.client.delete_index(self.users_index)
            self.client.delete_index(self.groups_index)
            logger.info("Deleted all Meilisearch indices")
        except Exception as e:
            logger.warning(f"Failed to delete indices: {e}")

    def index_notebook(self, notebook: Notebook) -> None:
        """Index a notebook in Meilisearch"""
        try:
            if not self.meilisearch_enabled:
                return

            if not notebook.cells:
                from app.models.notebook_cell import NotebookCell
                cells = self.db.query(NotebookCell).filter(NotebookCell.notebook_id == notebook.id).all()
            else:
                cells = notebook.cells

            content = "\n".join([c.content for c in cells if c.cell_type in ["code", "markdown"]])

            document = {
                "id": notebook.id,
                "type": "notebook",
                "title": notebook.title,
                "content": content,
                "author": notebook.user.username,
                "parent_id": notebook.parent_id,
                "group_id": notebook.group_id,
                "is_published": notebook.is_published,
                "created_at": notebook.created_at.isoformat()
            }
            self.client.index(self.notebooks_index).update_documents([document])
        except Exception as e:
            logger.warning(f"Failed to index notebook {notebook.id}: {e}")

    def index_user(self, user: User) -> None:
        """Index a user in Meilisearch"""
        try:
            if not self.meilisearch_enabled:
                return

            display_name = user.username
            avatar_url = None
            if user.profile:
                # Safely get attributes that might not exist in all versions of the model
                display_name = getattr(user.profile, 'display_name', user.username)
                avatar_url = getattr(user.profile, 'avatar_url', None)

            document = {
                "id": user.id,
                "type": "user",
                "username": user.username,
                "display_name": display_name,
                "avatar_url": avatar_url,
                "is_active": user.is_active,
                "created_at": user.created_at.isoformat()
            }
            self.client.index(self.users_index).update_documents([document])
        except Exception as e:
            logger.warning(f"Failed to index user {user.id}: {e}")

    def index_group(self, group: Group) -> None:
        """Index a group in Meilisearch"""
        try:
            if not self.meilisearch_enabled:
                return

            document = {
                "id": group.id,
                "type": "group",
                "name": group.name,
                "slug": group.slug,
                "description": group.description,
                "icon_url": group.icon_url,
                "visibility": group.visibility,
                "created_at": group.created_at.isoformat()
            }
            self.client.index(self.groups_index).update_documents([document])
        except Exception as e:
            logger.warning(f"Failed to index group {group.id}: {e}")

    def search_notebooks(self, query: str, tab: str = "all", limit: int = 50) -> Dict:
        """Existing notebook-specific search with fallback"""
        if not self.meilisearch_enabled:
            return self._postgres_notebook_search(query, tab, limit)

        try:
            parts = ["is_published = true", "group_id IS NULL"]
            if tab == "originals":
                parts.append("parent_id IS NULL")
            elif tab == "forks":
                parts.append("parent_id IS NOT NULL")
            
            results = self.client.index(self.notebooks_index).search(query, {
                "limit": limit,
                "filter": " AND ".join(parts)
            })
            return {
                "notebook_ids": [int(hit["id"]) for hit in results.get("hits", [])],
                "total": results.get("estimatedTotalHits", 0),
                "from_meilisearch": True
            }
        except Exception as e:
            logger.warning(f"Meilisearch notebook search failed: {e}")
            return self._postgres_notebook_search(query, tab, limit)

    def global_search(self, query: str, limit: int = 30) -> Dict:
        """Unified search across notebooks, users, and groups"""
        if not self.meilisearch_enabled:
            # Minimal fallback for global search (notebooks only for now)
            nb_res = self._postgres_notebook_search(query, "all", limit)
            return {"hits": [{"id": nid, "type": "notebook"} for nid in nb_res["notebook_ids"]], "total": nb_res["total"]}

        try:
            # Multi-search across 3 indices
            res = self.client.multi_search([
                {"indexUid": self.notebooks_index, "q": query, "limit": limit, "filter": "is_published = true"},
                {"indexUid": self.users_index, "q": query, "limit": limit, "filter": "is_active = true"},
                {"indexUid": self.groups_index, "q": query, "limit": limit, "filter": "visibility = 'public'"}
            ])

            all_hits = []
            for idx_res in res.get("results", []):
                for hit in idx_res.get("hits", []):
                    all_hits.append(hit)

            # Sort by relevance score (provided by Meilisearch)
            all_hits.sort(key=lambda x: x.get("_rankingScore", 0), reverse=True)

            return {
                "hits": all_hits[:limit],
                "total": sum(r.get("estimatedTotalHits", 0) for r in res.get("results", [])),
                "from_meilisearch": True
            }
        except Exception as e:
            logger.error(f"Global search failed: {e}")
            return {"hits": [], "total": 0, "from_meilisearch": False}

    def _postgres_notebook_search(self, query: str, tab: str, limit: int) -> Dict:
        """Helper for fallback PostgreSQL search"""
        notebooks_query = (
            self.db.query(Notebook.id)
            .join(User, Notebook.user_id == User.id)
            .filter(Notebook.is_published == True)
            .filter(Notebook.is_archived == False)
            .filter(Notebook.group_id.is_(None))
            .filter(or_(Notebook.title.ilike(f"%{query}%"), User.username.ilike(f"%{query}%")))
        )
        if tab == "originals":
            notebooks_query = notebooks_query.filter(Notebook.parent_id.is_(None))
        elif tab == "forks":
            notebooks_query = notebooks_query.filter(Notebook.parent_id.isnot(None))

        results = notebooks_query.limit(limit).all()
        ids = [row.id for row in results]
        return {"notebook_ids": ids, "total": len(ids), "from_meilisearch": False}

    def bootstrap_index(self) -> None:
        """Populate all indices from scratch"""
        if not self.meilisearch_enabled:
            return

        self.create_indices()

        # Index Notebooks
        notebooks = self.db.query(Notebook).filter(Notebook.is_published == True).all()
        for nb in notebooks: self.index_notebook(nb)

        # Index Users
        users = self.db.query(User).filter(User.is_active == True).all()
        for u in users: self.index_user(u)

        # Index Groups
        groups = self.db.query(Group).filter(Group.visibility == "public").all()
        for g in groups: self.index_group(g)

        logger.info(f"Bootstrapped all indices: {len(notebooks)} notebooks, {len(users)} users, {len(groups)} groups")
