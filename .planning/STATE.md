# Project State: NotebookSocial

**Last Updated:** 2026-04-02
**Current Phase:** Phase 1 (Foundation & Authentication)
**Current Focus:** Project initialization and roadmap creation

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

### Phase Status
**Phase:** 1 - Foundation & Authentication
**Plan:** Not started
**Status:** Not started
**Progress:** 0/5 success criteria completed

### Progress Bar
```
Phase 1: [░░░░░░░░░░] 0%
Phase 2: [░░░░░░░░░░] 0%
Phase 3: [░░░░░░░░░░] 0%
Phase 4: [░░░░░░░░░░] 0%
Phase 5: [░░░░░░░░░░] 0%
Phase 6: [░░░░░░░░░░] 0%
Overall: [░░░░░░░░░░] 0%
```

### Current Focus
Roadmap has been created. Next step is to plan Phase 1 using `/gsd:plan-phase 1`.

## Performance Metrics

### Requirements Coverage
- **Total v1 requirements:** 64
- **Mapped to phases:** 64 (100%)
- **Completed:** 0 (0%)

### Phase Progress
- **Phases defined:** 6
- **Phases completed:** 0 (0%)
- **Plans created:** 0 (0%)

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

### Technical Stack
**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui
**Backend:** FastAPI 0.135.3, Uvicorn, SQLAlchemy 2.0, python-jose
**Database:** PostgreSQL 17+
**Cache/Queue:** Redis 7.4.0, Celery
**Storage:** MinIO (local), AWS S3 (production), CloudFront CDN
**Execution:** Pyodide (WASM), Docker containers
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
Created roadmap with 6 phases covering all 64 v1 requirements.

### Next Action
Plan Phase 1 using `/gsd:plan-phase 1`.

### Context Handoff
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

---

*State initialized: 2026-04-02*
