# NotebookSocial

## What This Is

A social media platform where Python notebooks are the content. Users create notebooks using a WASM-powered editor (Pyodide), compile them in isolated containers, and publish pre-rendered outputs to an Instagram-style social feed. Viewers can browse notebook listings, click to see full rendered notebooks with charts and videos, and fork notebooks to create their own versions. Forks have equal weightage in the feed, making remixing a core social action.

## Core Value

Interactive + social — make computational knowledge shareable and remixable, with forking as a first-class social action.

## Requirements

### Validated

- [x] User can fork any notebook and publish their own version (forks appear in feed with equal weightage) - Validated in Phase 04: Forking & Social Discovery
- [x] Feed algorithm uses ML to show trending content (main notebooks and forks have equal weightage) - Validated in Phase 04: Forking & Social Discovery

### Active

- [ ] User can create Python notebooks with offline editing using Pyodide (WASM)
- [ ] User can preview notebook compilation results locally before publishing
- [ ] User can upload datasets (CSV files) to support charts and data visualization
- [ ] User can compile notebooks in isolated online containers
- [ ] User can publish pre-rendered notebook outputs to social feed (if compilation succeeds and user approves)
- [ ] User can view Instagram-style feed of published notebooks
- [ ] User can click notebook listing to see full pre-rendered notebook with charts, images, and videos served via CDN
- [ ] User can fork any notebook and publish their own version (forks appear in feed with equal weightage)
- [ ] User can sign up via Google or Facebook OAuth (required only for editing and interacting)
- [ ] Passive users can view notebooks without authentication
- [ ] User can like notebooks
- [ ] User can comment on notebooks
- [ ] User can share notebooks
- [ ] Feed algorithm uses ML to show trending content (main notebooks and forks have equal weightage)
- [ ] Notebook outputs (charts, images, videos) are served via CDN for performance
- [ ] API-first architecture (separate frontend/backend folders for future mobile app)
- [ ] Comprehensive test coverage across all components
- [ ] Infrastructure runs in Docker Compose locally, deployable to AWS

### Out of Scope

- Real-time collaborative editing (single user per notebook for v1)
- Video upload/direct embedding (only video outputs from notebook execution)
- Direct notebook execution in browser readers (only pre-rendered outputs)
- Advanced analytics beyond basic trending (views, likes, engagement metrics)
- Monetization features
- Mobile app (v1 is web-only, architecture supports future mobile)
- Multiple language support beyond Python

## Context

This platform bridges the gap between code sharing (GitHub/Colab) and social media (Instagram/Facebook). Current options force users to choose between technical sharing (code-first, social-second) or social platforms that don't handle computational content. NotebookSocial makes notebooks themselves the social content, with forking as the natural "share" action for computational knowledge.

The platform addresses three key challenges:
1. **Discovery**: ML-driven feeds make interesting notebooks discoverable, not just searchable
2. **Remixing**: First-class forking encourages building on others' work
3. **Accessibility**: Pre-rendered outputs + CDN delivery make notebooks instantly viewable, not just code

Technical approach:
- **WASM editing**: Pyodide enables fast, offline development with full Python support
- **Container compilation**: Isolated execution ensures safety and supports all Python packages
- **CDN delivery**: Pre-rendered outputs (charts, images, videos) served fast for smooth social feed experience
- **ML feeds**: Trending algorithm treats forks equally, surfacing both original and derivative work

## Constraints

- **Timeline**: 3+ months thorough development to launch-ready
- **Architecture**: API-first design (separate frontend/backend folders) for future mobile app compatibility
- **Deployment**: Local Docker Compose for development, target AWS for production
- **Testing**: Comprehensive test coverage required (unit, integration, E2E)
- **Auth**: OAuth only for interactive actions (Google, Facebook), viewing is open
- **Execution modes**: Both WASM (offline editing) AND online container compilation must be implemented

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| FastAPI (Python) backend over Kotlin | Same language as notebook processing → smoother integration with Jupyter, ML ecosystem, and container management. Async native for concurrent notebook execution. | — Pending |
| Next.js over React | Same React benefits + SSR/SEO, API routes, better performance for social feeds | — Pending |
| PostgreSQL database | Robust relational data for social features (users, posts, likes, comments, forks) | — Pending |
| MinIO for datasets | S3-compatible, runs locally in Docker, easy to migrate to AWS S3 | — Pending |
| CDN for notebook outputs | Pre-rendered charts/images/videos must load fast for Instagram-like feed experience | — Pending |
| Redis for cache/queue | Feed caching + job queues for async notebook compilation | — Pending |
| Forks have equal feed weightage | Encourages remixing and derivative work as core social behavior | — Pending |
| Auth required only for interactive actions | Lowers friction for discovery, maintains control for creation/engagement | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-05 after Phase 04 completion*
