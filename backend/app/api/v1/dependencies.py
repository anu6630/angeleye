from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.core.security import get_current_user_id
from app.core.config import settings
from app.core.exceptions import RateLimitError
from app.core.cache import cache

# Rate limiting setup (SEC-04, D-26, INFRA-05)
class RateLimiter:
    """Redis-backed rate limiter for API endpoints"""

    def __init__(self):
        self.cache = cache

    async def check_rate_limit(
        self,
        request: Request,
        limit: int = 10,
        period: str = "minute",
        key: Optional[str] = None
    ):
        """
        Check rate limit for a request

        Args:
            request: FastAPI request object
            limit: Number of requests allowed per period
            period: Time period (second, minute, hour, day)
            key: Optional custom key for rate limiting

        Raises:
            RateLimitError: If rate limit is exceeded
        """
        # Get client IP address as default key
        if key is None:
            key = request.client.host if request.client else "unknown"

        # Convert period to seconds
        period_seconds = {
            "second": 1,
            "minute": 60,
            "hour": 3600,
            "day": 86400
        }.get(period, 60)

        # Generate cache key
        cache_key = f"rate_limit:{key}:{period}"

        # Get current count
        current = self.cache.get(cache_key)

        if current is None:
            # First request in window
            self.cache.set(cache_key, 1, period_seconds)
        elif int(current) >= limit:
            # Rate limit exceeded
            raise RateLimitError(detail=f"Rate limit exceeded: {limit} requests per {period}")
        else:
            # Increment counter
            self.cache.increment(cache_key)

# Global rate limiter instance
rate_limiter = RateLimiter()

def rate_limit_authorization(requests_per_minute: int = 10):
    """Rate limiting dependency for authorization endpoints"""
    async def check_limit(request: Request):
        await rate_limiter.check_rate_limit(
            request,
            limit=requests_per_minute,
            period="minute"
        )
    return check_limit

def rate_limit_general(requests_per_minute: int = 30):
    """Rate limiting dependency for general endpoints"""
    async def check_limit(request: Request):
        await rate_limiter.check_rate_limit(
            request,
            limit=requests_per_minute,
            period="minute"
        )
    return check_limit

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


async def rate_limit_chat_messages(request: Request, user_id: int = Depends(require_auth)) -> int:
    await rate_limiter.check_rate_limit(
        request,
        limit=settings.CHAT_MESSAGE_RATE_PER_MINUTE,
        period="minute",
        key=f"chat_msg:{user_id}",
    )
    return user_id


async def rate_limit_chat_presign(request: Request, user_id: int = Depends(require_auth)) -> int:
    await rate_limiter.check_rate_limit(
        request,
        limit=settings.CHAT_ATTACHMENT_PRESIGN_RATE_PER_MINUTE,
        period="minute",
        key=f"chat_presign:{user_id}",
    )
    return user_id
