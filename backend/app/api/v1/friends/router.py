from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import List, Literal, Optional

from app.db.session import get_db
from app.api.v1.dependencies import require_auth
from app.models.user import User
from app.models.friend import FriendRequest
from app.services.friend_service import FriendService
from app.services.user_presence_service import UserPresenceService

router = APIRouter()


class FriendUserBrief(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class FriendRequestOut(BaseModel):
    id: int
    requester_id: int
    addressee_id: int
    status: str
    created_at: str
    user: Optional[FriendUserBrief] = None

    class Config:
        from_attributes = True


class SendFriendRequestBody(BaseModel):
    addressee_id: int = Field(..., ge=1)


class RelationshipOut(BaseModel):
    status: str  # self | none | friends | pending_out | pending_in
    incoming_request_id: Optional[int] = None


def _brief(u) -> FriendUserBrief:
    avatar_url = None
    if u.profile:
        from app.services.avatar_service import build_avatar_url
        avatar_url = build_avatar_url(u.username, u.profile)
    return FriendUserBrief(id=u.id, username=u.username, avatar_url=avatar_url)


@router.get("/friends", response_model=List[FriendUserBrief])
async def list_friends(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    return [_brief(u) for u in svc.list_friends(current_user_id)]


@router.get("/friends/online", response_model=List[FriendUserBrief])
async def list_online_friends(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    presence = UserPresenceService()
    friend_ids = svc.list_friend_ids(current_user_id)
    online_ids = presence.filter_online(friend_ids)
    if not online_ids:
        return []
    users = db.query(User).filter(User.id.in_(online_ids)).all()
    by_id = {u.id: u for u in users}
    return [_brief(by_id[i]) for i in online_ids if i in by_id]


@router.get("/friends/relationship/{other_user_id}", response_model=RelationshipOut)
async def get_relationship(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    state = svc.relationship_state(current_user_id, other_user_id)
    incoming_id = None
    if state == "pending_in":
        row = (
            db.query(FriendRequest)
            .filter(
                FriendRequest.requester_id == other_user_id,
                FriendRequest.addressee_id == current_user_id,
                FriendRequest.status == FriendService.STATUS_PENDING,
            )
            .first()
        )
        if row:
            incoming_id = row.id
    return RelationshipOut(status=state, incoming_request_id=incoming_id)


@router.post("/friends/requests", response_model=FriendRequestOut, status_code=status.HTTP_201_CREATED)
async def send_friend_request(
    body: SendFriendRequestBody,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    try:
        req = svc.send_request(current_user_id, body.addressee_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return FriendRequestOut(
        id=req.id,
        requester_id=req.requester_id,
        addressee_id=req.addressee_id,
        status=req.status,
        created_at=req.created_at.isoformat(),
    )


@router.get("/friends/requests", response_model=List[FriendRequestOut])
async def list_friend_requests(
    direction: Literal["incoming", "outgoing"] = Query(...),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    try:
        rows = svc.list_requests(current_user_id, direction)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return [
        FriendRequestOut(
            id=r.id,
            requester_id=r.requester_id,
            addressee_id=r.addressee_id,
            status=r.status,
            created_at=r.created_at.isoformat(),
            user=_brief(r.addressee if direction == "outgoing" else r.requester)
        )
        for r in rows
    ]


@router.post("/friends/requests/{request_id}/accept", status_code=status.HTTP_200_OK)
async def accept_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    try:
        svc.accept_request(request_id, current_user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"ok": True}


@router.post("/friends/requests/{request_id}/reject", status_code=status.HTTP_200_OK)
async def reject_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    try:
        svc.reject_request(request_id, current_user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"ok": True}


@router.delete("/friends/requests/{request_id}", status_code=status.HTTP_200_OK)
async def cancel_friend_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    try:
        svc.cancel_request(request_id, current_user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return {"ok": True}


@router.delete("/friends/{other_user_id}", status_code=status.HTTP_200_OK)
async def remove_friend(
    other_user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = FriendService(db)
    try:
        ok = svc.remove_friendship(current_user_id, other_user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Friendship not found")
    return {"ok": True}
