---
phase: 01-foundation-authentication
plan: 02
type: execute
wave: 1
depends_on: []
subsystem: database
tags: [database, migrations, sql, alembic, users, profiles]
dependency_graph:
  requires:
    - plan: "01-01"
      reason: "Project scaffolding and Docker infrastructure must exist before creating database schema"
  provides:
    - plan: "01-03"
      resource: "User and Profile models"
      reason: "Security infrastructure needs user models for auth operations"
    - plan: "01-04"
      resource: "Database session and models"
      reason: "OAuth endpoints need to store user data and OAuth IDs"
    - plan: "01-05"
      resource: "Profile model"
      reason: "Profile management endpoints need Profile model"
  affects:
    - resource: "PostgreSQL database schema"
      reason: "Initial tables and indexes will be created"
tech_stack:
  added:
    - name: "SQLAlchemy"
      version: "2.0.48"
      reason: "ORM for database models and relationships"
    - name: "Alembic"
      version: "1.18.4"
      reason: "Database migration management"
  patterns:
    - "Declarative base pattern for SQLAlchemy models"
    - "Dependency injection pattern for database sessions"
    - "Migration-first approach for schema changes"
key_files:
  created:
    - "backend/app/__init__.py"
    - "backend/app/db/__init__.py"
    - "backend/app/db/base.py"
    - "backend/app/db/session.py"
    - "backend/app/models/__init__.py"
    - "backend/app/models/user.py"
    - "backend/app/models/profile.py"
    - "backend/alembic.ini"
    - "backend/alembic/__init__.py"
    - "backend/alembic/env.py"
    - "backend/alembic/script.py.mako"
    - "backend/alembic/versions/20260403_0400-001_initial_schema.py"
  modified: []
decisions:
  - id: "DB-001"
    summary: "Synchronous SQLAlchemy for MVP"
    rationale: "Using synchronous SQLAlchemy for initial development. Async support can be added in future phases as needed. This simplifies initial setup and follows the principle of 'simple first, optimize later'."
    outcome: "Base and session configured synchronously with create_engine and sessionmaker"
  - id: "DB-002"
    summary: "Case-insensitive indexes for email and username"
    rationale: "Users should be able to sign in with 'User@Example.COM' regardless of case. PostgreSQL functional indexes on LOWER() ensure case-insensitive uniqueness lookups."
    outcome: "Indexes 'ix_users_email_lower' and 'ix_users_username_lower' created"
  - id: "DB-003"
    summary: "Cascade delete for profiles"
    rationale: "When a user is deleted, their profile should be automatically deleted. Using cascade="all, delete-orphan" ensures data consistency."
    outcome: "ForeignKey with ondelete='CASCADE' and cascade on relationship"
metrics:
  duration_seconds: 392
  completed_date: "2026-04-03T04:06:37Z"
  files_created: 12
  lines_added: 357
---

# Phase 01 Plan 02: Database Schema and Migrations Summary

**One-liner:** SQLAlchemy User and Profile models with OAuth fields, proper indexing, and Alembic migration infrastructure for PostgreSQL.

## Objective

Create the database schema and migration infrastructure for users and profiles to establish the data foundation for all authentication and profile features.

## What Was Built

### Database Infrastructure
- **SQLAlchemy declarative base** (`backend/app/db/base.py`) - Base class for all ORM models
- **Database session configuration** (`backend/app/db/session.py`) - Engine and session factory with dependency injection support
- **Environment-based DATABASE_URL** - Supports development and production configurations via environment variables

### Data Models
- **User model** (`backend/app/models/user.py`):
  - Core fields: id, email, username, is_active, is_verified, created_at, updated_at
  - OAuth fields: google_oauth_id, facebook_oauth_id (both unique and indexed)
  - Relationship to Profile with cascade delete
  - Performance indexes: email, username, OAuth IDs, case-insensitive email/username

- **Profile model** (`backend/app/models/profile.py`):
  - Fields: id, user_id (FK to users), bio, avatar_url, created_at, updated_at
  - Relationship back to User
  - Unique constraint on user_id for one-to-one relationship
  - Index on user_id for fast lookups

### Migration Infrastructure
- **Alembic configuration** (`backend/alembic.ini`) - Migration settings and file templates
- **Environment configuration** (`backend/alembic/env.py`) - Model imports for autogenerate, DATABASE_URL override
- **Migration template** (`backend/alembic/script.py.mako`) - Standard migration file template
- **Initial migration** (`backend/alembic/versions/20260403_0400-001_initial_schema.py`):
  - Creates users table with all fields and constraints
  - Creates profiles table with foreign key and cascade delete
  - Creates 8 indexes for performance (including case-insensitive indexes)
  - Includes downgrade path for rollback

## Technical Implementation Details

### Index Strategy (PERF-05)
Following CONTEXT.md decision D-22, indexes were created on:
- Primary key: `ix_users_id`, `ix_profiles_id`
- Unique lookups: `ix_users_email`, `ix_users_username`
- OAuth lookups: `ix_users_google_oauth_id`, `ix_users_facebook_oauth_id`
- Foreign key: `ix_profiles_user_id`
- Case-insensitive: `ix_users_email_lower`, `ix_users_username_lower` (PostgreSQL functional indexes)

### Relationship Design
- **One-to-one**: User ↔ Profile (cascade delete)
- **Cascade behavior**: When User is deleted, Profile is automatically deleted
- **Foreign key**: `profiles.user_id` references `users.id` with `ON DELETE CASCADE`

### OAuth Fields (D-03, D-04)
- Google OAuth ID stored in `google_oauth_id` (String(255), unique, nullable, indexed)
- Facebook OAuth ID stored in `facebook_oauth_id` (String(255), unique, nullable, indexed)
- Both fields allow NULL to support users who haven't linked that provider

### Profile Fields (D-05, D-06)
- Username: Required field on User model (not Profile)
- Bio: Optional Text field on Profile
- Avatar URL: Optional String(500) field on Profile
- This separation allows username to be immutable/unique while profile fields can change

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all code is functional with no placeholder values or TODOs.

## Next Steps

1. **Plan 01-03**: Security infrastructure (JWT handling, rate limiting, input validation) - will use User model for auth operations
2. **Plan 01-04**: OAuth authentication endpoints - will store OAuth IDs in User model
3. **Plan 01-05**: Profile management endpoints - will use Profile model for CRUD operations

## Verification

To verify the database schema works correctly:

```bash
# Start PostgreSQL
docker compose up -d postgres

# Apply migrations
cd backend
alembic upgrade head

# Verify tables exist
psql -U notebooksocial -d notebooksocial -c "\dt"

# Verify users schema
psql -U notebooksocial -d notebooksocial -c "\d users"

# Verify profiles schema
psql -U notebooksocial -d notebooksocial -c "\d profiles"

# Verify indexes
psql -U notebooksocial -d notebooksocial -c "\di"
```

## Files Created

1. `backend/app/__init__.py` - Package marker
2. `backend/app/db/__init__.py` - Package marker
3. `backend/app/db/base.py` - SQLAlchemy declarative base
4. `backend/app/db/session.py` - Database session configuration
5. `backend/app/models/__init__.py` - Model exports
6. `backend/app/models/user.py` - User SQLAlchemy model
7. `backend/app/models/profile.py` - Profile SQLAlchemy model
8. `backend/alembic.ini` - Alembic configuration
9. `backend/alembic/__init__.py` - Package marker
10. `backend/alembic/env.py` - Alembic environment setup
11. `backend/alembic/script.py.mako` - Migration template
12. `backend/alembic/versions/20260403_0400-001_initial_schema.py` - Initial migration

## Commits

- `e7a0207`: feat(01-02): create SQLAlchemy base and database session
- `69359e9`: feat(01-02): create User and Profile SQLAlchemy models
- `bd39321`: feat(01-02): create Alembic configuration and initial migration

## Self-Check: PASSED

- [x] All files created exist
- [x] All commits exist
- [x] No placeholder values or stubs
- [x] All acceptance criteria met
