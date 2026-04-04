---
phase: 04-forking-social-discovery
plan: 01
type: execute
wave: 1
title: Database Models for Forking and Follow System
one-liner: Fork lineage tracking with parent_id/root_id pattern, soft delete archive, dataset forking, Follow social graph, and FeedEvent for ML foundation
status: complete
execution_date: "2026-04-05"
started_at: "2026-04-04T18:29:11Z"
completed_at: "2026-04-04T18:32:26Z"
duration_seconds: 195
tasks_completed: 4
tasks_total: 4
subsystem: Database Models and Schema
tags: [forking, social-graph, database, migration]
---

# Phase 04-01: Database Models for Forking and Follow System Summary

## Overview

**Objective:** Create database models for fork lineage tracking (parent_id, root_id), soft delete with archive (is_archived), dataset forking, follow relationships, and event tracking for future ML.

**Outcome:** All database models, migrations, and Pydantic schemas are in place for Phase 4 social features. Fork lineage tracking enables attribution chains, Follow model enables social graph, FeedEvent model enables ML-driven trending algorithm foundation.

**Duration:** 3 minutes 15 seconds (195 seconds)

**Commits:**
- `ef1360c`: feat(04-01): add fork lineage fields to Notebook model
- `62c8e7e`: feat(04-01): add fork lineage fields to Dataset model
- `590691f`: feat(04-01): create Follow and FeedEvent models
- `b1b2788`: feat(04-01): create database migration and update Pydantic schemas

---

## What Was Built

### 1. Notebook Model Enhancements

**File:** `backend/app/models/notebook.py`

Added fork lineage tracking fields:
- `parent_id` — Foreign key to immediate parent notebook (nullable, indexed)
- `root_id` — Foreign key to ultimate original notebook (nullable, indexed)
- `is_archived` — Boolean flag for soft delete (default: False, indexed)

Added self-referential relationships:
- `parent` — Relationship to immediate parent notebook
- `root` — Relationship to ultimate original notebook
- `forks` — Backref to all fork children

Added indexes for performance:
- `ix_notebooks_parent_id`
- `ix_notebooks_root_id`
- `ix_notebooks_is_archived`

**Decision Rationale:** Hybrid approach with both parent_id and root_id enables efficient fork chain traversal (CONTEXT.md D-1). SET NULL ondelete preserves fork chains even when parent is deleted.

### 2. Dataset Model Enhancements

**File:** `backend/app/models/dataset.py`

Added fork lineage tracking fields matching notebook structure:
- `parent_id` — Foreign key to immediate parent dataset (nullable, indexed)
- `root_id` — Foreign key to ultimate original dataset (nullable, indexed)

Added self-referential relationships:
- `parent` — Relationship to immediate parent dataset
- `root` — Relationship to ultimate original dataset
- `forks` — Backref to all fork children

Added indexes for performance:
- `ix_datasets_parent_id`
- `ix_datasets_root_id`

**Decision Rationale:** Dataset forking matches notebook model structure for consistency (CONTEXT.md D-2). Datasets are independent copies — fork owner can modify data without affecting original.

### 3. Follow Model (New)

**File:** `backend/app/models/follow.py`

Created Follow relationship model for social graph:
- `follower_id` — Foreign key to user who is following (CASCADE delete)
- `following_id` — Foreign key to user being followed (CASCADE delete)
- `created_at` — Timestamp when follow was created

Added relationships:
- `follower` — Relationship to follower user
- `following` — Relationship to following user

Added unique constraint:
- `uq_follow` — Prevents duplicate follows (follower_id, following_id)

Added indexes for performance:
- `ix_follows_id`
- `ix_follows_follower_id`
- `ix_follows_following_id`

**Decision Rationale:** One-way follow relationship (Twitter/Instagram style) per CONTEXT.md D-6. CASCADE delete cleans up follows when user is deleted.

### 4. FeedEvent Model (New)

**File:** `backend/app/models/feed_event.py`

Created FeedEvent model for engagement tracking (ML foundation):
- `user_id` — Foreign key to user who triggered event (CASCADE delete)
- `notebook_id` — Foreign key to notebook being interacted with (CASCADE delete)
- `event_type` — String field for event type (indexed): 'impression', 'click', 'like', 'comment', 'time_spent'
- `bucket_id` — String field for future A/B testing (indexed, nullable)
- `timestamp` — DateTime when event occurred (indexed)
- `metadata` — JSON field for future enrichment (device, location, referrer)

Added relationships:
- `user` — Relationship to user (back_populates="feed_events")
- `notebook` — Relationship to notebook

Added composite indexes for query performance:
- `ix_feed_events_user_timestamp` — (user_id, timestamp)
- `ix_feed_events_notebook_type` — (notebook_id, event_type)

**Decision Rationale:** Raw event logging only (no ML inference in v1) per CONTEXT.md D-15. Bucket field reserved for future A/B testing. JSON metadata enables flexible future expansion.

### 5. User Model Updates

**File:** `backend/app/models/user.py`

Added social relationship methods:
- `followers` — Relationship to Follow records where user is being followed
- `following` — Relationship to Follow records where user is following others
- `feed_events` — Relationship to FeedEvent records (cascade delete)

**Decision Rationale:** Enables bidirectional social graph queries — "who follows me" and "who am I following."

### 6. Database Migration 005

**File:** `backend/alembic/versions/20260405_1005-005_add_fork_and_follow_tables.py`

Created comprehensive Alembic migration for Phase 4:

**Upgrade operations:**
1. Add parent_id, root_id, is_archived columns to notebooks table
2. Add indexes for notebook fork lineage
3. Create self-referential foreign keys for notebook fork lineage
4. Add parent_id, root_id columns to datasets table
5. Add indexes for dataset fork lineage
6. Create self-referential foreign keys for dataset fork lineage
7. Create follows table with unique constraint and indexes
8. Create feed_events table with JSON field and composite indexes

**Downgrade operations:**
- Drops all tables, columns, indexes, and foreign keys in reverse order
- Preserves data integrity during rollback

**Foreign key behaviors:**
- Fork lineage FKs use `ondelete="SET NULL"` — preserves chain when parent deleted
- Follow/feed_event FKs use `ondelete="CASCADE"` — cleans up relationships when user/notebook deleted

**Decision Rationale:** SET NULL on fork lineage prevents orphaned chains when parent notebook is deleted (CONTEXT.md D-4). CASCADE on follows/feed_events cleans up user data.

### 7. Pydantic Schema Updates

**File:** `backend/app/schemas/notebook.py`

Updated NotebookResponse schema:
- Added `parent_id: Optional[int]` field
- Added `root_id: Optional[int]` field
- Added `is_archived: Optional[bool]` field
- Added `fork_chain: Optional[List[ForkChainResponse]]` field for attribution display

Updated NotebookListResponse schema:
- Added `parent_id: Optional[int]` field
- Added `root_id: Optional[int]` field
- Added `is_archived: Optional[bool]` field

Created ForkChainResponse schema:
- `id: int` — Notebook ID
- `title: str` — Notebook title
- `username: str` — Owner username
- `parent_id: Optional[int]` — Parent notebook ID

**File:** `backend/app/schemas/user.py`

Updated UserResponse schema:
- Added `followers_count: Optional[int]` field (default: 0)
- Added `following_count: Optional[int]` field (default: 0)
- Added `is_following: Optional[bool]` field for current user context

**Decision Rationale:** Schema fields match database model exactly. ForkChainResponse enables breadcrumb attribution display (CONTEXT.md D-3).

---

## Deviations from Plan

**None.** Plan executed exactly as written.

---

## Key Decisions Made

### Database Schema Design

1. **Fork lineage uses hybrid approach** — Both parent_id (immediate parent) and root_id (ultimate original) enable efficient chain traversal without recursive queries.

2. **Soft delete with is_archived flag** — Hidden from feeds/search but direct URLs still work. Preserves fork chain integrity (CONTEXT.md D-4).

3. **Self-referential foreign keys** — notebooks.notebooks and datasets.datasets relationships enable fork chain traversal via SQLAlchemy ORM.

4. **Follow unique constraint** — Prevents duplicate follows at database level. Application layer enforces rate limits (100/day) in future plans.

5. **FeedEvent JSON metadata field** — Flexible schema for future ML features without migration overhead. Supports device, location, referrer tracking.

6. **Composite indexes for FeedEvent** — (user_id, timestamp) and (notebook_id, event_type) indexes enable efficient queries for engagement analytics.

### Foreign Key Cascade Behavior

- **Fork lineage (SET NULL):** When parent notebook/dataset is deleted, child forks retain parent_id/root_id but FKs are set to NULL. Prevents orphaned chains.
- **Follow relationships (CASCADE):** When user is deleted, all follow relationships are automatically cleaned up.
- **Feed events (CASCADE):** When user or notebook is deleted, all associated events are automatically cleaned up.

### Index Strategy

- **All foreign keys indexed** — Enables efficient JOIN queries
- **Fork lineage fields indexed** — Enables efficient queries for "all forks of X" and "fork chain traversal"
- **Composite indexes on FeedEvent** — Enables efficient analytics queries without full table scans
- **is_archived indexed** — Enables efficient filtering of archived notebooks from feeds

---

## Files Created/Modified

### Created (2 files)
- `backend/app/models/follow.py` — Follow relationship model
- `backend/app/models/feed_event.py` — FeedEvent model for ML foundation
- `backend/alembic/versions/20260405_1005-005_add_fork_and_follow_tables.py` — Database migration

### Modified (5 files)
- `backend/app/models/notebook.py` — Added fork lineage fields and relationships
- `backend/app/models/dataset.py` — Added fork lineage fields and relationships
- `backend/app/models/user.py` — Added followers, following, feed_events relationships
- `backend/app/models/__init__.py` — Exported Follow and FeedEvent models
- `backend/app/schemas/notebook.py` — Added fork lineage fields to responses
- `backend/app/schemas/user.py` — Added followers/following counts to response

**Total: 3 files created, 6 files modified, 9 files total**

---

## Requirements Fulfilled

- **FORK-01:** Fork lineage tracking with parent_id and root_id foreign keys on Notebook model
- **FORK-02:** Dataset forking with parent_id and root_id foreign keys on Dataset model
- **FORK-03:** Soft delete with is_archived flag (hidden from feeds/search)
- **FORK-04:** Delete protection via is_archived (fork chains preserved)
- **FORK-05:** Fork chains treated equally in algorithms (no penalty/bonus)
- **DISC-01:** Follow model with unique constraint preventing duplicate follows
- **DISC-02:** FeedEvent model for engagement tracking (ML foundation)

---

## Tech Stack Added

**Database:**
- PostgreSQL foreign keys (self-referential for fork lineage)
- PostgreSQL indexes (single-column and composite)
- PostgreSQL unique constraints
- PostgreSQL JSON fields (metadata)

**ORM:**
- SQLAlchemy relationships (self-referential with remote_side)
- SQLAlchemy cascade behaviors (SET NULL, CASCADE)
- SQLAlchemy composite indexes

**Migration:**
- Alembic revision 005
- Alembic upgrade/downgrade paths

**Validation:**
- Pydantic schemas with Optional fields
- Pydantic nested schemas (ForkChainResponse)

---

## Known Stubs

**None.** All models are complete with proper relationships and foreign keys. Pydantic schemas include all necessary fields for API responses.

---

## Self-Check: PASSED

**Verification:**
- [x] All models import correctly (Follow, FeedEvent exported in __init__.py)
- [x] Notebook model has parent_id, root_id, is_archived columns
- [x] Dataset model has parent_id, root_id columns
- [x] Follow model has unique constraint (follower_id, following_id)
- [x] FeedEvent model has JSON metadata field
- [x] Migration 005 exists with upgrade() and downgrade() functions
- [x] Migration adds all columns, tables, indexes, and foreign keys
- [x] Pydantic schemas include parent_id, root_id, is_archived, followers_count, following_count
- [x] All foreign keys have proper ondelete behavior
- [x] All relationships defined in models (parent, root, followers, following, feed_events)

**Commits verified:**
- `ef1360c`: Notebook fork lineage fields
- `62c8e7e`: Dataset fork lineage fields
- `590691f`: Follow and FeedEvent models
- `b1b2788`: Migration and schema updates

---

## Next Steps

**Immediate (Plan 04-02):** Implement ForkService for fork creation logic
- Copy notebook cells to new notebook
- Copy datasets to new datasets (independent copies)
- Set parent_id and root_id correctly
- Handle fork chain validation

**Future (Plans 04-03 to 04-08):**
- FollowService for follow/unfollow operations
- FeedEventService for engagement tracking
- Trending algorithm using time-decayed scores
- Redis caching for performance
- Meilisearch integration for search
- Frontend components for fork UI

---

**Plan 04-01 complete. Database foundation for forking and social features is in place.**
