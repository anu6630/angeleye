"""Redis-backed per-group online presence (unique users via ZSET scores)."""

from __future__ import annotations

import logging
import time
from redis.exceptions import RedisError

from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# Drop users who have not heartbeated within this window.
STALE_MS = 60_000
# Refresh key TTL on activity so empty groups eventually drop the key.
KEY_TTL_SECONDS = 86_400


class GroupPresenceService:
    KEY_PREFIX = "group:presence:{}"

    def _key(self, group_id: int) -> str:
        return self.KEY_PREFIX.format(group_id)

    def _now_ms(self) -> int:
        return int(time.time() * 1000)

    def _prune_stale(self, r, key: str, now_ms: int) -> None:
        cutoff = now_ms - STALE_MS
        r.zremrangebyscore(key, "-inf", cutoff)

    def touch(self, group_id: int, user_id: int) -> None:
        """Record/update presence for user; prune stale entries."""
        r = get_redis_client()
        key = self._key(group_id)
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, key, now_ms)
            pipe.zadd(key, {str(user_id): now_ms})
            pipe.expire(key, KEY_TTL_SECONDS)
            pipe.execute()
        except RedisError as e:
            logger.warning("group presence touch failed: %s", e)
            raise

    def leave(self, group_id: int, user_id: int) -> None:
        """Remove user from presence set (best-effort)."""
        r = get_redis_client()
        key = self._key(group_id)
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, key, now_ms)
            pipe.zrem(key, str(user_id))
            pipe.expire(key, KEY_TTL_SECONDS)
            pipe.execute()
        except RedisError as e:
            logger.warning("group presence leave failed: %s", e)
            raise

    def online_user_count(self, group_id: int) -> int:
        """Count users with a recent heartbeat."""
        r = get_redis_client()
        key = self._key(group_id)
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, key, now_ms)
            pipe.zcard(key)
            results = pipe.execute()
            return int(results[-1] or 0)
        except RedisError as e:
            logger.warning("group presence count failed: %s", e)
            raise
