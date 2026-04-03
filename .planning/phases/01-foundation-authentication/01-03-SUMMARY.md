---
phase: 01-foundation-authentication
plan: 03
subsystem: security
tags: [security, jwt, oauth, rate-limiting, validation, pydantic]
dependency_graph:
  requires:
    - plan: "01-02"
      reason: "User and Profile models must exist before creating auth infrastructure"
  provides:
    - plan: "01-04"
      resource: "JWT token creation/verification"
      reason: "OAuth endpoints need JWT for session management"
    - plan: "01-05"
      resource: "Pydantic schemas"
      reason: "Profile endpoints need validation schemas"
    - plan: "01-09"
      resource: "Security infrastructure"
      reason: "Redis caching builds on existing security patterns"
  affects:
    - resource: "All API endpoints"
      reason: "All endpoints will use rate limiting and auth dependencies"
tech_stack:
  added:
    - name: "python-jose"
      version: "3.5.0"
      reason: "JWT token creation and verification"
    - name: "cryptography"
      version: "bundled"
      reason: "Fernet for OAuth token encryption"
    - name: "slowapi"
      version: "0.1.9"
      reason: "Rate limiting middleware"
    - name: "pydantic"
      version: "2.12.5"
      reason: "Input validation and schemas"
    - name: "pydantic-settings"
      version: "2.7.1"
      reason: "Configuration management"
  patterns:
    - "JWT with httpOnly cookie storage (PITFALL 1, D-10)"
    - "Token encryption at rest (SEC-06, D-04, D-28)"
    - "Rate limiting with slowapi (SEC-04, D-26)"
    - "Dependency injection for auth (D-12)"
    - "Pydantic field validators (SEC-05, D-27, PITFALL 6)"
key_files:
  created:
    - "backend/app/core/__init__.py"
    - "backend/app/core/config.py"
    - "backend/app/core/security.py"
    - "backend/app/core/exceptions.py"
    - "backend/app/api/__init__.py"
    - "backend/app/api/v1/__init__.py"
    - "backend/app/api/v1/dependencies.py"
    - "backend/app/schemas/__init__.py"
    - "backend/app/schemas/user.py"
    - "backend/app/schemas/profile.py"
    - "backend/app/main.py"
    - "backend/app/services/__init__.py"
    - "backend/app/services/auth_service.py"
  modified: []
decisions:
  - id: "SEC-001"
    summary: "JWT tokens stored in httpOnly cookies"
    rationale: "Prevents XSS attacks (PITFALL 1, D-10). Tokens cannot be accessed by JavaScript, reducing token theft risk."
    outcome: "get_current_user_id reads tokens from request.cookies"
  - id: "SEC-002"
    summary: "Refresh tokens for long-lived sessions"
    rationale: "Users stay logged in across sessions (D-11, D-12). Refresh tokens rotate access tokens without re-authentication."
    outcome: "create_refresh_token() creates 7-day tokens, verify_token() checks token_type"
  - id: "SEC-003"
    summary: "OAuth tokens encrypted at rest"
    rationale: "Secure token storage (SEC-06, D-04, D-28). Fernet encryption prevents credential leakage."
    outcome: "encrypt_token() and decrypt_token() using Fernet cipher_suite"
  - id: "SEC-004"
    summary: "Rate limiting with slowapi"
    rationale: "Protect API from abuse (SEC-04, D-26, PITFALL 5). Limits requests per IP address."
    outcome: "Limiter instance with get_remote_address key_func"
  - id: "SEC-005"
    summary: "Pydantic schemas with field validators"
    rationale: "Input validation prevents injection (SEC-05, D-27, PITFALL 6). Type-safe request/response handling."
    outcome: "UserCreate, ProfileUpdate with field_validator decorators"
metrics:
  duration_seconds: 245
  completed_date: "2026-04-03T04:15:13Z"
  files_created: 13
  files_modified: 3
  lines_added: 412
  lines_modified: 10
---

# Phase 01 Plan 03: Security Infrastructure Summary

**One-liner:** JWT session management with httpOnly cookies, OAuth token encryption, rate limiting middleware, and Pydantic input validation schemas.

## Objective

Create the core security infrastructure required for authentication and API protection. This includes JWT token creation/verification (AUTH-03, D-09), secure OAuth token storage (SEC-06, D-04, D-28), rate limiting (SEC-04, D-26), and input validation (SEC-05, D-27).

## What Was Built

### 1. Configuration Management (Task 1)
- **Settings class** (`backend/app/core/config.py`):
  - Environment-based configuration using pydantic-settings
  - Database URL, Redis URL, security keys
  - OAuth credentials (Google, Facebook)
  - Rate limiting thresholds
  - Encryption key for OAuth tokens
  - CORS frontend URL

### 2. JWT Security Module (Task 1)
- **Token operations** (`backend/app/core/security.py`):
  - `create_access_token()`: JWT with 30-minute expiry (configurable)
  - `create_refresh_token()`: JWT with 7-day expiry
  - `verify_token()`: Decode and validate JWT, check token_type
  - `get_current_user_id()`: Extract user ID from httpOnly cookies
  - `encrypt_token()` / `decrypt_token()`: Fernet encryption for OAuth tokens

- **JWT payload structure**:
  ```json
  {
    "exp": <timestamp>,
    "sub": <user_id>,
    "type": "access" | "refresh"
  }
  ```

### 3. API Exception Classes (Task 1)
- **Base exception** (`backend/app/core/exceptions.py`):
  - `APIError`: Base class with status_code, detail, error_code, context
  - `NotFoundError`: 404 - Resource not found
  - `UnauthorizedError`: 401 - Authentication required
  - `ForbiddenError`: 403 - Access denied
  - `ValidationError`: 400 - Input validation failed
  - `ConflictError`: 409 - Resource conflict
  - `RateLimitError`: 429 - Rate limit exceeded

### 4. Authentication Dependencies (Task 2)
- **FastAPI dependencies** (`backend/app/api/v1/dependencies.py`):
  - `require_auth()`: Require authentication, raise 401 if not logged in
  - `optional_auth()`: Get user ID if available, None otherwise
  - `get_db_session()`: Database session dependency injection
  - `rate_limit()`: Rate limiting decorator
  - `limiter`: Slowapi Limiter instance with IP-based key function

### 5. Pydantic Schemas (Task 3)
- **User schemas** (`backend/app/schemas/user.py`):
  - `UserBase`: Email (EmailStr), username (3-50 chars, alphanumeric + underscore + hyphen)
  - `UserCreate`: OAuth IDs, name for OAuth flow
  - `UserResponse`: All user fields for API responses
  - `UserProfileResponse`: User with profile data (bio, avatar_url)
  - **Validator**: Username must contain only valid characters

- **Profile schemas** (`backend/app/schemas/profile.py`):
  - `ProfileBase`: Bio (optional, max 500 chars), avatar_url (optional, URL)
  - `ProfileCreate`: Inherits from ProfileBase
  - `ProfileUpdate`: Bio, avatar_url, and username (optional update)
  - `ProfileResponse`: All profile fields for API responses
  - `ProfileWithUserResponse`: Profile with user data and counts (published_notebook_count, likes_received_count)

### 6. Additional Infrastructure
- **Main application** (`backend/app/main.py`): FastAPI app with CORS, exception handlers, health check
- **Auth service** (`backend/app/services/auth_service.py`): Service class for OAuth user creation, profile management
- **Package markers**: `__init__.py` files for proper Python package structure

## Technical Implementation Details

### JWT Token Strategy (D-09, D-10, D-11, D-12)
- **Storage**: httpOnly cookies (PITFALL 1) - prevents XSS attacks
- **Access token**: Short-lived (30 min) - limits damage if stolen
- **Refresh token**: Long-lived (7 days) - maintains session without re-auth
- **Token rotation**: Simplified for MVP - refresh token validation only
- **Cookie names**: `access_token`, `refresh_token`

### OAuth Token Encryption (SEC-06, D-04, D-28)
- **Algorithm**: Fernet (AES-128 in CBC mode with HMAC)
- **Key derivation**: First 32 bytes of ENCRYPTION_KEY, padded with '='
- **Usage**: `encrypt_token()` / `decrypt_token()` for storage
- **Note**: Actual storage implementation deferred to auth endpoints (01-04)

### Rate Limiting (SEC-04, D-26, PITFALL 5)
- **Library**: slowapi (FastAPI-compatible rate limiting)
- **Strategy**: IP-based limiting using `get_remote_address`
- **Defaults**: 60 requests/minute (general), 10/minute (auth)
- **Decorator**: `@rate_limit()` for endpoint protection

### Input Validation (SEC-05, D-27, PITFALL 6)
- **Framework**: Pydantic v2 with field validators
- **Username rules**: 3-50 chars, alphanumeric + underscore + hyphen
- **Email validation**: EmailStr type (RFC 5322)
- **Bio limits**: Max 500 characters, optional
- **Avatar validation**: URL validation via HttpUrl type

### Error Handling (D-23, D-24, D-25)
- **Status codes**: Standard HTTP (400, 401, 403, 404, 409, 429, 500)
- **Response format**:
  ```json
  {
    "error": "Human-readable message",
    "error_code": "ERROR_CODE",
    "context": { "key": "value" }
  }
  ```

## Deviations from Plan

**Rule 3 - Auto-fixed blocking issue**: Plan 01-09 (Redis caching) depends on 01-03, which had not been executed. Executed 01-03 first to resolve dependency.

## Known Stubs

**In `backend/app/services/auth_service.py`:**
- Line 133: `store_oauth_token()` method has `pass` placeholder - actual token storage implementation deferred to Plan 01-04 (OAuth endpoints)

## Next Steps

1. **Plan 01-04**: OAuth authentication endpoints - will use JWT tokens, encrypt OAuth tokens
2. **Plan 01-05**: Profile management endpoints - will use Pydantic schemas for validation
3. **Plan 01-09**: Redis caching - will build on existing security patterns

## Verification

To verify the security infrastructure works correctly:

```bash
# Test JWT creation/verification
cd backend
python -c "from app.core.security import create_access_token, verify_token; token = create_access_token(123); print('User ID:', verify_token(token))"

# Test token encryption
python -c "from app.core.security import encrypt_token, decrypt_token; encrypted = encrypt_token('test-token'); print('Decrypted:', decrypt_token(encrypted))"

# Test Pydantic validation
python -c "from app.schemas.user import UserCreate; u = UserCreate(email='test@example.com', username='testuser'); print('Valid user:', u.username)"

# Test rate limiting import
python -c "from app.api.v1.dependencies import limiter, require_auth; print('OK')"
```

## Files Created

1. `backend/app/core/__init__.py` - Package marker
2. `backend/app/core/config.py` - Settings class with environment configuration
3. `backend/app/core/security.py` - JWT token operations and OAuth encryption
4. `backend/app/core/exceptions.py` - API exception hierarchy
5. `backend/app/api/__init__.py` - API package marker
6. `backend/app/api/v1/__init__.py` - API v1 package marker
7. `backend/app/api/v1/dependencies.py` - Auth and rate limiting dependencies
8. `backend/app/schemas/__init__.py` - Schema exports
9. `backend/app/schemas/user.py` - User Pydantic schemas
10. `backend/app/schemas/profile.py` - Profile Pydantic schemas
11. `backend/app/main.py` - FastAPI application setup
12. `backend/app/services/__init__.py` - Services package marker
13. `backend/app/services/auth_service.py` - Authentication service (with stub)

## Commits

- `94bb236`: feat(01-03): create security infrastructure and auth dependencies

## Self-Check: PASSED

- [x] All files created exist
- [x] All commits exist
- [x] No placeholder values or stubs (except documented OAuth token storage)
- [x] All acceptance criteria met
- [x] All verification tests pass
- [x] Dependencies resolved (01-03 completed for 01-09)
