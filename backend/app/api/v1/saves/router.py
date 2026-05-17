from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.v1.dependencies import require_auth
from app.db.session import get_db
from app.services.feed_service import FeedService
from app.services.save_service import SaveService

router = APIRouter()


class SaveCreate(BaseModel):
    notebook_id: int


@router.post("/saves", status_code=status.HTTP_201_CREATED)
async def save_notebook(
    request: Request,
    body: SaveCreate,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    service = SaveService(db)
    try:
        service.save(user_id, body.notebook_id)
    except ValueError as e:
        msg = str(e)
        if msg == "Notebook not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
        if msg == "Already saved":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)
    return {"message": "Saved", "notebook_id": body.notebook_id}


@router.delete("/saves/{notebook_id}")
async def unsave_notebook(
    request: Request,
    notebook_id: int,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    service = SaveService(db)
    try:
        service.unsave(user_id, notebook_id)
    except ValueError as e:
        if str(e) == "Not saved":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"message": "Removed from saved", "notebook_id": notebook_id}


@router.get("/saves")
async def list_saved(
    request: Request,
    cursor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    save_service = SaveService(db)
    feed_service = FeedService(db)

    notebooks, next_cursor, has_more = save_service.list_saved(user_id, limit=limit, cursor=cursor)
    if not notebooks:
        return {"items": [], "next_cursor": None, "has_more": False}

    notebook_ids = [nb.id for nb in notebooks]
    saved_ids = save_service.get_saved_notebook_ids(user_id, notebook_ids)
    save_counts = save_service.get_save_counts(notebook_ids)

    items = [
        feed_service._notebook_to_dict(nb, user_id, saved_ids, save_counts)
        for nb in notebooks
    ]

    if notebook_ids:
        try:
            metrics = feed_service.get_engagement_metrics(notebook_ids)
            for item in items:
                nid = item["id"]
                if nid in metrics:
                    item["like_count"] = metrics[nid]["likes"]
                    item["comment_count"] = metrics[nid]["comments"]
                    item["view_count"] = metrics[nid]["views"]
        except Exception:
            pass

    return {
        "items": items,
        "next_cursor": next_cursor,
        "has_more": has_more,
    }


@router.get("/saves/check/{notebook_id}")
async def check_saved(
    request: Request,
    notebook_id: int,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    service = SaveService(db)
    return {"is_saved": service.is_saved(user_id, notebook_id)}
