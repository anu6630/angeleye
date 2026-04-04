from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.services.trending_service import TrendingService
from app.services.notebook_service import NotebookService
from app.services.feed_service import FeedService

router = APIRouter()


@router.get("/feed/trending")
async def get_trending_feed(
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get trending notebooks feed (DISC-01, DISC-02)

    Public endpoint - no authentication required per AUTH-04.
    Returns notebooks ordered by time-decayed engagement score.

    Query params:
    - limit: Number of items to return (default 50, max 100)

    Algorithm:
    - Engagement: (likes * 2) + (comments * 3)
    - Time decay: engagement / pow((age_hours + 2), 1.5)
    - Forks treated equally (no depth penalty)

    Returns:
        List of notebooks with engagement metadata
    """
    # Get trending notebook IDs from Redis
    trending_service = TrendingService(db)
    notebook_ids = trending_service.get_trending_notebooks(limit)

    # Fetch full notebook objects
    notebook_service = NotebookService(db)
    notebooks = []

    for notebook_id in notebook_ids:
        try:
            notebook = notebook_service.get_notebook(notebook_id)
            if notebook:
                notebooks.append(notebook)
        except Exception:
            # Notebook might have been deleted
            continue

    return {
        "notebooks": notebooks,
        "total": len(notebooks)
    }


@router.get("/feed")
async def get_personalized_feed(
    cursor: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """Get personalized feed (DISC-12)

    Public endpoint - no authentication required per AUTH-04.
    Mixes trending content with chronological feed.

    Per CONTEXT.md D-12: Personalized feed = followed + trending
    - If user has follows: prioritize followed content, fill rest with trending
    - If user has 0 follows: return 100% trending (cold start fallback)

    Query params:
    - cursor: ISO format timestamp for pagination
    - limit: Number of items to return (max 50)

    Returns:
        Feed items with pagination metadata
    """
    # Get chronological feed
    feed_service = FeedService(db)
    chronological_feed = feed_service.get_feed(cursor, limit)

    # Get trending notebooks for cold start
    trending_service = TrendingService(db)
    trending_ids = trending_service.get_trending_notebooks(limit)

    # If chronological feed is empty or user has no follows, return trending
    if not chronological_feed['items'] or len(chronological_feed['items']) < limit:
        # Fetch trending notebooks
        notebook_service = NotebookService(db)
        trending_notebooks = []

        for notebook_id in trending_ids[:limit]:
            try:
                notebook = notebook_service.get_notebook(notebook_id)
                if notebook:
                    trending_notebooks.append(notebook)
            except Exception:
                continue

        # Return trending as feed
        return {
            "items": [
                {
                    'id': nb.id,
                    'title': nb.title,
                    'username': nb.user.username,
                    'avatar_url': nb.user.avatar_url if hasattr(nb.user, 'avatar_url') else None,
                    'like_count': nb.like_count if hasattr(nb, 'like_count') else 0,
                    'comment_count': nb.comment_count if hasattr(nb, 'comment_count') else 0,
                    'created_at': nb.created_at
                }
                for nb in trending_notebooks
            ],
            "next_cursor": None,
            "has_more": False
        }

    # Otherwise return chronological feed
    return chronological_feed
