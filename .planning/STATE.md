---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 5
status: Ready to start
last_updated: "2026-04-05T00:22:36.595Z"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 45
  completed_plans: 43
  percent: 96
---

# Project State: NotebookSocial

**Last Updated:** 2026-04-04
**Current Phase:** 5
**Current Focus:** Phase 04 — forking-social-discovery (executing plan 07 of 8)

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

Phase: 05 (testing-quality) — EXECUTING
Plan: 1 of 7
Progress: [█████████░] 40 plans created, 40 executed

### Phase Status

**Phase:** 5 - Testing & Quality
**Plan:** 05-01 - Backend unit tests
**Status:** Ready to start
**Status:** Ready to plan
**Progress:** [██████████] 96%

### Progress Bar

```
Phase 1: [██████████] 100%
Phase 2: [██████████] 100%
Phase 3: [██████████] 100%
Phase 4: [█████████░] 87% (7/8 plans)
Phase 5: [░░░░░░░░░░] 0%
Phase 6: [░░░░░░░░░░] 0%
Overall: [██████████░] 97%
```

### Current Focus

Phase 04-07 complete: FeedService with personalized feed algorithm (followed content + trending fallback), Redis feed caching (60s TTL), engagement metrics tracking (likes, comments, views), view counting with Redis increment and batch DB sync via Celery beat (5 min intervals), cache invalidation on publish/update events. DISC-01, DISC-02, DISC-05, PERF-06 satisfied.

## Performance Metrics

### Requirements Coverage

- **Total v1 requirements:** 64
- **Mapped to phases:** 64 (100%)
- **Completed:** 35 (55%)
- **In Progress (Phase 3):** 13 requirements

### Phase Progress

- **Phases defined:** 6
- **Phases completed:** 2 (33.3%)
- **Plans created:** 23 (8 in Phase 1, 8 in Phase 2, 13 in Phase 3)
- **Plans executed:** 20 (Phase 1 + Phase 2 + 3 in Phase 3)

## Accumulated Context

### Key Decisions Made

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FastAPI (Python) backend | Same language as notebook processing → smoother integration with Jupyter, ML ecosystem, and container management. Async native for concurrent notebook execution. | Implemented in Phase 1 |
| Next.js over React | Same React benefits + SSR/SEO, API routes, better performance for social feeds | Implemented in Phase 1 |
| PostgreSQL database | Robust relational data for social features (users, posts, likes, comments) | Implemented in Phase 1 |
| MinIO for datasets | S3-compatible, runs locally in Docker, easy to migrate to AWS S3 | Planned for Phase 3 |
| CDN for notebook outputs | Pre-rendered charts/images/videos must load fast for Instagram-like feed experience | Planned for Phase 3 |
| Redis for cache/queue | Feed caching + job queues for async notebook compilation | Implemented in Phase 1 |
| Forks have equal feed weightage | Encourages remixing and derivative work as core social behavior | Planned for Phase 4 |
| Auth required only for interactive actions | Lowers friction for discovery, maintains control for creation/engagement | Implemented in Phase 1 |
| Tailwind CSS 4.2.2 | Latest version with JIT mode, small bundle size, excellent responsive design support | Implemented in Phase 1 |
| Path aliases (@/components, @/lib, @/app, @/stores) | Cleaner imports, better DX, matches shadcn/ui conventions | Implemented in Phase 1 |
| CSS custom properties for theming | Enables dark mode and consistent theming across components | Implemented in Phase 1 |
| Strict TypeScript mode | Catch errors at compile time, better type safety | Implemented in Phase 1 |
| Pyodide 0.26.3 for WASM Python execution | Full Python 3.11 support in browser, compatible with numpy/pandas/matplotlib | Implemented in Phase 2 |
| Monaco Editor for code editing | VS Code editor component with syntax highlighting and autocomplete | Implemented in Phase 2 |
| Zustand for state management | Lightweight (1kb), no boilerplate, perfect for component-level state | Implemented in Phase 2 |
| Recursive CTEs for threaded comments | SQL-standard, simpler than materialized path for depth < 3 | Implemented in Phase 2 |
| Cursor-based pagination for feed | Better performance than offset-based, prevents duplicates on scroll | Implemented in Phase 2 |
| Cascade delete on notebook deletion | Removes all cells, likes, and comments automatically | Implemented in Phase 2 |
| Unique constraint on likes | Prevents duplicate likes at database level (user_id, notebook_id) | Implemented in Phase 2 |
| Parent_id foreign key for comments | Enables threaded replies with self-referential relationship | Implemented in Phase 2 |
| Depth limit enforcement (max 3) | Enforced in service layer, not database constraint | Implemented in Phase 2 |
| Docker SDK 7.1.0 for container execution | Official SDK for programmatic Docker control with resource limits | Planned for Phase 3 |
| nbconvert 7.17.0 for HTML rendering | Jupyter official converter for notebook to HTML | Planned for Phase 3 |
| Celery 5.6.3 for async compilation | Python standard for background jobs with Redis broker | Planned for Phase 3 |
| boto3 1.42.83 for S3/CloudFront operations | Official AWS SDK for storage and CDN | Planned for Phase 3 |
| Container resource limits (SEC-01, INFRA-07) | 1GB memory, 50% CPU, network isolation, non-root user | Implemented in Phase 3 |
| ContainerExecutor with Docker SDK | Secure container execution with nbconvert and security constraints | Implemented in Phase 3 |
| CompilationService orchestration | Coordinates ContainerExecutor + StorageService for full workflow | Implemented in Phase 3 |
| Presigned URLs for dataset access (STOR-02, SEC-03) | 5-minute expiration for secure downloads | Implemented in Phase 3 |
| Server-side encryption (SEC-07) | AES-256 for data at rest in S3/MinIO | Implemented in Phase 3 |
| StorageService abstraction layer | Centralizes S3/MinIO operations, supports dev/prod switching | Implemented in Phase 3 |
| Dataset model with S3 metadata | Stores file metadata with unique s3_key and row_count | Implemented in Phase 3 |
| Phase 03 P01A | 83 | 3 tasks | 3 files |
| Phase 03-execution-publishing P03-02A | 2 minutes | 2 tasks | 5 files |
| Phase 03-execution-publishing P03-00 | 125 | 3 tasks | 13 files |
| Phase 03 P02B | 60 | 1 tasks | 1 files |
| Phase 03 P03A | 2 minutes | 1 tasks | 2 files |
| Phase 03-execution-publishing P03-01B | 2 minutes | 3 tasks | 5 files |
| Phase 03-execution-publishing P03-01B | 120 | 3 tasks | 5 files |
| Phase 03-execution-publishing P01C | 2min | 1 tasks | 3 files |
| Phase 03 P04A | 95 | 2 tasks | 4 files |
| Phase 03-execution-publishing P04B | 56 | 1 tasks | 4 files |
| Phase 03 P05A | 82 | 2 tasks | 2 files |
| Phase 03 P05B | 92 | 3 tasks | 4 files |
| CompilationDialog with dataset selection | Radio buttons for dataset selection, status polling UI, preview output link | Implemented in Phase 3 |
| PublishDialog with validation | Compilation status check, output URL preview, success confirmation | Implemented in Phase 3 |
| Datasets page at /datasets route | CSV upload, 100MB validation, download/delete management UI | Implemented in Phase 3 |
| Phase 03-execution-publishing P06 | 123 | 4 tasks | 6 files |
| Fork lineage hybrid approach | parent_id for immediate parent, root_id for ultimate original enables efficient chain traversal | Implemented in Phase 4 |
| Soft delete with is_archived | Hidden from feeds/search but direct URLs work, preserves fork chains | Implemented in Phase 4 |
| One-way follow relationship | Twitter/Instagram style, unique constraint prevents duplicate follows | Implemented in Phase 4 |
| FeedEvent raw logging | No ML inference in v1, JSON metadata for future features, bucket field for A/B testing | Implemented in Phase 4 |
| SET NULL on fork lineage FKs | Preserves chains when parent deleted, prevents orphaned forks | Implemented in Phase 4 |
| Follow rate limiting (100/day) | Enforced at service layer via COUNT query on created_at, maps to HTTP 429 | Implemented in Phase 4 |
| Count-only follower lists | Per CONTEXT.md D-10, full user browsing deferred to v2 | Implemented in Phase 4 |
| Public follow count endpoints | GET /followers/{id} and /following/{id} work without auth (AUTH-04) | Implemented in Phase 4 |
| Time-decayed trending algorithm | Engagement = (likes * 2) + (comments * 3), decay = engagement / pow((age_hours + 2), 1.5) | Implemented in Phase 4 |
| Redis ZSET for trending ranking | O(log N) ranking operations, HASH for per-notebook score storage with 24h TTL | Implemented in Phase 4 |
| Real-time engagement updates | increment_engagement called on like/comment events, Redis failures don't block operations | Implemented in Phase 4 |
| Celery beat every 2 minutes | Background recalculation of time decay for all published notebooks per D-25 | Implemented in Phase 4 |
| Bootstrap cache warming | Populate trending:all ZSET from database on startup if cache empty per D-28 | Implemented in Phase 4 |
| Forks equal in trending | No parent_id check in algorithm, forks have same weightage as originals | Implemented in Phase 4 |
| Phase 04-forking-social-discovery P05 | 4 | 2 tasks | 10 files |
| Phase 04-forking-social-discovery P01 | 195 | 4 tasks | 9 files |
| Phase 04-forking-social-discovery P01 | 195 | 4 tasks | 9 files |
| Phase 04 P01 | 195 | 4 tasks | 9 files |
| Phase 04 P02 | 120 | 2 tasks | 5 files |
| Phase 04 P03 | 90 | 2 tasks | 4 files |
| Phase 04-forking-social-discovery P04 | 15 | 2 tasks | 3 files |
| Phase 04-forking-social-discovery P06 | 180 | 3 tasks | 8 files |
| Phase 04 P05 | 251 | 2 tasks | 10 files |
| Phase 04-07 P07 | 420 | 2 tasks | 8 files |
| Phase 04 P07 | 420 | 2 tasks | 8 files |
| Phase 04 P08 | 277 | 4 tasks | 11 files |
| Phase 05 P00 | 277 | 6 tasks | 20 files |
| Phase 05 P01 | 10800 | 9 tasks | 11 files |
| Phase 05-testing-quality P03 | 3600 | 6 tasks | 6 files |

### Technical Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
**Backend:** FastAPI 0.135.3, Uvicorn, SQLAlchemy 2.0, python-jose
**Database:** PostgreSQL 17+
**Cache/Queue:** Redis 7.4.0, Celery 5.6.3 (planned)
**Storage:** MinIO (local), AWS S3 (production), CloudFront CDN (planned)
**Execution:** Pyodide 0.26.3 (WASM), Docker containers (planned)
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

None - project is on track with Phase 3 planning.

## Session Continuity

### Last Action

Completed Phase 04 Plan 05: Trending Algorithm and Redis Caching. Implemented TrendingService with time-decayed algorithm: engagement = (likes * 2) + (comments * 3), decayed_score = engagement / pow((age_hours + 2), 1.5). Redis ZSET for O(log N) ranking, HASH for per-notebook score storage (24h TTL). Real-time engagement updates on like/comment events via increment_engagement. Celery beat task every 2 minutes for time decay recalculation. Bootstrap function for cache warming on startup. Feed API endpoints: GET /api/v1/feed/trending (trending notebooks), GET /api/v1/feed (personalized feed = followed + trending). PERF-06 satisfied: Redis caching for trending scores operational.

### Next Action

Begin Phase 04 Plan 08: [final plan in phase].

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
- **NEW: Phase 3 adds container compilation with Celery**
- **NEW: MinIO/S3 for datasets and notebook outputs**
- **NEW: CDN integration for fast output delivery**
- **NEW: Image optimization with WebP conversion**

---

*State updated: 2026-04-04 after completing Phase 3 Plan 06 - Phase 03 Complete*
