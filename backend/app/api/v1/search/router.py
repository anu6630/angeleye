import re
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_db_session
from app.services.search_service import SearchService
from app.services.notebook_service import NotebookService
from app.schemas.notebook import NotebookResponse

router = APIRouter()


@router.get("")
def search_notebooks(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    tab: str = Query("all", regex="^(all|originals|forks)$", description="Filter by fork status"),
    limit: int = Query(50, le=100, description="Max results to return"),
    db: Session = Depends(get_db_session)
) -> dict:
    """Search notebooks with faceted filtering

    Per CONTEXT.md D-14: Tab-based filtering (all, originals, forks)
    Per CONTEXT.md D-21: Empty state shows trending notebooks
    Per AUTH-04: No authentication required for search
    """
    # Execute search
    search_service = SearchService(db)
    results = search_service.search_notebooks(q, tab, limit)

    notebook_ids = results["notebook_ids"]
    total = results["total"]

    # Handle empty state
    if total == 0:
        # Return trending notebooks instead
        from app.services.trending_service import TrendingService
        trending_service = TrendingService(db)

        try:
            trending_notebooks = trending_service.get_trending_notebooks(limit=20)
        except Exception:
            # If trending fails, return empty list
            trending_notebooks = []

        return {
            "notebooks": trending_notebooks,
            "total": 0,
            "empty_state": True,
            "message": f"No results for '{q}'. Showing trending notebooks instead.",
            "facet_distribution": {},
            "from_meilisearch": results["from_meilisearch"]
        }

    # Fetch full notebooks by IDs
    notebook_service = NotebookService(db)
    notebooks = []
    for nid in notebook_ids:
        notebook_response = notebook_service.get_notebook(nid)
        if notebook_response:
            notebooks.append(notebook_response)

    return {
        "notebooks": notebooks,
        "total": total,
        "empty_state": False,
        "facet_distribution": {},  # Could be populated with Meilisearch facet distribution
        "from_meilisearch": results["from_meilisearch"]
    }
