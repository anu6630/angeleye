import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, selectinload

from app.api.v1.dependencies import require_auth, rate_limit_chat_messages, rate_limit_chat_presign
from app.core.config import settings
from app.db.session import get_db
from app.models.conversation import Message
from app.models.user import User
from app.services.conversation_service import ConversationService
from app.services.storage_service import StorageService

router = APIRouter()


class FriendUserBrief(BaseModel):
    id: int
    username: str
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class ConversationListItem(BaseModel):
    conversation_id: int
    other_user: FriendUserBrief
    last_message_preview: Optional[str] = None
    last_message_at: Optional[str] = None
    last_message_sender_id: Optional[int] = None
    last_message_delivered_at: Optional[str] = None
    last_message_read_at: Optional[str] = None


class ReactionOut(BaseModel):
    user_id: int
    emoji: str


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    body: Optional[str] = None
    quoted_message_id: Optional[int] = None
    attachment_key: Optional[str] = None
    attachment_mime: Optional[str] = None
    attachment_size: Optional[int] = None
    attachment_filename: Optional[str] = None
    created_at: str
    delivered_at: Optional[str] = None
    read_at: Optional[str] = None
    reactions: List[ReactionOut] = []


class MessagesPageOut(BaseModel):
    messages: List[MessageOut]
    next_cursor: Optional[int] = None


class OpenDirectBody(BaseModel):
    other_user_id: int = Field(..., ge=1)


class OpenDirectResponse(BaseModel):
    conversation_id: int


class CreateMessageBody(BaseModel):
    body: Optional[str] = None
    quoted_message_id: Optional[int] = None
    attachment_key: Optional[str] = None
    attachment_mime: Optional[str] = None
    attachment_size: Optional[int] = Field(None, ge=1)
    attachment_filename: Optional[str] = None


class PresignAttachmentBody(BaseModel):
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., min_length=1, max_length=128)
    size_bytes: int = Field(..., ge=1)


class PresignAttachmentResponse(BaseModel):
    upload_url: str
    attachment_key: str
    expires_in: int


class ReactionBody(BaseModel):
    emoji: str = Field(..., min_length=1, max_length=32)


class RegisterPublicKeyBody(BaseModel):
    public_key: str = Field(..., min_length=1)


class PublicKeyResponse(BaseModel):
    user_id: int
    public_key: Optional[str] = None


def _brief(u: User) -> FriendUserBrief:
    from app.services.avatar_service import build_avatar_url
    return FriendUserBrief(
        id=u.id, 
        username=u.username, 
        avatar_url=build_avatar_url(u.username, u.profile)
    )


def _message_out(m: Message) -> MessageOut:
    rx = [ReactionOut(user_id=r.user_id, emoji=r.emoji) for r in (m.reactions or [])]
    return MessageOut(
        id=m.id,
        conversation_id=m.conversation_id,
        sender_id=m.sender_id,
        body=m.body,
        quoted_message_id=m.quoted_message_id,
        attachment_key=m.attachment_key,
        attachment_mime=m.attachment_mime,
        attachment_size=m.attachment_size,
        attachment_filename=m.attachment_filename,
        created_at=m.created_at.isoformat(),
        delivered_at=m.delivered_at.isoformat() if m.delivered_at else None,
        read_at=m.read_at.isoformat() if m.read_at else None,
        reactions=rx,
    )


@router.get("/conversations", response_model=List[ConversationListItem])
async def list_conversations(
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = ConversationService(db)
    rows = svc.list_conversations(current_user_id)
    out: List[ConversationListItem] = []
    for conv, last, other in rows:
        preview = None
        ts = None
        if last:
            preview = (last.body or "").strip() or (last.attachment_filename or "[attachment]")
            ts = last.created_at.isoformat()
        out.append(
            ConversationListItem(
                conversation_id=conv.id,
                other_user=_brief(other),
                last_message_preview=preview,
                last_message_at=ts,
                last_message_sender_id=last.sender_id if last else None,
                last_message_delivered_at=last.delivered_at.isoformat() if last and last.delivered_at else None,
                last_message_read_at=last.read_at.isoformat() if last and last.read_at else None,
            )
        )
    return out


@router.post("/conversations/direct", response_model=OpenDirectResponse)
async def open_direct_conversation(
    body: OpenDirectBody,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = ConversationService(db)
    try:
        conv = svc.get_or_create_direct(current_user_id, body.other_user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return OpenDirectResponse(conversation_id=conv.id)


@router.get("/conversations/{conversation_id}/messages", response_model=MessagesPageOut)
async def get_messages(
    conversation_id: int,
    cursor: Optional[int] = Query(None),
    limit: int = Query(40, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = ConversationService(db)
    try:
        page = svc.list_messages(conversation_id, current_user_id, cursor, limit)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    ids = [m.id for m in page.items]
    if not ids:
        return MessagesPageOut(messages=[], next_cursor=page.next_cursor)
    msgs = (
        db.query(Message)
        .filter(Message.id.in_(ids))
        .options(selectinload(Message.reactions))
        .all()
    )
    by_id = {m.id: m for m in msgs}
    ordered = [by_id[i] for i in ids if i in by_id]
    return MessagesPageOut(
        messages=[_message_out(m) for m in ordered],
        next_cursor=page.next_cursor,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageOut,
    status_code=status.HTTP_201_CREATED,
)
async def post_message(
    conversation_id: int,
    body: CreateMessageBody,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(rate_limit_chat_messages),
):
    svc = ConversationService(db)
    try:
        msg = svc.create_message(
            conversation_id=conversation_id,
            sender_id=current_user_id,
            body=body.body,
            quoted_message_id=body.quoted_message_id,
            attachment_key=body.attachment_key,
            attachment_mime=body.attachment_mime,
            attachment_size=body.attachment_size,
            attachment_filename=body.attachment_filename,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    db.refresh(msg)
    m2 = db.query(Message).filter(Message.id == msg.id).options(selectinload(Message.reactions)).first()
    return _message_out(m2 or msg)


@router.post(
    "/conversations/{conversation_id}/attachments/presign",
    response_model=PresignAttachmentResponse,
)
async def presign_chat_attachment(
    conversation_id: int,
    body: PresignAttachmentBody,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(rate_limit_chat_presign),
):
    svc = ConversationService(db)
    try:
        svc.assert_friend_participant(conversation_id, current_user_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))

    max_bytes = settings.MAX_CHAT_ATTACHMENT_MB * 1024 * 1024
    if body.size_bytes > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attachment too large (max {settings.MAX_CHAT_ATTACHMENT_MB}MB)",
        )
    allowed = {m.strip() for m in settings.ALLOWED_CHAT_ATTACHMENT_MIMES.split(",") if m.strip()}
    if body.content_type not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    safe_name = body.filename.replace("/", "_").replace("\\", "_")[:200]
    key = f"chat/{current_user_id}/{uuid.uuid4().hex}/{safe_name}"
    storage = StorageService()
    try:
        url = storage.generate_presigned_put_url(
            settings.CHAT_ATTACHMENTS_BUCKET,
            key,
            body.content_type,
            expiration=300,
        )
    except Exception:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Storage unavailable")
    return PresignAttachmentResponse(upload_url=url, attachment_key=key, expires_in=300)


@router.post("/messages/{message_id}/reactions", response_model=ReactionOut)
async def add_reaction(
    message_id: int,
    body: ReactionBody,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(rate_limit_chat_messages),
):
    svc = ConversationService(db)
    try:
        r = svc.add_reaction(message_id, current_user_id, body.emoji)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return ReactionOut(user_id=r.user_id, emoji=r.emoji)


@router.delete("/messages/{message_id}/reactions", status_code=status.HTTP_200_OK)
async def remove_reaction(
    message_id: int,
    emoji: str = Query(..., min_length=1, max_length=32),
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    svc = ConversationService(db)
    try:
        ok = svc.remove_reaction(message_id, current_user_id, emoji)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reaction not found")
    return {"ok": True}


@router.post("/users/me/public-key", status_code=status.HTTP_200_OK)
async def register_public_key(
    body: RegisterPublicKeyBody,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    user = db.query(User).filter(User.id == current_user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    user.public_key = body.public_key
    db.commit()
    return {"status": "success"}


@router.get("/users/{user_id}/public-key", response_model=PublicKeyResponse)
async def get_user_public_key(
    user_id: int,
    db: Session = Depends(get_db),
    current_user_id: int = Depends(require_auth),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return PublicKeyResponse(user_id=user.id, public_key=user.public_key)
