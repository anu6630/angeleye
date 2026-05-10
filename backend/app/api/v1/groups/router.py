from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session

from redis.exceptions import RedisError

from app.api.v1.dependencies import optional_auth, rate_limit_general, require_auth
from app.db.session import get_db
from app.models.user import User
from app.services.avatar_service import build_avatar_url
from app.services.group_asset_service import GroupAssetService
from app.services.group_presence_service import GroupPresenceService
from app.services.group_service import GroupService, slugify_name
from app.services.feed_service import FeedService
from app.api.v1.groups.schemas import (
    AdminPromotionCreate,
    GroupCreate,
    GroupPresenceResponse,
    GroupUpdate,
    InviteCreate,
)

router = APIRouter()


def _user_brief(db: Session, user: User) -> Dict[str, Any]:
    profile = user.profile
    avatar_url = build_avatar_url(user.username, profile) if profile else None
    return {"id": user.id, "username": user.username, "avatar_url": avatar_url}


def _map_value_error(e: ValueError) -> None:
    msg = str(e)
    if msg == "Group not found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
    if msg == "User not found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
    if msg in ("Invite not found", "Request not found"):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=msg)
    if msg == "Forbidden":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=msg)
    if msg in (
        "Already a member",
        "Invite already pending",
        "Request already pending",
        "Slug already taken",
    ):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=msg)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=msg)


@router.post("/groups", status_code=status.HTTP_201_CREATED)
async def create_group(
    request: Request,
    body: GroupCreate,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    slug = (body.slug or "").strip().lower() if body.slug else slugify_name(body.name)
    try:
        g = svc.create_group(
            user_id,
            body.name,
            slug,
            body.description,
            body.visibility,
            body.join_policy,
        )
    except ValueError as e:
        _map_value_error(e)
    return svc.serialize_group(g, user_id)


@router.get("/groups")
async def list_groups(
    request: Request,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    viewer_id = await optional_auth(request)
    svc = GroupService(db)
    rows, total = svc.list_public_groups(limit=limit, offset=offset)
    return {
        "items": [svc.serialize_group(g, viewer_id) for g in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/groups/me")
async def my_groups(
    request: Request,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    summary = svc.get_me_summary(user_id)

    groups_out = []
    for m in summary["memberships"]:
        g = m.group
        d = svc.serialize_group(g, user_id)
        d["role"] = m.role
        groups_out.append(d)

    invites_out = []
    for inv in summary["pending_invites"]:
        inviter = inv.inviter
        invites_out.append(
            {
                "id": inv.id,
                "group": svc.serialize_group(inv.group, user_id),
                "inviter": _user_brief(db, inviter),
                "created_at": inv.created_at.isoformat() if inv.created_at else None,
            }
        )

    promos_out = []
    for row in summary["pending_admin_promotions"]:
        proposer = row.proposer
        promos_out.append(
            {
                "id": row.id,
                "group": svc.serialize_group(row.group, user_id),
                "proposer": _user_brief(db, proposer),
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
        )

    return {
        "groups": groups_out,
        "pending_invites": invites_out,
        "pending_admin_promotions": promos_out,
    }


@router.get("/groups/{slug}")
async def get_group(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    viewer_id = await optional_auth(request)
    svc = GroupService(db)
    g = svc.get_group_visible(slug, viewer_id)
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    return svc.serialize_group(g, viewer_id)


@router.get("/groups/{slug}/posts")
async def list_group_posts(
    request: Request,
    slug: str,
    cursor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Published notebooks scoped to this group (not shown on global feed)."""
    viewer_id = await optional_auth(request)
    gs = GroupService(db)
    g = gs.get_group_visible(slug, viewer_id)
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")

    feed_service = FeedService(db)
    feed = feed_service.list_group_feed(g.id, viewer_id, limit=limit, cursor=cursor)
    notebook_ids = [item["id"] for item in feed["items"]]
    if notebook_ids:
        try:
            metrics = feed_service.get_engagement_metrics(notebook_ids)
            for item in feed["items"]:
                nid = item["id"]
                if nid in metrics:
                    item["like_count"] = metrics[nid]["likes"]
                    item["comment_count"] = metrics[nid]["comments"]
                    item["view_count"] = metrics[nid]["views"]
        except Exception:
            pass
    return feed


@router.patch("/groups/{slug}")
async def patch_group(
    request: Request,
    slug: str,
    body: GroupUpdate,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    patch = body.model_dump(exclude_unset=True)
    try:
        g = svc.update_group(slug, user_id, **patch)
    except ValueError as e:
        _map_value_error(e)
    return svc.serialize_group(g, user_id)


@router.post("/groups/{slug}/join", status_code=status.HTTP_201_CREATED)
async def join_group(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    try:
        svc.join_group(slug, user_id)
        g = svc.get_group_visible(slug, user_id)
    except ValueError as e:
        _map_value_error(e)
    return svc.serialize_group(g, user_id)


@router.delete("/groups/{slug}/members/me", status_code=status.HTTP_204_NO_CONTENT)
async def leave_group(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    try:
        svc.leave_group(slug, user_id)
    except ValueError as e:
        _map_value_error(e)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/groups/{slug}/invites", status_code=status.HTTP_201_CREATED)
async def create_invite(
    request: Request,
    slug: str,
    body: InviteCreate,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    try:
        inv = svc.create_invite(slug, user_id, body.invitee_user_id)
    except ValueError as e:
        _map_value_error(e)
    g = svc.get_group_visible(slug, user_id)
    return {
        "id": inv.id,
        "group": svc.serialize_group(g, user_id),
        "invitee_user_id": inv.invitee_user_id,
        "status": inv.status,
    }


@router.post("/groups/{slug}/invites/{invite_id}/accept")
async def accept_invite(
    request: Request,
    slug: str,
    invite_id: int,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    try:
        svc.accept_invite(slug, invite_id, user_id)
        g = svc.get_group_visible(slug, user_id)
    except ValueError as e:
        _map_value_error(e)
    return svc.serialize_group(g, user_id)


@router.post("/groups/{slug}/invites/{invite_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_invite(
    request: Request,
    slug: str,
    invite_id: int,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    try:
        svc.reject_invite(slug, invite_id, user_id)
    except ValueError as e:
        _map_value_error(e)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/groups/{slug}/admin-requests", status_code=status.HTTP_201_CREATED)
async def create_admin_request(
    request: Request,
    slug: str,
    body: AdminPromotionCreate,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    try:
        row = svc.create_admin_promotion_request(slug, user_id, body.candidate_user_id)
    except ValueError as e:
        _map_value_error(e)
    g = svc.get_group_visible(slug, user_id)
    return {
        "id": row.id,
        "group": svc.serialize_group(g, user_id),
        "candidate_user_id": row.candidate_user_id,
        "status": row.status,
    }


@router.post("/groups/{slug}/admin-requests/{request_id}/accept")
async def accept_admin_request(
    request: Request,
    slug: str,
    request_id: int,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    try:
        svc.accept_admin_promotion(slug, request_id, user_id)
        g = svc.get_group_visible(slug, user_id)
    except ValueError as e:
        _map_value_error(e)
    return svc.serialize_group(g, user_id)


@router.post("/groups/{slug}/admin-requests/{request_id}/reject", status_code=status.HTTP_204_NO_CONTENT)
async def reject_admin_request(
    request: Request,
    slug: str,
    request_id: int,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupService(db)
    try:
        svc.reject_admin_promotion(slug, request_id, user_id)
    except ValueError as e:
        _map_value_error(e)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/groups/{slug}/icon")
async def upload_group_icon(
    request: Request,
    slug: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupAssetService(db)
    url = svc.upload_icon(slug, user_id, file)
    return {"icon_url": url}


@router.delete("/groups/{slug}/icon", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_icon(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    GroupAssetService(db).delete_icon(slug, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/groups/{slug}/banner")
async def upload_group_banner(
    request: Request,
    slug: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    svc = GroupAssetService(db)
    url = svc.upload_banner(slug, user_id, file)
    return {"banner_url": url}


@router.delete("/groups/{slug}/banner", status_code=status.HTTP_204_NO_CONTENT)
async def delete_group_banner(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    GroupAssetService(db).delete_banner(slug, user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/groups/{slug}/icon")
async def get_group_icon(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    viewer_id = await optional_auth(request)
    svc = GroupAssetService(db)
    body, content_type = svc.stream_icon(slug, viewer_id)
    return StreamingResponse(body, media_type=content_type)


@router.get("/groups/{slug}/banner")
async def get_group_banner(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    viewer_id = await optional_auth(request)
    svc = GroupAssetService(db)
    body, content_type = svc.stream_banner(slug, viewer_id)
    return StreamingResponse(body, media_type=content_type)


@router.get("/groups/{slug}/presence", response_model=GroupPresenceResponse)
async def get_group_presence(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    viewer_id = await optional_auth(request)
    gs = GroupService(db)
    g = gs.get_group_visible(slug, viewer_id)
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    presence = GroupPresenceService()
    try:
        n = presence.online_user_count(g.id)
    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Presence temporarily unavailable",
        )
    return GroupPresenceResponse(online_user_count=n)


@router.post(
    "/groups/{slug}/presence/heartbeat",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_general(60))],
)
async def post_group_presence_heartbeat(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    gs = GroupService(db)
    g = gs.get_group_visible(slug, user_id)
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    presence = GroupPresenceService()
    try:
        presence.touch(g.id, user_id)
    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Presence temporarily unavailable",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete(
    "/groups/{slug}/presence",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(rate_limit_general(60))],
)
async def delete_group_presence(
    request: Request,
    slug: str,
    db: Session = Depends(get_db),
):
    user_id = await require_auth(request)
    gs = GroupService(db)
    g = gs.get_group_visible(slug, user_id)
    if not g:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    presence = GroupPresenceService()
    try:
        presence.leave(g.id, user_id)
    except RedisError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Presence temporarily unavailable",
        )
    return Response(status_code=status.HTTP_204_NO_CONTENT)
