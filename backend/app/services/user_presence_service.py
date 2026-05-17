"""Global user presence for online friends (Redis ZSET, ms scores)."""

from __future__ import annotations

import logging
import time
from typing import List, Set

from redis.exceptions import RedisError

from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)

STALE_MS = 60_000
KEY = "global:user_presence"
KEY_TTL_SECONDS = 86_400


class UserPresenceService:
    def _now_ms(self) -> int:
        return int(time.time() * 1000)

    def _prune_stale(self, r, now_ms: int) -> None:
        cutoff = now_ms - STALE_MS
        r.zremrangebyscore(KEY, "-inf", cutoff)

    def touch(self, user_id: int) -> None:
        r = get_redis_client()
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, now_ms)
            pipe.zadd(KEY, {str(user_id): now_ms})
            pipe.expire(KEY, KEY_TTL_SECONDS)
            pipe.execute()
        except RedisError as e:
            logger.warning("user presence touch failed: %s", e)

    def leave(self, user_id: int) -> None:
        r = get_redis_client()
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, now_ms)
            pipe.zrem(KEY, str(user_id))
            pipe.expire(KEY, KEY_TTL_SECONDS)
            pipe.execute()
        except RedisError as e:
            logger.warning("user presence leave failed: %s", e)

    def online_user_ids(self) -> Set[int]:
        r = get_redis_client()
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, now_ms)
            pipe.zrangebyscore(KEY, now_ms - STALE_MS, "+inf")
            results = pipe.execute()
            members = results[-1] or []
            return {int(x) for x in members}
        except RedisError as e:
            logger.warning("user presence list failed: %s", e)
            return set()

    def filter_online(self, user_ids: List[int]) -> List[int]:
        if not user_ids:
            return []
        online = self.online_user_ids()
        return [uid for uid in user_ids if uid in online]
