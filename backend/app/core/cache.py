from redis import Redis
from redis.exceptions import RedisError
from app.core.config import settings
from typing import Optional, Any
import json
import logging

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis cache client wrapper (INFRA-05)"""

    def __init__(self):
        self.client: Optional[Redis] = None
        self._connect()

    def _connect(self) -> None:
        """Connect to Redis"""
        try:
            self.client = Redis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                health_check_interval=30
            )
            # Test connection
            self.client.ping()
            logger.info("Redis cache connected successfully")
        except RedisError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self.client = None

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.client:
            return None
        try:
            value = self.client.get(key)
            if value is None:
                return None
            # Try to parse as JSON, return as string if fails
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
        except RedisError as e:
            logger.error(f"Cache get error: {e}")
            return None

    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache with TTL (default 1 hour)"""
        if not self.client:
            return False
        try:
            # Serialize as JSON if not string
            if not isinstance(value, str):
                value = json.dumps(value)
            return self.client.setex(key, ttl, value)
        except RedisError as e:
            logger.error(f"Cache set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        if not self.client:
            return False
        try:
            return self.client.delete(key) > 0
        except RedisError as e:
            logger.error(f"Cache delete error: {e}")
            return False

    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if not self.client:
            return False
        try:
            return self.client.exists(key) > 0
        except RedisError as e:
            logger.error(f"Cache exists error: {e}")
            return False

    def increment(self, key: str, amount: int = 1) -> int:
        """Increment counter in cache (for rate limiting)"""
        if not self.client:
            return 0
        try:
            return self.client.incr(key, amount)
        except RedisError as e:
            logger.error(f"Cache increment error: {e}")
            return 0

    def expire(self, key: str, ttl: int) -> bool:
        """Set TTL for existing key"""
        if not self.client:
            return False
        try:
            return self.client.expire(key, ttl)
        except RedisError as e:
            logger.error(f"Cache expire error: {e}")
            return False

    def ping(self) -> bool:
        """Test Redis connection"""
        if not self.client:
            return False
        try:
            self.client.ping()
            return True
        except RedisError:
            return False


# Global cache instance
cache = RedisCache()
