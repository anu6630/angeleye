import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)


def user_inbox_channel(user_id: int) -> str:
    return f"user:{user_id}:inbox"


def conv_channel(conversation_id: int) -> str:
    return f"conv:{conversation_id}"


def publish_to_user(user_id: int, payload: Dict[str, Any]) -> None:
    try:
        r = get_redis_client()
        r.publish(user_inbox_channel(user_id), json.dumps(payload))
    except Exception as e:
        logger.warning("chat publish user failed: %s", e)


def publish_to_conversation(conversation_id: int, payload: Dict[str, Any]) -> None:
    try:
        r = get_redis_client()
        r.publish(conv_channel(conversation_id), json.dumps(payload))
    except Exception as e:
        logger.warning("chat publish conv failed: %s", e)


def broadcast_to_participants(participant_ids: List[int], payload: Dict[str, Any]) -> None:
    for uid in participant_ids:
        publish_to_user(uid, payload)
