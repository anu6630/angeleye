"""Redis-backed per-notebook viewing presence (unique viewers via ZSET scores)."""

from __future__ import annotations

import logging
import time

from redis.exceptions import RedisError

from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)

STALE_MS = 60_000
KEY_TTL_SECONDS = 86_400


class NotebookPresenceService:
    KEY_PREFIX = "notebook:presence:{}"

    def _key(self, notebook_id: int) -> str:
        return self.KEY_PREFIX.format(notebook_id)

    def _now_ms(self) -> int:
        return int(time.time() * 1000)

    def _prune_stale(self, pipe, key: str, now_ms: int) -> None:
        cutoff = now_ms - STALE_MS
        pipe.zremrangebyscore(key, "-inf", cutoff)

    def touch(self, notebook_id: int, member_key: str) -> None:
        """Record/update presence for a viewer; prune stale entries."""
        r = get_redis_client()
        key = self._key(notebook_id)
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, key, now_ms)
            pipe.zadd(key, {member_key: now_ms})
            pipe.expire(key, KEY_TTL_SECONDS)
            pipe.execute()
        except RedisError as e:
            logger.warning("notebook presence touch failed: %s", e)
            raise

    def leave(self, notebook_id: int, member_key: str) -> None:
        """Remove viewer from presence set (best-effort)."""
        r = get_redis_client()
        key = self._key(notebook_id)
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, key, now_ms)
            pipe.zrem(key, member_key)
            pipe.expire(key, KEY_TTL_SECONDS)
            pipe.execute()
        except RedisError as e:
            logger.warning("notebook presence leave failed: %s", e)
            raise

    def online_viewer_count(self, notebook_id: int) -> int:
        """Count viewers with a recent heartbeat."""
        r = get_redis_client()
        key = self._key(notebook_id)
        now_ms = self._now_ms()
        try:
            pipe = r.pipeline()
            self._prune_stale(pipe, key, now_ms)
            pipe.zcard(key)
            results = pipe.execute()
            return int(results[-1] or 0)
        except RedisError as e:
            logger.warning("notebook presence count failed: %s", e)
            raise
