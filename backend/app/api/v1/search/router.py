import re
from typing import List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.api.v1.dependencies import get_db_session
from app.services.search_service import SearchService
from app.services.notebook_service import NotebookService
from app.schemas.notebook import NotebookResponse

from app.services.trending_service import TrendingService

router = APIRouter()


@router.get("")
def search_notebooks(
    q: str = Query(None, min_length=0, max_length=100, description="Search query"),
    tab: str = Query("all", regex="^(all|originals|forks)$", description="Filter by fork status"),
    limit: int = Query(50, le=100, description="Max results to return"),
    db: Session = Depends(get_db_session)
) -> dict:
    """Search notebooks specifically (legacy support)"""
    search_service = SearchService(db)
    query_str = q or ""
    results = search_service.search_notebooks(query_str, tab, limit)

    notebook_ids = results["notebook_ids"]
    total = results["total"]

    if total == 0:
        trending_service = TrendingService(db)
        try:
            trending_notebooks = trending_service.get_trending_notebooks(limit=20)
        except Exception:
            trending_notebooks = []
        return {
            "notebooks": trending_notebooks,
            "total": 0,
            "empty_state": True,
            "message": f"No results for '{query_str}'. Showing trending notebooks instead.",
            "from_meilisearch": results["from_meilisearch"]
        }

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
        "from_meilisearch": results["from_meilisearch"]
    }


@router.get("/global")
def global_search(
    q: str = Query("", min_length=0, description="Global search query"),
    limit: int = Query(20, le=50),
    db: Session = Depends(get_db_session)
) -> dict:
    """Unified search across Users, Groups, and Notebooks"""
    search_service = SearchService(db)
    results = search_service.global_search(q, limit)
    
    # Enrich hits with full data
    enriched_hits = []
    notebook_service = NotebookService(db)
    
    for hit in results["hits"]:
        hit_type = hit.get("type")
        hit_id = hit.get("id")
        
        if hit_type == "notebook":
            nb = notebook_service.get_notebook(hit_id)
            if nb: enriched_hits.append({"type": "notebook", "data": nb})
        elif hit_type == "user":
            # Just return what we have from Meilisearch for now, or fetch from DB
            enriched_hits.append({"type": "user", "data": hit})
        elif hit_type == "group":
            enriched_hits.append({"type": "group", "data": hit})
            
    return {
        "hits": enriched_hits,
        "total": results["total"],
        "from_meilisearch": results["from_meilisearch"]
    }
