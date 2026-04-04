import redis
from typing import Optional

from app.core.config import settings

# Singleton Redis client
_redis_client: Optional[redis.Redis] = None
_connection_pool: Optional[redis.ConnectionPool] = None


def get_redis_client() -> redis.Redis:
    """Get singleton Redis client with connection pooling

    Returns:
        Redis client instance

    Raises:
        redis.ConnectionError: If Redis is not available
    """
    global _redis_client, _connection_pool

    if _redis_client is None:
        # Create connection pool
        _connection_pool = redis.ConnectionPool.from_url(
            settings.REDIS_URL,
            max_connections=settings.REDIS_MAX_CONNECTIONS,
            socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
            socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
            decode_responses=True  # Automatically decode responses to strings
        )

        # Create Redis client
        _redis_client = redis.Redis(connection_pool=_connection_pool)

    return _redis_client


def close_redis_client() -> None:
    """Close Redis connection pool

    Should be called on application shutdown.
    """
    global _redis_client, _connection_pool

    if _connection_pool:
        _connection_pool.disconnect()
        _connection_pool = None

    if _redis_client:
        _redis_client = None
