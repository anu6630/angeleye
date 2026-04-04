from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.services.trending_service import TrendingService
from app.services.notebook_service import NotebookService
from app.services.feed_service import FeedService
from app.api.v1.dependencies import optional_auth

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
        Feed with items, next_cursor, has_more
    """
    feed_service = FeedService(db)
    feed = feed_service.get_trending_feed(limit=limit)

    return feed


@router.get("/feed")
async def get_personalized_feed(
    request: Request,
    cursor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get personalized feed (DISC-12, DISC-05)

    Public endpoint - no authentication required per AUTH-04.
    Mixes followed users' content with trending content.

    Per CONTEXT.md D-12: Personalized feed = followed + trending
    - If authenticated: prioritize followed content, fill rest with trending
    - If 0 follows: return 100% trending (cold start fallback)
    - If not authenticated: return trending feed

    Per CONTEXT.md D-30: Engagement metrics displayed (likes, comments, views)
    Per CONTEXT.md D-31: View tracking on feed load

    Query params:
    - cursor: ISO format timestamp for pagination
    - limit: Number of items to return (max 100)

    Returns:
        Feed items with engagement metrics and pagination metadata
    """
    # Get optional user ID (None if not authenticated)
    user_id = await optional_auth(request)

    # Get personalized feed
    feed_service = FeedService(db)
    feed = feed_service.get_personalized_feed(
        user_id=user_id,
        limit=limit,
        cursor=cursor
    )

    # Record views for all notebooks in feed (async, don't fail)
    notebook_ids = [item["id"] for item in feed["items"]]
    for nid in notebook_ids:
        try:
            feed_service.record_view(nid, user_id)
        except Exception:
            pass  # View tracking failure shouldn't break feed

    # Get engagement metrics for all notebooks
    if notebook_ids:
        try:
            metrics = feed_service.get_engagement_metrics(notebook_ids)
            # Merge metrics into feed items
            for item in feed["items"]:
                nid = item["id"]
                if nid in metrics:
                    item["like_count"] = metrics[nid]["likes"]
                    item["comment_count"] = metrics[nid]["comments"]
                    item["view_count"] = metrics[nid]["views"]
        except Exception:
            pass  # Metrics failure shouldn't break feed

    return feed
