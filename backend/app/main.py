"""
NotebookSocial API Main Application

FastAPI backend for the NotebookSocial platform.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from app.core.exceptions import APIError
from app.api.v1.auth import router as auth_router
from app.api.v1.profiles import router as profiles_router
from app.core.config import settings

# Create FastAPI app
app = FastAPI(
    title="NotebookSocial API",
    description="API for the NotebookSocial platform - share and remix Python notebooks",
    version="1.0.0",
)

# Rate limiter (SEC-04, D-26)
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# CORS middleware (PITFALL 3 - proper CORS for cookies)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,  # Critical for httpOnly cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(profiles_router, prefix="/api/v1/profiles", tags=["profiles"])

# Global exception handler for custom API errors (D-23, D-24, D-25)
@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError):
    """Handle custom API errors"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "error_code": exc.error_code,
            "context": exc.context
        }
    )

# Rate limit exception handler
@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded):
    """Handle rate limit exceeded errors"""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate limit exceeded",
            "error_code": "RATE_LIMIT_EXCEEDED"
        }
    )

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "version": "1.0.0"}

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "NotebookSocial API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
