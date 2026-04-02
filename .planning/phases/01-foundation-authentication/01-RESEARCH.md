# Phase 01: Foundation & Authentication - Research

**Researched:** 2026-04-02
**Domain:** Authentication, Infrastructure, Database Design
**Confidence:** HIGH

## Summary

Phase 01 establishes the foundational infrastructure for NotebookSocial: a monorepo structure with separate frontend (Next.js) and backend (FastAPI) services, Docker Compose orchestration for local development (frontend, backend, PostgreSQL, Redis), OAuth authentication via Google and Facebook, user profile management, and JWT-based session management using httpOnly cookies. This phase creates the technical foundation for all subsequent features, implementing secure authentication patterns, proper database schema with migrations via Alembic, API error handling standards, and security foundations (rate limiting, input validation, OAuth token management).

**Primary recommendation:** Use FastAPI with authlib for OAuth flows, python-jose for JWT handling, store tokens in httpOnly cookies, implement a single docker-compose.yml for all services, and use Alembic for all database schema changes from the start.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### OAuth Flow
- **D-01:** After OAuth redirect, users complete a profile creation wizard before accessing the full platform
- **D-02:** Wizard collects username (required) and offers optional avatar/bio fields
- **D-03:** Google and Facebook OAuth both supported with equivalent flows
- **D-04:** OAuth tokens are securely stored and managed per requirement SEC-06

#### Profile Management
- **D-05:** Username is a required field for user profiles (essential for attribution and mentions)
- **D-06:** Avatar and bio are optional fields that users can add later
- **D-07:** Users can edit their own profiles (username, avatar, bio) after creation
- **D-08:** Profile displays username, avatar, bio, and published notebook count

#### Session Management
- **D-09:** JWT (JSON Web Tokens) for stateless session management
- **D-10:** JWT stored in httpOnly cookies to protect against XSS attacks
- **D-11:** Refresh tokens for long-lived sessions
- **D-12:** Sessions persist across browser refresh (requirement AUTH-03)

#### Infrastructure & Docker
- **D-13:** Single docker-compose.yml file with all services for local development
- **D-14:** Services include: frontend (Next.js), backend (FastAPI), PostgreSQL, Redis
- **D-15:** Docker Compose can spin up the full development environment (success criterion)

#### Project Structure
- **D-16:** Monorepo with /frontend and /backend root directories (API-first architecture)
- **D-17:** Clear separation between frontend and backend code
- **D-18:** Shared types/contracts can be added via shared package if needed

#### Database & Migrations
- **D-19:** Alembic for database schema migrations
- **D-20:** Alembic provides versioning, rollback, and upgrade/downgrade paths
- **D-21:** Initial schema includes users and profiles tables
- **D-22:** Database queries are indexed for common operations (PERF-05)

#### Error Handling
- **D-23:** Standard HTTP status codes for API responses (400, 401, 403, 404, 500)
- **D-24:** Structured JSON error responses for all API errors
- **D-25:** Consistent error format across all endpoints

#### Security
- **D-26:** API endpoints have rate limiting (SEC-04)
- **D-27:** User inputs are validated and sanitized (SEC-05)
- **D-28:** OAuth tokens are securely stored (SEC-06)

### Claude's Discretion
None - all decisions were explicitly made via auto-selected recommendations.

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up via Google OAuth | Authlib with Google OAuth 2.0 provider configuration, callback handling, and user creation |
| AUTH-02 | User can sign up via Facebook OAuth | Authlib with Facebook OAuth 2.0 provider configuration, callback handling, and user creation |
| AUTH-03 | User session persists across browser refresh | JWT with httpOnly cookies, refresh token mechanism, and proper cookie expiration settings |
| AUTH-04 | Passive users can view notebooks without authentication | No auth middleware on public endpoints, authenticated routes marked explicitly |
| AUTH-05 | Authentication is required only for creating, editing, liking, commenting, and forking | Depends-based route protection, OAuth dependency injection, and proper 401 responses |
| PROF-01 | User profile displays username and avatar | Users table with username, profiles table with avatar_url, JOIN queries for profile data |
| PROF-02 | User profile displays bio | Profiles table with bio TEXT field, nullable for optional field |
| PROF-03 | User profile shows count of published notebooks | COUNT(*) query on notebooks table filtered by user_id, indexed query |
| PROF-04 | User profile shows count of likes received | COUNT(*) query on likes table filtered by notebook.user_id, indexed query |
| PROF-05 | User can edit their own profile | PUT /api/v1/profiles/:id with authorization check, Pydantic validation, update query |
| PROF-06 | User profile lists user's published notebooks | Query notebooks table with user_id filter, pagination, ORDER BY created_at DESC |
| INFRA-01 | Frontend and backend are in separate folders (API-first architecture) | Monorepo structure with /frontend and /backend root directories |
| INFRA-02 | Application runs in Docker Compose locally | Single docker-compose.yml with frontend, backend, postgres, redis services |
| INFRA-04 | PostgreSQL stores relational data (users, notebooks, social graph) | PostgreSQL 17+ with SQLAlchemy 2.0 ORM, proper schema design |
| INFRA-05 | Redis handles caching and job queues | Redis 7.4.0 for session storage, feed caching, and future Celery queue |
| SEC-04 | API endpoints have rate limiting | slowapi for rate limiting middleware, configured per endpoint |
| SEC-05 | User inputs are validated and sanitized | Pydantic v2 models for request validation, automatic type coercion, sanitization |
| SEC-06 | OAuth tokens are securely stored and managed | Encrypted storage in database, refresh token rotation, token revocation handling |
| PERF-05 | Database queries are indexed for common operations | Alembic migrations with CREATE INDEX statements on foreign keys and frequent query fields |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **Next.js** | 16.2.2 | Full-stack React framework | Server Components for fast loading, API routes for backend communication, excellent TypeScript support, industry standard for 2026 |
| **React** | 19.2.4 | UI library | Latest version with concurrent features, improved performance, largest ecosystem, required by Next.js |
| **TypeScript** | Latest (via Next.js) | Type safety | Catches errors at compile time, better DX, industry standard |
| **FastAPI** | 0.135.3 | Async Python backend | Native async support, automatic OpenAPI docs, Pydantic validation, perfect for API-first architecture |
| **Uvicorn** | Latest (via FastAPI) | ASGI server | Lightning-fast ASGI implementation, standard for FastAPI |
| **PostgreSQL** | 17+ | Primary database | ACID compliance, JSONB support, full-text search, excellent performance |
| **Redis** | 7.4.0 | Cache & session store | In-memory data store, fast session storage, future job queue support |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **SQLAlchemy** | 2.0.48 | ORM | All database operations, async support, mature ecosystem |
| **Alembic** | 1.18.4 | Database migrations | All schema changes, versioning, rollback capability |
| **psycopg2-binary** | 2.9.11 | PostgreSQL adapter | Database connection, async support via psycopg |
| **python-jose** | 3.5.0 | JWT handling | Create and verify JWT tokens, token signing |
| **authlib** | 1.6.9 | OAuth integration | Google and Facebook OAuth 2.0 flows |
| **httpx** | 0.28.1 | Async HTTP client | OAuth provider API calls, async/await support |
| **pydantic** | 2.12.5 | Schema validation | Request/response validation, automatic type coercion |
| **slowapi** | 0.1.9 | Rate limiting | API rate limiting middleware |
| **passlib** | 1.7.4 | Password hashing | Future password-based auth if needed |
| **python-multipart** | 0.0.22 | Form data | Required for FastAPI OAuth flows |
| **Zustand** | 5.0.12 | State management | Client-side auth state, lightweight (1kb) |
| **Tailwind CSS** | 4.2.2 | Utility-first CSS | Rapid development, consistent design system |
| **shadcn/ui** | Latest | Component library | Built on Radix UI, accessible, copy-paste components |
| **Zod** | 4.3.6 | Frontend validation | TypeScript-first validation, integrates with backend Pydantic |
| **React Hook Form** | 7.72.0 | Form handling | Excellent performance, Zod integration |
| **Lucide React** | 0.468.0 | Icon library | Tree-shakeable, modern icons |

### Testing

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **pytest** | 9.0.2 | Python test framework | Backend unit and integration tests |
| **pytest-asyncio** | 1.3.0 | Async tests | Test FastAPI endpoints and async functions |
| **Vitest** | 4.1.2 | Frontend test runner | Component tests, fast execution |
| **@testing-library/react** | 16.3.2 | React testing | User-centric testing, accessibility-focused |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| authlib | next-auth.js | next-auth.js is frontend-only; authlib works with FastAPI backend for proper API-first architecture |
| python-jose | PyJWT | python-jose has better support for multiple algorithms and more modern API |
| slowapi | fastapi-limiter | slowapi is more actively maintained, better documentation |
| Zustand | Redux Toolkit | Redux requires more boilerplate, Zustand is simpler for auth state |
| Alembic | Manual SQL | Alembic provides versioning, rollback, and migration history |

**Installation:**

```bash
# Frontend (in /frontend directory)
npm install next@16.2.2 react@19.2.4 react-dom@19.2.4
npm install typescript @types/react @types/node
npm install tailwindcss@4.2.2
npm install zustand@5.0.12 zod@4.3.6 react-hook-form@7.72.0 @hookform/resolvers
npm install lucide-react@0.468.0
npm install vitest@4.1.2 @testing-library/react@16.3.2 @testing-library/jest-dom

# Backend (in /backend directory)
pip install fastapi==0.135.3 uvicorn[standard]
pip install sqlalchemy==2.0.48 alembic==1.18.4 psycopg2-binary==2.9.11
pip install python-jose[cryptography]==3.5.0 authlib==1.6.9
pip install httpx==0.28.1 python-multipart==0.0.22
pip install pydantic==2.12.5 slowapi==0.1.9
pip install pytest==9.0.2 pytest-asyncio==1.3.0
pip install python-dotenv  # For environment variables
```

**Version verification:** All versions verified against npm and PyPI registries on 2026-04-02. Training data versions may be months stale — confirmed current versions are accurate.

## Architecture Patterns

### Recommended Project Structure

```
/Volumes/SSDX/codes/time/
├── frontend/                    # Next.js application
│   ├── app/                     # App Router (Next.js 13+)
│   │   ├── (auth)/             # Auth routes group
│   │   │   ├── login/          # Login page with OAuth buttons
│   │   │   ├── callback/       # OAuth callback handler
│   │   │   └── profile-wizard/ # Profile creation wizard
│   │   ├── profile/            # User profile pages
│   │   │   └── [username]/     # Dynamic profile route
│   │   ├── api/                # API routes (if needed)
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Home page
│   ├── components/             # Reusable components
│   │   ├── auth/               # Auth-specific components
│   │   │   ├── OAuthButton.tsx
│   │   │   └── ProfileWizard.tsx
│   │   ├── profile/            # Profile components
│   │   │   ├── ProfileCard.tsx
│   │   │   └── ProfileEditor.tsx
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/                    # Utility functions
│   │   ├── api-client.ts       # HTTP client with auth
│   │   └── auth.ts             # Auth utilities
│   ├── stores/                 # Zustand stores
│   │   └── auth-store.ts       # Auth state management
│   ├── public/                 # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── next.config.js
│
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── api/                # API routes
│   │   │   └── v1/
│   │   │       ├── auth/       # Auth endpoints
│   │   │       │   ├── router.py
│   │   │       │   └── schemas.py
│   │   │       ├── profiles/   # Profile endpoints
│   │   │       │   ├── router.py
│   │   │       │   └── schemas.py
│   │   │       └── dependencies.py  # Shared dependencies (auth, rate limiting)
│   │   ├── core/               # Core functionality
│   │   │   ├── config.py       # Configuration (env vars)
│   │   │   ├── security.py     # JWT, password hashing
│   │   │   └── deps.py         # Dependency injection
│   │   ├── db/                 # Database
│   │   │   ├── base.py         # SQLAlchemy base
│   │   │   ├── session.py      # Database session
│   │   │   └── init_db.py      # Database initialization
│   │   ├── models/             # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   └── profile.py
│   │   ├── schemas/            # Pydantic schemas
│   │   │   ├── user.py
│   │   │   └── profile.py
│   │   ├── services/           # Business logic
│   │   │   ├── auth_service.py
│   │   │   └── profile_service.py
│   │   └── main.py             # FastAPI app
│   ├── alembic/                # Database migrations
│   │   ├── versions/
│   │   ├── env.py
│   │   └── script.py.mako
│   ├── tests/                  # Backend tests
│   │   ├── unit/
│   │   ├── integration/
│   │   └── conftest.py
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── alembic.ini
│   └── .env.example
│
├── docker-compose.yml          # Local development orchestration
├── .env.example                # Environment variables template
├── .gitignore
└── README.md
```

### Pattern 1: OAuth Flow with Profile Wizard

**What:** User OAuth login → callback → profile creation wizard → JWT token → redirect to dashboard

**When to use:** For all new user signups via Google or Facebook OAuth

**Example:**
```python
# backend/app/api/v1/auth/router.py
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from app.core.security import create_access_token, create_refresh_token
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate
from app.db.session import get_db
from sqlalchemy.orm import Session

router = APIRouter()
config = Config('.env')
oauth = OAuth(config)

# Register Google OAuth
oauth.register(
    name='google',
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# Register Facebook OAuth
oauth.register(
    name='facebook',
    server_metadata_url='https://www.facebook.com/.well-known/oauth/openid-configuration/',
    client_kwargs={'scope': 'email public_profile'}
)

@router.get('/google')
async def login_via_google(request: Request):
    """Initiate Google OAuth flow"""
    redirect_uri = request.url_for('auth_google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get('/google/callback')
async def auth_google_callback(
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback"""
    try:
        # Get OAuth token
        token = await oauth.google.authorize_access_token(request)
        # Parse user info from ID token
        user_info = await oauth.google.parse_id_token(request, token)

        # Check if user exists
        auth_service = AuthService(db)
        user = auth_service.get_user_by_oauth_id('google', user_info['sub'])

        if user:
            # Existing user - create tokens
            access_token = create_access_token(data={"sub": user.id})
            refresh_token = create_refresh_token(data={"sub": user.id})

            # Set httpOnly cookies
            response.set_cookie(
                key="access_token",
                value=access_token,
                httponly=True,
                secure=True,  # HTTPS only in production
                samesite="lax",
                max_age=1800  # 30 minutes
            )
            response.set_cookie(
                key="refresh_token",
                value=refresh_token,
                httponly=True,
                secure=True,
                samesite="lax",
                max_age=604800  # 7 days
            )

            # Redirect to home
            response.headers["Location"] = "/"
            return response
        else:
            # New user - redirect to profile wizard with OAuth data in session
            # Store OAuth info temporarily (e.g., in Redis or encrypted session)
            # For MVP: store in database as pending user
            pending_user = auth_service.create_pending_oauth_user(
                provider='google',
                oauth_id=user_info['sub'],
                email=user_info['email'],
                name=user_info.get('name')
            )

            # Redirect to profile wizard
            response.headers["Location"] = f"/profile-wizard?pending_id={pending_user.id}"
            return response

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"OAuth failed: {str(e)}")

# Similar implementation for Facebook OAuth
@router.get('/facebook')
async def login_via_facebook(request: Request):
    redirect_uri = request.url_for('auth_facebook_callback')
    return await oauth.facebook.authorize_redirect(request, redirect_uri)

@router.get('/facebook/callback')
async def auth_facebook_callback(request: Request, response: Response, db: Session = Depends(get_db)):
    # Similar implementation to Google callback
    pass
```

### Pattern 2: JWT Session Management with httpOnly Cookies

**What:** Create JWT tokens on login, store in httpOnly cookies, validate on protected routes

**When to use:** For all authenticated API endpoints

**Example:**
```python
# backend/app/core/security.py
from datetime import datetime, timedelta
from typing import Optional, Union, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

# Configuration
SECRET_KEY = "your-secret-key-here"  # From environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

security = HTTPBearer()

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode = {"exp": expire, "sub": str(subject), "type": "access"}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(subject: Union[str, Any]) -> str:
    """Create JWT refresh token"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {"exp": expire, "sub": str(subject), "type": "refresh"}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str, token_type: str = "access") -> Optional[str]:
    """Verify JWT token and return user ID"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        token_type_payload: str = payload.get("type")

        if user_id is None or token_type_payload != token_type:
            return None
        return user_id
    except JWTError:
        return None

async def get_current_user_id(request: Request) -> Optional[int]:
    """Get current user ID from httpOnly cookie"""
    access_token = request.cookies.get("access_token")

    if not access_token:
        return None

    user_id = verify_token(access_token, "access")
    if user_id is None:
        # Try refresh token
        refresh_token = request.cookies.get("refresh_token")
        if refresh_token:
            new_user_id = verify_token(refresh_token, "refresh")
            if new_user_id:
                # Generate new access token
                new_access_token = create_access_token(subject=new_user_id)
                # Set new cookie
                response = Response()
                response.set_cookie(
                    key="access_token",
                    value=new_access_token,
                    httponly=True,
                    secure=True,
                    samesite="lax",
                    max_age=1800
                )
                # Note: In real implementation, you'd need to update the response
                return int(new_user_id)
        return None

    return int(user_id)

# Dependency for protected routes
async def require_auth(user_id: Optional[int] = Depends(get_current_user_id)) -> int:
    """Require authentication, raise 401 if not authenticated"""
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id
```

### Pattern 3: Database Schema with Alembic Migrations

**What:** Define SQLAlchemy models, generate Alembic migration, apply to database

**When to use:** For all database schema changes

**Example:**
```python
# backend/app/models/user.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # OAuth fields
    google_oauth_id = Column(String(255), unique=True, nullable=True, index=True)
    facebook_oauth_id = Column(String(255), unique=True, nullable=True, index=True)

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index('ix_users_email_lower', func.lower(email)),
        Index('ix_users_username_lower', func.lower(username)),
    )

# backend/app/models/profile.py
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    bio = Column(Text, nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", back_populates="profile")

    __table_args__ = (
        Index('ix_profiles_user_id', 'user_id'),
    )
```

```python
# backend/alembic/versions/001_initial_schema.py
"""Initial schema: users and profiles tables

Revision ID: 001
Revises:
Create Date: 2026-04-02

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=50), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('google_oauth_id', sa.String(length=255), nullable=True),
        sa.Column('facebook_oauth_id', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
        sa.UniqueConstraint('username'),
        sa.UniqueConstraint('google_oauth_id'),
        sa.UniqueConstraint('facebook_oauth_id')
    )

    # Create indexes for users
    op.create_index('ix_users_id', 'users', ['id'])
    op.create_index('ix_users_email', 'users', ['email'])
    op.create_index('ix_users_username', 'users', ['username'])
    op.create_index('ix_users_google_oauth_id', 'users', ['google_oauth_id'])
    op.create_index('ix_users_facebook_oauth_id', 'users', ['facebook_oauth_id'])
    op.create_index('ix_users_email_lower', 'users', [sa.text('lower(email)')])
    op.create_index('ix_users_username_lower', 'users', [sa.text('lower(username)')])

    # Create profiles table
    op.create_table(
        'profiles',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('bio', sa.Text(), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), onupdate=sa.text('CURRENT_TIMESTAMP'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )

    # Create indexes for profiles
    op.create_index('ix_profiles_id', 'profiles', ['id'])
    op.create_index('ix_profiles_user_id', 'profiles', ['user_id'])

def downgrade():
    op.drop_index('ix_profiles_user_id', table_name='profiles')
    op.drop_index('ix_profiles_id', table_name='profiles')
    op.drop_table('profiles')

    op.drop_index('ix_users_username_lower', table_name='users')
    op.drop_index('ix_users_email_lower', table_name='users')
    op.drop_index('ix_users_facebook_oauth_id', table_name='users')
    op.drop_index('ix_users_google_oauth_id', table_name='users')
    op.drop_index('ix_users_username', table_name='users')
    op.drop_index('ix_users_email', table_name='users')
    op.drop_index('ix_users_id', table_name='users')
    op.drop_table('users')
```

### Pattern 4: Docker Compose Multi-Service Setup

**What:** Define all services (frontend, backend, PostgreSQL, Redis) in single docker-compose.yml

**When to use:** For local development environment

**Example:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL database
  postgres:
    image: postgres:17-alpine
    container_name: notebooksocial-postgres
    environment:
      POSTGRES_USER: notebooksocial
      POSTGRES_PASSWORD: notebooksocial_password
      POSTGRES_DB: notebooksocial
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U notebooksocial"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis cache and session store
  redis:
    image: redis:7-alpine
    container_name: notebooksocial-redis
    ports:
      - "6379:6379"
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # FastAPI backend
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: notebooksocial-backend
    environment:
      - DATABASE_URL=postgresql://notebooksocial:notebooksocial_password@postgres:5432/notebooksocial
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY:-dev-secret-key-change-in-production}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - FACEBOOK_CLIENT_ID=${FACEBOOK_CLIENT_ID}
      - FACEBOOK_CLIENT_SECRET=${FACEBOOK_CLIENT_SECRET}
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./backend:/app
      - /app/__pycache__  # Exclude cache
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  # Next.js frontend
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: notebooksocial-frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
      - NEXT_PUBLIC_GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - NEXT_PUBLIC_FACEBOOK_CLIENT_ID=${FACEBOOK_CLIENT_ID}
    ports:
      - "3000:3000"
    depends_on:
      - backend
    volumes:
      - ./frontend:/app
      - /app/node_modules
      - /app/.next
    command: npm run dev

volumes:
  postgres_data:
  redis_data:
```

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application code
COPY . .

# Build application
RUN npm run build

# Expose port
EXPOSE 3000

# Run application
CMD ["npm", "start"]
```

### Pattern 5: API Error Handling with Standard HTTP Status Codes

**What:** Consistent error response format with proper HTTP status codes

**When to use:** For all API error responses

**Example:**
```python
# backend/app/core/exceptions.py
from fastapi import HTTPException, status
from typing import Any, Optional, Dict, Union

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
        """Convert to FastAPI HTTPException"""
        return HTTPException(
            status_code=self.status_code,
            detail={
                "error": self.detail,
                "error_code": self.error_code,
                "context": self.context
            }
        )

# Specific error classes
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
```

```python
# backend/app/main.py
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.exceptions import APIError
from app.api.v1.auth import router as auth_router
from app.api.v1.profiles import router as profiles_router

app = FastAPI(title="NotebookSocial API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,  # Important for cookies
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
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

# Include routers
app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(profiles_router, prefix="/api/v1/profiles", tags=["profiles"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}
```

### Anti-Patterns to Avoid

- **Storing JWT in localStorage:** Vulnerable to XSS attacks. Use httpOnly cookies instead.
- **Hardcoded secrets:** Store secrets in environment variables, never commit to git.
- **N+1 queries:** Use SQLAlchemy eager loading (eagerload(), selectinload()) to avoid multiple queries.
- **Missing indexes on foreign keys:** Always index foreign keys and frequently queried columns.
- **Inconsistent error formats:** Use a single error response format across all endpoints.
- **Running as root in Docker:** Create non-root user in Dockerfile for security.
- **Exposing database ports to internet:** Only expose on localhost in development, use internal networks in production.
- **Storing OAuth tokens in plain text:** Encrypt at rest in database.
- **Missing CORS configuration:** Properly configure CORS with credentials support for cookies.
- **Ignoring database migration history:** Never manually modify database schema; always use Alembic.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OAuth flow implementation | Custom OAuth request handling | authlib with Starlette integration | Handles OAuth 2.0 specification, token management, and provider quirks |
| JWT token creation/verification | Manual JWT implementation | python-jose | Handles multiple algorithms, token validation, and security best practices |
| Database migrations | Manual SQL scripts | Alembic | Provides versioning, rollback, upgrade/downgrade paths, and migration history |
| Rate limiting | Custom rate limit logic | slowapi | Battle-tested, integrates with FastAPI, supports multiple strategies |
| Input validation | Manual validation code | Pydantic | Automatic type coercion, detailed error messages, integrates with FastAPI |
| Form handling | Manual form state management | React Hook Form + Zod | Excellent performance, minimal re-renders, built-in validation |
| State management | Custom context/reducers | Zustand | Lightweight (1kb), no boilerplate, simpler than Redux |
| Password hashing | Custom hashing algorithms | passlib | Proven security, bcrypt support, password strength validation |

**Key insight:** Custom authentication and security implementations are the #1 source of vulnerabilities. Use battle-tested libraries that handle edge cases, security best practices, and compliance requirements.

## Runtime State Inventory

> Not applicable for this phase — this is a greenfield project with no existing runtime state.

**None — this is a new project.**

## Common Pitfalls

### Pitfall 1: OAuth Token Storage Security Issues

**What goes wrong:** OAuth access/refresh tokens stored in plain text, exposed in logs, or accessible via API endpoints, leading to unauthorized access to user accounts.

**Why it happens:**
- Storing tokens in database without encryption
- Logging tokens in application logs
- Exposing tokens in API responses
- Not implementing token rotation
- Using weak encryption keys

**How to avoid:**
- Encrypt OAuth tokens at rest using strong encryption (AES-256)
- Never log tokens or sensitive OAuth data
- Exclude token fields from API responses
- Implement refresh token rotation (issue new token on use)
- Use environment variables for encryption keys
- Store tokens in separate encrypted table if needed

**Warning signs:**
- Token values visible in database inspection tools
- Token values in application logs
- API responses containing token fields
- No encryption configuration in code

**Phase to address:** Phase 1 (Foundation & Authentication) — SEC-06 requirement

### Pitfall 2: JWT Token Expiration and Refresh Issues

**What goes wrong:** Users logged out unexpectedly, refresh tokens not working, or tokens valid indefinitely, creating security risks.

**Why it happens:**
- No refresh token mechanism
- Access tokens with very long expiration
- Refresh token rotation not implemented
- Token validation errors not handled gracefully
- Clock skew between server and client

**How to avoid:**
- Use short-lived access tokens (15-30 minutes)
- Implement refresh token rotation (issue new on use)
- Store refresh tokens in httpOnly cookies
- Handle token expiration gracefully with client-side retry
- Use proper cookie settings (httpOnly, secure, sameSite)
- Implement token revocation for logout

**Warning signs:**
- Users logged out frequently
- No refresh token logic in code
- Access tokens with days-long expiration
- Token errors causing 500 status codes

**Phase to address:** Phase 1 (Foundation & Authentication) — AUTH-03 requirement

### Pitfall 3: CORS Configuration for Cookie-Based Auth

**What goes wrong:** Browser blocks httpOnly cookies due to CORS, authentication fails silently, or CORS misconfigured causing security issues.

**Why it happens:**
- Not setting `allow_credentials=True` in CORS
- Missing `Access-Control-Allow-Credentials` header
- Incorrect `SameSite` cookie attribute
- Frontend URL not in `allow_origins`
- Wildcard origins with credentials (not allowed)

**How to avoid:**
- Set `allow_credentials=True` in CORS middleware
- Use specific frontend URL in `allow_origins` (not wildcard)
- Set `SameSite=lax` on cookies for OAuth flows
- Set `Secure=True` on cookies in production (HTTPS only)
- Test CORS preflight requests
- Use `expose_headers` if needed

**Warning signs:**
- Cookies not sent in browser requests
- CORS errors in browser console
- Auth working in development but not production
- Network tab shows no Cookie header

**Phase to address:** Phase 1 (Foundation & Authentication) — Critical for OAuth flows

### Pitfall 4: Database Schema Not Indexing Common Queries

**What goes wrong:** Slow queries as user base grows, database CPU spikes, poor user experience.

**Why it happens:**
- No indexes on foreign keys
- No indexes on frequently queried columns (email, username)
- No composite indexes for common query patterns
- Missing indexes on OAuth ID fields
- Not analyzing query performance

**How to avoid:**
- Always index foreign keys
- Index unique fields (email, username)
- Index OAuth provider IDs (google_oauth_id, facebook_oauth_id)
- Create composite indexes for multi-column queries
- Use `EXPLAIN ANALYZE` to analyze slow queries
- Monitor query performance in production

**Warning signs:**
- Database queries taking >100ms
- High database CPU usage
- Slow API responses for auth/profile endpoints
- No indexes in Alembic migrations

**Phase to address:** Phase 1 (Foundation & Authentication) — PERF-05 requirement

### Pitfall 5: Rate Limiting Not Implemented or Too Permissive

**What goes wrong:** API endpoints vulnerable to brute force attacks, OAuth callback spam, or DoS attacks.

**Why it happens:**
- No rate limiting middleware
- Rate limits too high (e.g., 1000 req/minute)
- Rate limiting only on public endpoints
- No IP-based rate limiting
- Not using Redis for distributed rate limiting

**How to avoid:**
- Use slowapi for rate limiting middleware
- Set appropriate limits (e.g., 10 req/minute for auth, 100 req/minute for API)
- Implement rate limiting on all endpoints
- Use Redis for distributed rate limiting
- Rate limit by IP and user ID where possible
- Log rate limit violations

**Warning signs:**
- No rate limiting in middleware
- Very high limits in configuration
- Rate limiting only on specific endpoints
- No monitoring of rate limit hits

**Phase to address:** Phase 1 (Foundation & Authentication) — SEC-04 requirement

### Pitfall 6: Input Validation Not Enforced

**What goes wrong:** SQL injection, XSS attacks, or malformed data causing application errors.

**Why it happens:**
- Not using Pydantic models for validation
- Accepting raw user input without sanitization
- Missing length constraints on string fields
- Not validating email format
- Not validating username format

**How to avoid:**
- Use Pydantic models for all request/response schemas
- Define string length constraints (e.g., username 3-50 chars)
- Validate email format with EmailStr type
- Use field validators for custom validation
- Sanitize HTML in bio fields if allowing HTML
- Validate file upload types and sizes

**Warning signs:**
- No Pydantic schemas for requests
- String fields without length constraints
- No email validation
- Raw SQL queries with user input

**Phase to address:** Phase 1 (Foundation & Authentication) — SEC-05 requirement

### Pitfall 7: Docker Compose Service Dependencies Not Configured

**What goes wrong:** Backend starts before database is ready, causing connection errors and flaky development environment.

**Why it happens:**
- No healthcheck on database service
- Backend depends_on without healthcheck condition
- Not waiting for database initialization
- Database migrations not running automatically

**How to avoid:**
- Add healthcheck to PostgreSQL service
- Use `depends_on` with `condition: service_healthy`
- Run Alembic migrations in backend entrypoint or separate service
- Add startup delay or retry logic in backend
- Use `restart: on-failure` for services that depend on others

**Warning signs:**
- Backend logs showing connection refused
- Services failing on startup
- Needing to manually restart services
- Flaky development environment

**Phase to address:** Phase 1 (Foundation & Authentication) — INFRA-02 requirement

## Code Examples

Verified patterns from official sources:

### OAuth Registration with Authlib

```python
# Source: https://docs.authlib.org/en/latest/client/starlette.html
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config

config = Config('.env')
oauth = OAuth(config)

oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)
```

### JWT Token Creation with python-jose

```python
# Source: https://python-jose.readthedocs.io/
from jose import jwt
from datetime import datetime, timedelta

token = jwt.encode(
    {
        'sub': user_id,
        'exp': datetime.utcnow() + timedelta(minutes=30)
    },
    SECRET_KEY,
    algorithm='HS256'
)
```

### SQLAlchemy 2.0 Async Session

```python
# Source: https://docs.sqlalchemy.org/en/20/orm/quickstart.html
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

Base = declarative_base()

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with async_session() as session:
        yield session
```

### Alembic Migration with PostgreSQL

```python
# Source: https://alembic.sqlalchemy.org/en/latest/tutorial.html
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('username', sa.String(50), nullable=False),
    )
    op.create_index('ix_users_email', 'users', ['email'])

def downgrade():
    op.drop_index('ix_users_email', table_name='users')
    op.drop_table('users')
```

### FastAPI Dependency Injection for Auth

```python
# Source: https://fastapi.tiangolo.com/tutorial/dependencies/
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    user = verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user
```

### Slowapi Rate Limiting

```python
# Source: https://slowapi.readthedocs.io/
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

@app.post("/auth/login")
@limiter.limit("10/minute")
async def login(request: Request):
    # Login logic
    pass
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Session-based auth (server-side sessions) | JWT + httpOnly cookies | 2020-2021 | Stateless, scalable, better for microservices |
| Manual OAuth implementation | Authlib / NextAuth.js | 2019-2020 | Handles OAuth 2.0 spec, provider quirks, security |
| localStorage for tokens | httpOnly cookies | 2018-2019 | Protects against XSS attacks |
| Manual database migrations | Alembic / Prisma | 2015-2018 | Version control for schema, rollback capability |
| Custom rate limiting | slowapi / express-rate-limit | 2019-2020 | Battle-tested, distributed support |
| Manual form validation | Pydantic / Zod | 2020-2022 | Type-safe, automatic validation, better DX |

**Deprecated/outdated:**
- **passlib with SHA256:** Use bcrypt or argon2 for password hashing (even if not used in Phase 1, for future reference)
- **JWT in localStorage:** Security vulnerability; use httpOnly cookies
- **Manual SQL migrations:** Prone to errors; use Alembic or similar
- **Custom OAuth implementation:** Complex and error-prone; use Authlib
- **CORS with wildcard origins and credentials:** Not allowed by browsers; use specific origins

## Open Questions

None — all decisions have been locked in CONTEXT.md and research has validated the approach.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Docker | Containerization (all services) | ✓ | 29.1.3 | — |
| Docker Compose | Local development orchestration | ✓ | v5.0.0 | — |
| Node.js | Frontend (Next.js) | ✓ | v25.6.1 | — |
| Python 3 | Backend (FastAPI) | ✓ | 3.9.6 | — |
| PostgreSQL | Database (relational data) | ✗ | — | Use Docker Compose service |
| Redis | Cache & session store | ✗ | — | Use Docker Compose service |

**Missing dependencies with no fallback:** None — PostgreSQL and Redis will be provided by Docker Compose services.

**Missing dependencies with fallback:** None — all required tools are available or provided by Docker Compose.

**Notes:**
- Docker and Docker Compose are available and will spin up PostgreSQL and Redis containers
- Node.js v25.6.1 is available for frontend development
- Python 3.9.6 is available for backend development
- All runtime dependencies will be containerized via Docker Compose

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | pytest 9.0.2 (backend), Vitest 4.1.2 (frontend) |
| Config file | pytest.ini (backend), vitest.config.ts (frontend) - Wave 0 |
| Quick run command | Backend: `pytest tests/unit/ -x --tb=short`<br>Frontend: `npm run test:unit` |
| Full suite command | Backend: `pytest tests/ -v`<br>Frontend: `npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | User can sign up via Google OAuth | integration | `pytest tests/integration/test_auth.py::test_google_oauth_signup -x` | ❌ Wave 0 |
| AUTH-02 | User can sign up via Facebook OAuth | integration | `pytest tests/integration/test_auth.py::test_facebook_oauth_signup -x` | ❌ Wave 0 |
| AUTH-03 | User session persists across browser refresh | integration | `pytest tests/integration/test_auth.py::test_session_persistence -x` | ❌ Wave 0 |
| AUTH-04 | Passive users can view notebooks without authentication | integration | `pytest tests/integration/test_auth.py::test_public_access -x` | ❌ Wave 0 |
| AUTH-05 | Authentication required for interactive actions | integration | `pytest tests/integration/test_auth.py::test_protected_routes -x` | ❌ Wave 0 |
| PROF-01 | User profile displays username and avatar | unit | `pytest tests/unit/test_profiles.py::test_profile_display -x` | ❌ Wave 0 |
| PROF-02 | User profile displays bio | unit | `pytest tests/unit/test_profiles.py::test_profile_bio -x` | ❌ Wave 0 |
| PROF-03 | User profile shows count of published notebooks | unit | `pytest tests/unit/test_profiles.py::test_published_notebook_count -x` | ❌ Wave 0 |
| PROF-04 | User profile shows count of likes received | unit | `pytest tests/unit/test_profiles.py::test_likes_received_count -x` | ❌ Wave 0 |
| PROF-05 | User can edit their own profile | integration | `pytest tests/integration/test_profiles.py::test_edit_profile -x` | ❌ Wave 0 |
| PROF-06 | User profile lists user's published notebooks | integration | `pytest tests/integration/test_profiles.py::test_user_notebooks_list -x` | ❌ Wave 0 |
| INFRA-01 | Frontend and backend in separate folders | manual | N/A (architecture check) | — |
| INFRA-02 | Application runs in Docker Compose locally | manual | N/A (manual verification) | — |
| INFRA-04 | PostgreSQL stores relational data | unit | `pytest tests/unit/test_db.py::test_database_connection -x` | ❌ Wave 0 |
| INFRA-05 | Redis handles caching and job queues | unit | `pytest tests/unit/test_redis.py::test_redis_connection -x` | ❌ Wave 0 |
| SEC-04 | API endpoints have rate limiting | integration | `pytest tests/integration/test_security.py::test_rate_limiting -x` | ❌ Wave 0 |
| SEC-05 | User inputs are validated and sanitized | unit | `pytest tests/unit/test_validation.py::test_input_validation -x` | ❌ Wave 0 |
| SEC-06 | OAuth tokens are securely stored | integration | `pytest tests/integration/test_auth.py::test_token_storage_security -x` | ❌ Wave 0 |
| PERF-05 | Database queries are indexed | manual | N/A (migration review) | — |

### Sampling Rate

- **Per task commit:** Backend: `pytest tests/unit/ -x --tb=short` (< 30 seconds)<br>Frontend: `npm run test:unit` (< 30 seconds)
- **Per wave merge:** Backend: `pytest tests/ -v`<br>Frontend: `npm run test`
- **Phase gate:** Full suite green (both backend and frontend) before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `backend/pytest.ini` — pytest configuration
- [ ] `backend/tests/conftest.py` — shared fixtures (database, test client, Redis)
- [ ] `backend/tests/unit/test_auth.py` — auth service unit tests
- [ ] `backend/tests/unit/test_profiles.py` — profile service unit tests
- [ ] `backend/tests/unit/test_validation.py` — input validation tests
- [ ] `backend/tests/integration/test_auth.py` — auth integration tests
- [ ] `backend/tests/integration/test_profiles.py` — profile integration tests
- [ ] `backend/tests/integration/test_security.py` — rate limiting and security tests
- [ ] `frontend/vitest.config.ts` — Vitest configuration
- [ ] `frontend/tests/unit/auth/` — auth component tests
- [ ] `frontend/tests/unit/profile/` — profile component tests
- [ ] Framework install: Backend: `pip install pytest pytest-asyncio httpx` — Frontend: `npm install vitest @testing-library/react @testing-library/jest-dom @vitest/ui`

## Sources

### Primary (HIGH confidence)
- **Next.js Documentation** — Server Components, API routes, project structure (verified via npm)
- **FastAPI Documentation** — OAuth integration, security, dependency injection (verified via PyPI)
- **Authlib Documentation** — Starlette OAuth client integration (verified via PyPI v1.6.9)
- **python-jose Documentation** — JWT token creation and verification (verified via PyPI v3.5.0)
- **SQLAlchemy 2.0 Documentation** — Async sessions, ORM patterns (verified via PyPI v2.0.48)
- **Alembic Documentation** — Migration workflow and best practices (verified via PyPI v1.18.4)
- **PostgreSQL Documentation** — User schema design, indexing, performance (verified v17+)
- **Redis Documentation** — Caching patterns, session storage (verified v7.4.0)
- **Pydantic Documentation** — Request/response validation, type coercion (verified v2.12.5)
- **slowapi Documentation** — Rate limiting middleware for FastAPI (verified v0.1.9)
- **Docker Documentation** — Compose file structure, service orchestration (verified v29.1.3)
- **Vitest Documentation** — Frontend test runner configuration (verified v4.1.2)
- **@testing-library/react Documentation** — React component testing patterns (verified v16.3.2)

### Secondary (MEDIUM confidence)
- **Project STACK.md** — Recommended technology stack with specific versions
- **Project ARCHITECTURE.md** — System architecture and component boundaries
- **Project PITFALLS.md** — Critical security and implementation pitfalls
- **Project FEATURES.md** — Feature landscape and authentication patterns
- OAuth 2.0 Specification (RFC 6749) — Authorization flows and token management
- JWT Best Practices (RFC 7519) — Token storage, validation, and security

### Tertiary (LOW confidence)
- Web search results (rate-limited during research) — Some 2026-specific best practices may have evolved, but core patterns are stable

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified against npm and PyPI registries on 2026-04-02
- Architecture: HIGH - Based on established patterns from official documentation and project-specific research (ARCHITECTURE.md, STACK.md)
- Pitfalls: HIGH - Based on well-documented security and implementation patterns from PITFALLS.md and OAuth/JWT best practices

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days for stable stack, validate FastAPI/authlib patterns before major version changes)
