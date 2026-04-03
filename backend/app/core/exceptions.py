from fastapi import HTTPException, status
from typing import Any, Optional, Dict


class APIError(Exception):
    """Base exception for API errors"""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        self.context = context or {}
        super().__init__(detail)

    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException (D-23, D-24, D-25)"""
        return HTTPException(
            status_code=self.status_code,
            detail={
                "error": self.detail,
                "error_code": self.error_code,
                "context": self.context
            }
        )


class NotFoundError(APIError):
    """Resource not found (404)"""
    def __init__(self, detail: str = "Resource not found", context: Optional[Dict[str, Any]] = None):
        super().__init__(status.HTTP_404_NOT_FOUND, detail, "NOT_FOUND", context)


class UnauthorizedError(APIError):
    """Unauthorized access (401)"""
    def __init__(self, detail: str = "Unauthorized", context: Optional[Dict[str, Any]] = None):
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail, "UNAUTHORIZED", context)


class ForbiddenError(APIError):
    """Forbidden access (403)"""
    def __init__(self, detail: str = "Forbidden", context: Optional[Dict[str, Any]] = None):
        super().__init__(status.HTTP_403_FORBIDDEN, detail, "FORBIDDEN", context)


class ValidationError(APIError):
    """Validation error (400)"""
    def __init__(self, detail: str = "Validation failed", context: Optional[Dict[str, Any]] = None):
        super().__init__(status.HTTP_400_BAD_REQUEST, detail, "VALIDATION_ERROR", context)


class ConflictError(APIError):
    """Resource conflict (409)"""
    def __init__(self, detail: str = "Resource conflict", context: Optional[Dict[str, Any]] = None):
        super().__init__(status.HTTP_409_CONFLICT, detail, "CONFLICT", context)


class RateLimitError(APIError):
    """Rate limit exceeded (429)"""
    def __init__(self, detail: str = "Rate limit exceeded", context: Optional[Dict[str, Any]] = None):
        super().__init__(status.HTTP_429_TOO_MANY_REQUESTS, detail, "RATE_LIMIT_EXCEEDED", context)
