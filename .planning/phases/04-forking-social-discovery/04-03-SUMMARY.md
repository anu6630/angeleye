---
phase: 04-forking-social-discovery
plan: 03
title: "Forking System API"
subsystem: "Backend API"
tags: ["forking", "api", "attribution"]
completed_date: "2026-04-05"
duration_seconds: 90
dependency_graph:
  requires:
    - "04-01 (Database Models for Forking and Follow System)"
  provides:
    - "04-04 (Fork UI Components)"
  affects:
    - "NotebookService.delete_notebook (adds fork check)"
    - "StorageService (adds copy_object)"
tech_stack:
  added:
    - "ForkService: Notebook and dataset forking business logic"
  patterns:
    - "Service layer for business logic separation"
    - "S3 server-side copy for efficient dataset duplication"
    - "Parent/root lineage tracking for fork attribution"
key_files:
  created:
    - path: "backend/app/services/fork_service.py"
      description: "ForkService with fork_notebook, fork_dataset, get_fork_chain, get_forks, has_forks, can_delete_notebook methods"
    - path: "backend/app/api/v1/notebooks/router.py"
      description: "Added POST /fork, GET /forks, GET /chain endpoints"
  modified:
    - path: "backend/app/services/storage_service.py"
      description: "Added copy_object method for S3 server-side copy"
    - path: "backend/app/services/notebook_service.py"
      description: "Added fork count check to delete_notebook method"
decisions:
  - title: "S3 Server-Side Copy for Dataset Forking"
    rationale: "Efficient duplication without download/upload round-trip. Reduces latency and bandwidth."
    impact: "Dataset forks are created instantly at S3 level. Requires bucket existence check."
  - title: "Explicit Fork Count Check in Delete"
    rationale: "Application-level validation provides clearer error messages than FK constraints alone."
    impact: "Users get helpful 'Use archive instead' message when attempting to delete notebooks with forks."
  - title: "Public Fork Chain Viewing"
    rationale: "Attribution transparency is core to remix culture. Viewing should not require authentication."
    impact: "GET /forks and GET /chain endpoints are public per AUTH-04 policy."
metrics:
  duration: "90 seconds"
  tasks_completed: 2
  files_created: 1
  files_modified: 3
  commits: 2
  lines_added: 428
  lines_removed: 4
---

# Phase 04-03: Forking System API Summary

## One-Liner

Implemented notebook and dataset forking API with full attribution tracking (parent_id/root_id lineage), S3 server-side copy for efficient dataset duplication, fork chain traversal endpoints, and delete protection for notebooks with existing forks.

## What Was Built

### Core Forking Logic

**ForkService** (`backend/app/services/fork_service.py`):
- `fork_notebook(notebook_id, user_id)`: Creates independent notebook copy with all cells, sets parent_id to immediate parent and root_id to ultimate original
- `fork_dataset(dataset_id, user_id)`: Creates independent dataset copy via S3 server-side copy (not download/upload)
- `get_fork_chain(notebook_id)`: Returns ordered list from original to current notebook
- `get_forks(notebook_id, limit)`: Lists all forks of a notebook (newest first)
- `has_forks(notebook_id)`: Checks if notebook has any forks
- `can_delete_notebook(notebook_id)`: Returns True if no forks exist

### API Endpoints

**POST /api/v1/notebooks/{id}/fork** (authenticated):
- Creates fork of specified notebook
- Copies all cells with correct lineage
- Forks dataset if original has one
- Returns 201 Created with forked NotebookResponse

**GET /api/v1/notebooks/{id}/forks** (public):
- Lists all forks of a notebook
- Query param: limit (default 50, max 100)
- Returns forks ordered by created_at DESC

**GET /api/v1/notebooks/{id}/chain** (public):
- Returns full attribution chain from original to current
- Ordered from root (original) to current notebook

### Storage Enhancement

**StorageService.copy_object(source_key, dest_key, bucket)**:
- S3 server-side copy operation
- Used by ForkService for dataset forking
- Avoids download/upload round-trip for efficiency

### Delete Protection

**NotebookService.delete_notebook** updated:
- Checks for existing forks before deletion
- Raises ValueError with helpful message: "Cannot delete notebook with forks. Use archive instead."
- Per FORK-04: Prevents hard delete when forks exist

## Deviations from Plan

**None** - plan executed exactly as written.

## Technical Implementation Details

### Fork Lineage Tracking

```python
# Fork creation logic
parent_id = notebook_id  # Immediate parent
root_id = original.root_id if original.root_id else notebook_id  # Ultimate original
```

This hybrid approach (parent_id + root_id) enables:
- Efficient immediate fork queries (WHERE parent_id = ?)
- Root discovery without traversing entire chain
- Chain reconstruction via parent_id hops

### Dataset Forking via S3 Copy

```python
# Server-side copy (no data transfer through app)
storage_service.copy_object(
    source_key=original.s3_key,
    dest_key=f"datasets/{user_id}/{user_id}_{timestamp}_{original.original_filename}",
    bucket="notebooksocial"
)
```

Benefits:
- Instant copy at S3 level
- No bandwidth usage
- No local disk I/O
- Works with both MinIO (dev) and S3 (prod)

### Delete Protection Flow

```python
# Check for forks before deletion
fork_count = db.query(func.count(Notebook.id))\
    .filter(Notebook.parent_id == notebook_id)\
    .scalar()

if fork_count and fork_count > 0:
    raise ValueError("Cannot delete notebook with forks. Use archive instead.")
```

Application-level check provides clearer UX than raw FK constraint errors.

## API Usage Examples

### Fork a Notebook

```bash
# Authenticate first, then:
curl -X POST "http://localhost:8000/api/v1/notebooks/42/fork" \
  -H "Authorization: Bearer $TOKEN"

# Response: 201 Created
{
  "id": 143,
  "title": "Data Analysis (fork)",
  "user_id": 7,
  "is_published": false,
  "parent_id": 42,
  "root_id": 15,
  "cells": [...],
  ...
}
```

### List Forks

```bash
curl "http://localhost:8000/api/v1/notebooks/42/forks?limit=20"

# Response: 200 OK
{
  "forks": [
    {"id": 143, "title": "Data Analysis (fork)", ...},
    {"id": 128, "title": "Data Analysis (fork)", ...}
  ],
  "total": 2
}
```

### View Attribution Chain

```bash
curl "http://localhost:8000/api/v1/notebooks/143/chain"

# Response: 200 OK
{
  "chain": [
    {"id": 15, "title": "Original Analysis", ...},      # Root
    {"id": 42, "title": "Data Analysis", ...},          # Parent
    {"id": 143, "title": "Data Analysis (fork)", ...}   # Current
  ],
  "total": 3
}
```

## Requirements Satisfied

- **FORK-01**: Fork creates independent copy with full attribution tracking (parent_id, root_id)
- **FORK-02**: Dataset forking via S3 server-side copy with same lineage structure
- **FORK-03**: Forks have equal weightage (no depth penalty enforced)
- **FORK-04**: Delete protection for notebooks with forks
- **FORK-05**: Fork chain traversal via parent/root relationships

## Integration Points

**Connects To:**
- `backend/app/models/notebook.py` (parent_id/root_id fields)
- `backend/app/models/dataset.py` (parent_id/root_id fields)
- `backend/app/services/storage_service.py` (copy_object)
- `backend/app/services/notebook_service.py` (delete protection)

**Used By:**
- Future fork UI components (Plan 04-04)
- Notebook detail page (show fork button)
- User profile page (show fork count)

## Known Limitations

1. **Hardcoded bucket name**: Currently uses "notebooksocial" - should come from settings in production
2. **No batch fork operations**: Only single notebook forking supported in v1
3. **No fork notifications**: Users are not notified when their notebook is forked (future feature)

## Self-Check: PASSED

**Files Created:**
- [x] backend/app/services/fork_service.py (247 lines)

**Files Modified:**
- [x] backend/app/services/storage_service.py (added copy_object)
- [x] backend/app/services/notebook_service.py (added fork check)
- [x] backend/app/api/v1/notebooks/router.py (added 3 endpoints)

**Commits Verified:**
- [x] d450d04: feat(04-03): create ForkService with notebook and dataset forking
- [x] 0ec00b4: feat(04-03): add fork API endpoints and delete protection

**Acceptance Criteria Met:**
- [x] ForkService exists with all 6 required methods
- [x] fork_notebook sets correct parent_id and root_id
- [x] fork_dataset uses S3 copy_object
- [x] StorageService has copy_object method
- [x] notebook_service has fork check in delete
- [x] 3 new API endpoints registered

## Next Steps

Phase 04 Plan 04 will add fork UI components:
- Fork button on notebook detail pages
- Fork count badges on notebook cards
- Fork chain visualization on notebook pages
- "Forked from" attribution display
