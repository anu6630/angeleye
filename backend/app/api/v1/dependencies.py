from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.core.security import get_current_user_id
from app.core.config import settings
from app.core.exceptions import RateLimitError

# Rate limiter setup (SEC-04, D-26, PITFALL 5)
limiter = Limiter(key_func=get_remote_address)

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
