---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 3
status: planning
last_updated: "2026-04-03T20:43:54.893Z"
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 17
  completed_plans: 17
  percent: 100
---

# Project State: NotebookSocial

**Last Updated:** 2026-04-04
**Current Phase:** 3
**Current Focus:** Phase 02 — Core Notebook Experience

## Project Reference

### Core Value

Interactive + social — make computational knowledge shareable and remixable, with forking as a first-class social action.

### What This Is

A social media platform where Python notebooks are the content. Users create notebooks using a WASM-powered editor (Pyodide), compile them in isolated containers, and publish pre-rendered outputs to an Instagram-style social feed. Viewers can browse notebook listings, click to see full rendered notebooks with charts and videos, and fork notebooks to create their own versions. Forks have equal weightage in the feed, making remixing a core social action.

### Key Constraints

- **Timeline:** 3+ months thorough development to launch-ready
- **Architecture:** API-first design (separate frontend/backend folders) for future mobile app compatibility
- **Deployment:** Local Docker Compose for development, target AWS for production
- **Testing:** Comprehensive test coverage required (unit, integration, E2E)
- **Auth:** OAuth only for interactive actions (Google, Facebook), viewing is open
- **Execution modes:** Both WASM (offline editing) AND online container compilation must be implemented

## Current Position

Phase: 02 (Core Notebook Experience) — EXECUTING
Plan: 8 of 8 completed

### Phase Status

**Phase:** 2 - Core Notebook Experience
**Plan:** Not started
**Status:** Ready to plan
**Progress:** [██████████] 100%

### Progress Bar

```
Phase 1: [██████████] 100%
Phase 2: [███████░░░] 75%
Phase 3: [░░░░░░░░░] 0%
Phase 4: [░░░░░░░░░] 0%
Phase 5: [░░░░░░░░░] 0%
Phase 6: [░░░░░░░░░] 0%
Overall: [███████░░░░] 29.2%
```

### Current Focus

Completed Plan 06: Notebook Viewer and My Notebooks pages. Next: Plan 07 (Comment interactions).

## Performance Metrics

### Requirements Coverage

- **Total v1 requirements:** 64
- **Mapped to phases:** 64 (100%)
- **Completed:** 19 (30%)

### Phase Progress

- **Phases defined:** 6
- **Phases completed:** 1 (16.7%)
- **Plans created:** 17 (8 in Phase 2)
- **Plans executed:** 9 (Phase 1)

## Accumulated Context

### Key Decisions Made

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FastAPI (Python) backend | Same language as notebook processing → smoother integration with Jupyter, ML ecosystem, and container management. Async native for concurrent notebook execution. | — Pending implementation |
| Next.js over React | Same React benefits + SSR/SEO, API routes, better performance for social feeds | — Pending implementation |
| PostgreSQL database | Robust relational data for social features (users, posts, likes, comments, forks) | — Pending implementation |
| MinIO for datasets | S3-compatible, runs locally in Docker, easy to migrate to AWS S3 | — Pending implementation |
| CDN for notebook outputs | Pre-rendered charts/images/videos must load fast for Instagram-like feed experience | — Pending implementation |
| Redis for cache/queue | Feed caching + job queues for async notebook compilation | — Pending implementation |
| Forks have equal feed weightage | Encourages remixing and derivative work as core social behavior | — Pending implementation |
| Auth required only for interactive actions | Lowers friction for discovery, maintains control for creation/engagement | — Pending implementation |
| Tailwind CSS 4.2.2 | Latest version with JIT mode, small bundle size, excellent responsive design support | Implemented in frontend/tailwind.config.ts |
| Path aliases (@/components, @/lib, @/app, @/stores) | Cleaner imports, better DX, matches shadcn/ui conventions | Implemented in frontend/tsconfig.json |
| CSS custom properties for theming | Enables dark mode and consistent theming across components | Implemented in frontend/app/globals.css |
| Strict TypeScript mode | Catch errors at compile time, better type safety | Implemented in frontend/tsconfig.json |
| Pyodide 0.26.3 for WASM Python execution | Full Python 3.11 support in browser, compatible with numpy/pandas/matplotlib | Planned for Phase 2 |
| Monaco Editor for code editing | VS Code editor component with syntax highlighting and autocomplete | Planned for Phase 2 |
| Zustand for state management | Lightweight (1kb), no boilerplate, perfect for component-level state | Planned for Phase 2 |
| Recursive CTEs for threaded comments | SQL-standard, simpler than materialized path for depth < 3 | Planned for Phase 2 |
| Cursor-based pagination for feed | Better performance than offset-based, prevents duplicates on scroll | Planned for Phase 2 |
| Cascade delete on notebook deletion | Removes all cells, likes, and comments automatically | Implemented in backend/app/models/notebook.py |
| Unique constraint on likes | Prevents duplicate likes at database level (user_id, notebook_id) | Implemented in backend/app/models/like.py |
| Parent_id foreign key for comments | Enables threaded replies with self-referential relationship | Implemented in backend/app/models/comment.py |
| Depth limit enforcement (max 3) | Enforced in service layer, not database constraint | Planned for API implementation |
| Phase 02-core-notebook-experience P01 | 12min | 3 tasks | 11 files | Implemented in Plan 02-01 |
| Phase 02-core-notebook-experience P03 | 394 | 3 tasks | 5 files |
| Phase 02-core-notebook-experience P02-02 | 1775247479 | 3 tasks | 11 files |
| Phase 02-core-notebook-experience P02-02 | 300 | 3 tasks | 11 files |
| Phase 02 P05 | 158 | 3 tasks | 5 files |
| Phase 02-core-notebook-experience P04 | 1775248100 | 3 tasks | 8 files |
| Phase 02-core-notebook-experience P07 | 4 minutes | 3 tasks | 6 files |
| Phase 02-core-notebook-experience P08 | 15 | 3 tasks | 11 files |

### Technical Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
**Backend:** FastAPI 0.135.3, Uvicorn, SQLAlchemy 2.0, python-jose
**Database:** PostgreSQL 17+
**Cache/Queue:** Redis 7.4.0, Celery
**Storage:** MinIO (local), AWS S3 (production), CloudFront CDN
**Execution:** Pyodide 0.26.3 (WASM), Docker containers
**Testing:** pytest, Vitest, Playwright, GitHub Actions

### Critical Implementation Notes

**Container Security:**

- Never use --privileged mode
- Implement seccomp/AppArmor profiles
- Use read-only filesystems, non-root users
- Network isolation and strict resource limits

**Fork Attribution:**

- Store full ancestry tree for every notebook
- Implement immutable attribution metadata
- Prevent deletion of notebooks with forks
- Show fork lineage in UI

**CDN Strategy:**

- Use versioned URLs for outputs
- Implement immediate purging on updates/deletions
- Different cache policies for public vs private content
- Short TTLs for mutable content

**Dataset Privacy:**

- Generate cryptographically secure URLs
- Implement signed URLs with expiration
- Encrypt data at rest
- Isolate datasets per user
- Never log dataset URLs

### Known Blockers

None at this time.

### Technical Debt

None yet - project is in initialization phase.

## Session Continuity

### Last Action

Completed Plan 02-06: Created NotebookCellViewer and NotebookViewer components (read-only, no code execution), notebook viewer page, and My Notebooks page with edit/delete functionality.

### Next Action

Execute Plan 02-07: Comment interactions (create, reply, nested threading).

### Context Handoff

**Resume file:** None

This state document should be referenced when:

- Starting a new planning session
- Transitioning between phases
- Resuming work after interruption
- Reviewing project progress and decisions

### Important Reminders

- Forks have equal weightage in feed (key differentiator)
- WASM editing + container compilation hybrid approach
- API-first architecture for future mobile app
- Passive viewing without authentication
- Pre-rendered outputs served via CDN (not browser execution)
- Security-first approach to container execution
- Pyodide pre-loading for < 5s editor load time (PERF-03)
- Recursive CTEs for comment threading (max depth 3)
- Cursor-based pagination for feed infinite scroll
- Optimistic updates for like/comment interactions

---

*State updated: 2026-04-04*
