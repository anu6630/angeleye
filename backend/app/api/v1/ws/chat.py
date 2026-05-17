import asyncio
import json
import logging
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis.asyncio as aioredis

from app.core.config import settings
from app.core.security import parse_user_id_from_token
from app.db.session import SessionLocal
from app.services import chat_realtime
from app.services.conversation_service import ConversationService
from app.services.user_presence_service import UserPresenceService

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws/chat")
async def chat_websocket(websocket: WebSocket):
    await websocket.accept()
    token = websocket.cookies.get("access_token")
    if not token:
        token = websocket.query_params.get("token")
    user_id = parse_user_id_from_token(token)
    if user_id is None:
        await websocket.close(code=4401)
        return

    presence = UserPresenceService()
    presence.touch(user_id)

    redis = aioredis.from_url(
        settings.REDIS_URL,
        decode_responses=True,
    )
    pubsub = redis.pubsub()
    await pubsub.subscribe(chat_realtime.user_inbox_channel(user_id))
    subscribed_convs: Set[int] = set()

    async def forward():
        try:
            async for msg in pubsub.listen():
                if msg.get("type") != "message":
                    continue
                data = msg.get("data")
                if data:
                    await websocket.send_text(data)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            logger.debug("chat ws forward ended: %s", e)

    forward_task = asyncio.create_task(forward())
    try:
        await websocket.send_text(json.dumps({"type": "hello", "user_id": user_id}))
        while True:
            raw = await websocket.receive_text()
            data = json.loads(raw)
            t = data.get("type")
            if t == "ping":
                presence.touch(user_id)
                await websocket.send_text(json.dumps({"type": "pong"}))
            elif t == "join_conversation":
                cid = int(data["conversation_id"])
                db = SessionLocal()
                try:
                    ConversationService(db).assert_friend_participant(cid, user_id)
                except ValueError:
                    await websocket.send_text(
                        json.dumps({"type": "error", "detail": "cannot_join_conversation"})
                    )
                finally:
                    db.close()
                if cid not in subscribed_convs:
                    await pubsub.subscribe(chat_realtime.conv_channel(cid))
                    subscribed_convs.add(cid)
            elif t == "leave_conversation":
                cid = int(data["conversation_id"])
                if cid in subscribed_convs:
                    await pubsub.unsubscribe(chat_realtime.conv_channel(cid))
                    subscribed_convs.discard(cid)
            elif t == "typing_start":
                cid = int(data["conversation_id"])
                chat_realtime.publish_to_conversation(
                    cid,
                    {"type": "typing", "conversation_id": cid, "user_id": user_id, "active": True},
                )
            elif t == "typing_stop":
                cid = int(data["conversation_id"])
                chat_realtime.publish_to_conversation(
                    cid,
                    {"type": "typing", "conversation_id": cid, "user_id": user_id, "active": False},
                )
            elif t == "messages_delivered":
                cid = int(data["conversation_id"])
                db = SessionLocal()
                try:
                    ConversationService(db).mark_messages_as_delivered(user_id, cid)
                finally:
                    db.close()
            elif t == "messages_read":
                cid = int(data["conversation_id"])
                db = SessionLocal()
                try:
                    ConversationService(db).mark_messages_as_read(user_id, cid)
                finally:
                    db.close()
    except WebSocketDisconnect:
        pass
    finally:
        forward_task.cancel()
        try:
            await forward_task
        except asyncio.CancelledError:
            pass
        presence.leave(user_id)
        await pubsub.aclose()
        await redis.aclose()
