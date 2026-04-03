from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.core.security import get_current_user_id
from app.core.config import settings
from app.core.exceptions import RateLimitError
from app.core.cache import cache

# Custom rate limiter that uses Redis storage
class RedisLimiter:
    """Redis-backed rate limiter for slowapi"""

    def __init__(self):
        self.cache = cache

    def limit(self, key_func, limit: str):
        """Create a rate limit decorator"""
        def decorator(func):
            async def wrapper(request: Request, *args, **kwargs):
                # Get key from function
                key = key_func(request)

                # Parse limit (e.g., "10/minute" -> 10 requests per 60 seconds)
                limit_parts = limit.split("/")
                requests_per_period = int(limit_parts[0])
                period = limit_parts[1] if len(limit_parts) > 1 else "minute"

                # Convert period to seconds
                period_seconds = {
                    "second": 1,
                    "minute": 60,
                    "hour": 3600,
                    "day": 86400
                }.get(period, 60)

                # Generate cache key
                cache_key = f"rate_limit:{key}"

                # Get current count
                current = self.cache.get(cache_key)

                if current is None:
                    # First request in window
                    self.cache.set(cache_key, 1, period_seconds)
                elif current >= requests_per_period:
                    # Rate limit exceeded
                    raise RateLimitError(detail=f"Rate limit exceeded: {limit}")
                else:
                    # Increment counter
                    self.cache.increment(cache_key)

                return await func(request, *args, **kwargs)
            return wrapper
        return decorator

# Rate limiter setup (SEC-04, D-26, INFRA-05)
# Note: Using Redis-backed limiter for production
redis_limiter = RedisLimiter()
limiter = redis_limiter

async def require_auth(
    request: Request
) -> int:
    """Require authentication, raise 401 if not authenticated (AUTH-05, D-12)"""
    user_id = await get_current_user_id(request)
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id

async def optional_auth(request: Request) -> Optional[int]:
    """Optional authentication for routes that work with or without auth (AUTH-04)"""
    return await get_current_user_id(request)

def get_db_session(db: Session = Depends(get_db)) -> Session:
    """Get database session dependency"""
    return db

def rate_limit(requests_per_minute: int = None):
    """Rate limiting decorator (SEC-04, D-26)"""
    limit = requests_per_minute or settings.RATE_LIMIT_PER_MINUTE
    def decorator(func):
        return limiter.limit(f"{limit}/minute")(func)
    return decorator
