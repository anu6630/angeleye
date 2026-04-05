# Roadmap: NotebookSocial

**Created:** 2026-04-02
**Granularity:** Standard
**Coverage:** 64/64 v1 requirements mapped
**Last Updated:** 2026-04-05 (Phase 5 plans added)

## Phases

- [x] **Phase 1: Foundation & Authentication** - Project scaffolding, infrastructure setup, authentication, and user profiles
- [x] **Phase 2: Core Notebook Experience** - WASM editor, notebook creation, viewing, and basic social interactions
- [ ] **Phase 3: Execution & Publishing** - Container compilation, CDN integration, storage, and output publishing
- [ ] **Phase 4: Forking & Social Discovery** - Forking system, ML-driven feeds, search, and advanced discovery
- [ ] **Phase 5: Testing & Quality** - Comprehensive test coverage across all components
- [ ] **Phase 6: Production Deployment** - AWS deployment, security hardening, and monitoring

## Phase Details

### Phase 1: Foundation & Authentication

**Goal**: Users can sign up, manage profiles, and the platform infrastructure is ready for development

**Depends on**: Nothing (first phase)

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, INFRA-01, INFRA-02, INFRA-04, INFRA-05, SEC-04, SEC-05, SEC-06, PERF-05

**Success Criteria** (what must be TRUE):
1. User can sign up via Google OAuth and their session persists across browser refresh
2. User can sign up via Facebook OAuth and access the platform
3. User can view the platform without authentication (passive browsing works)
4. User can create and edit their profile (username, avatar, bio) and see their published notebooks count
5. Docker Compose can spin up the full development environment (frontend, backend, PostgreSQL, Redis)
6. Redis is configured for caching and rate limiting (INFRA-05)

**Plans**: 9 plans

- [x] 01-01-PLAN.md — Project scaffolding & Docker infrastructure (INFRA-01, INFRA-02)
- [x] 01-02-PLAN.md — Database schema and migrations (INFRA-04, PERF-05, PROF-01, PROF-02, PROF-03, PROF-04, PROF-06)
- [x] 01-03-PLAN.md — Security infrastructure (SEC-04, SEC-05, SEC-06, AUTH-03)
- [x] 01-04-PLAN.md — OAuth authentication endpoints (AUTH-01, AUTH-02, AUTH-03, AUTH-05)
- [x] 01-05-PLAN.md — Profile management endpoints (PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, AUTH-04, AUTH-05)
- [x] 01-06-PLAN.md — Frontend foundation (INFRA-01)
- [x] 01-07-PLAN.md — Authentication UI (AUTH-01, AUTH-02, AUTH-03, AUTH-05)
- [x] 01-08-PLAN.md — Profile UI (PROF-01, PROF-02, PROF-03, PROF-04, PROF-05, PROF-06, AUTH-04)
- [x] 01-09-PLAN.md — Redis caching and rate limiting (INFRA-05)

### Phase 2: Core Notebook Experience

**Goal**: Users can create notebooks with WASM editor, view notebooks in a feed, and engage with basic social interactions

**Depends on**: Phase 1

**Requirements**: NOTE-01, NOTE-02, NOTE-06, NOTE-07, VIEW-01, VIEW-02, VIEW-04, VIEW-05, SOC-01, SOC-02, SOC-03, SOC-04, SOC-05, SOC-06, PERF-03

**Success Criteria** (what must be TRUE):
1. User can create a Python notebook using WASM-powered editor (Pyodide) and preview compilation results locally
2. User can view an Instagram-style feed of published notebooks with like and comment counts
3. User can click a notebook listing to see the full pre-rendered notebook (not executing code in browser)
4. User can like, unlike, and comment on notebooks (with threaded replies)
5. User can share notebooks by copying link or sharing to social platforms

**Plans**: 8 plans

- [x] 02-01-PLAN.md — Database models and schemas for notebooks, likes, comments (NOTE-01, NOTE-02, NOTE-06, NOTE-07, SOC-01, SOC-02, SOC-03, SOC-04, SOC-06, PERF-03)
- [x] 02-02-PLAN.md — Notebook, like, comment, and feed API endpoints (NOTE-01, NOTE-02, NOTE-06, NOTE-07, SOC-01, SOC-02, SOC-03, SOC-04, SOC-06, VIEW-01, VIEW-04)
- [x] 02-03-PLAN.md — Frontend state management and API client extensions (NOTE-01, NOTE-02, NOTE-06, NOTE-07, SOC-01, SOC-02, SOC-03, SOC-04, SOC-05, SOC-06, VIEW-01, VIEW-04, VIEW-05, PERF-03)
- [x] 02-04-PLAN.md — Notebook editor with Pyodide and Monaco Editor (NOTE-01, NOTE-02, PERF-03)
- [x] 02-05-PLAN.md — Instagram-style feed with infinite scroll (VIEW-01, VIEW-04)
- [x] 02-06-PLAN.md — Notebook viewer (read-only) and My Notebooks page (VIEW-02, VIEW-05, NOTE-06, NOTE-07)
- [x] 02-07-PLAN.md — Social interaction components (like, comment, share) with optimistic updates (SOC-01, SOC-02, SOC-03, SOC-04, SOC-05, SOC-06)
- [x] 02-08-PLAN.md — Missing UI components, integration, and import fixes (NOTE-01, VIEW-01, VIEW-02, SOC-05)

**UI hint**: yes

### Phase 3: Execution & Publishing

**Goal**: Users can compile notebooks in isolated containers, upload datasets, and publish pre-rendered outputs via CDN

**Depends on**: Phase 2

**Requirements**: NOTE-03, NOTE-04, NOTE-05, VIEW-03, STOR-01, STOR-02, STOR-03, STOR-04, STOR-05, STOR-06, INFRA-06, INFRA-07, SEC-01, SEC-02, SEC-03, SEC-07, PERF-01, PERF-02, PERF-04

**Success Criteria** (what must be TRUE):
1. User can upload datasets (CSV files) to support charts and data visualization
2. User can compile notebooks in isolated online containers with strict resource limits
3. User can publish pre-rendered notebook outputs to social feed (if compilation succeeds and user approves)
4. Notebook outputs (charts, images, videos) are served via CDN for fast load times
5. Dataset access is restricted to notebook owner and viewers with cryptographically secure URLs

**Plans**: 10 plans (revised from original 6 due to expanded scope)

- [x] 03-00-PLAN.md — Storage service foundation and MinIO/S3 setup (STOR-01, STOR-02, SEC-07)
- [x] 03-01A-PLAN.md — Dataset API endpoints (upload, list, get, delete) (NOTE-03, STOR-01, SEC-03)
- [x] 03-01B-PLAN.md — Dataset upload UI (CSV upload, validation, management) (NOTE-03, STOR-01)
- [x] 03-02A-PLAN.md — Celery task queue infrastructure (INFRA-06, INFRA-07, SEC-02)
- [x] 03-02B-PLAN.md — Container execution foundation (SEC-01, SEC-02)
- [x] 03-03A-PLAN.md — Docker container execution with resource limits (NOTE-04, SEC-01, INFRA-07)
- [x] 03-03B-PLAN.md — Compilation service orchestration (NOTE-04, INFRA-06)
- [x] 03-04A-PLAN.md — CDN integration and output publishing (NOTE-05, VIEW-03, STOR-03, STOR-04, PERF-01)
- [x] 03-04B-PLAN.md — Notebook publishing UI (compilation dialog, publish dialog) (NOTE-04, NOTE-05)
- [x] 03-05A-PLAN.md — Output optimization and image lazy loading (STOR-06, PERF-02, PERF-04)
- [x] 03-05B-PLAN.md — Notebook viewer integration with CDN outputs (VIEW-03, VIEW-05)
- [x] 03-06-PLAN.md — Notebook output HTML rendering and cell display (VIEW-03, NOTE-05)

### Phase 4: Forking & Social Discovery

**Goal**: Users can fork notebooks with full attribution, discover content via ML-driven feeds and search, and forks appear with equal weightage

**Depends on**: Phase 3

**Requirements**: FORK-01, FORK-02, FORK-03, FORK-04, FORK-05, DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, PERF-06

**Success Criteria** (what must be TRUE):
1. User can fork any notebook (published or draft) and the fork is a copy they can edit and publish separately
2. Forks appear in feed with equal weightage to original notebooks (ML algorithm treats them equally)
3. Feed algorithm uses ML to show trending content based on engagement metrics
4. User can search notebooks by title, tags, and author with filters for original vs fork
5. Fork attribution chain is preserved (shows lineage from original to current) and user cannot delete notebooks that have been forked

**Plans**: 8 plans

- [x] 04-01-PLAN.md — Database models for fork lineage, follow system, and event tracking (FORK-01, FORK-02, FORK-03, FORK-04, FORK-05, DISC-01, DISC-02)
- [x] 04-02-PLAN.md — Follow system API with rate limiting (DISC-01, DISC-02)
- [x] 04-03-PLAN.md — Forking system API with dataset forking and delete protection (FORK-01, FORK-02, FORK-03, FORK-04, FORK-05)
- [x] 04-04-PLAN.md — Redis infrastructure and caching foundation (PERF-06)
- [x] 04-05-PLAN.md — Trending algorithm and Redis caching with Celery beat tasks (DISC-01, DISC-02, DISC-05, PERF-06)
- [x] 04-06-PLAN.md — Meilisearch integration and faceted search (DISC-03, DISC-04)
- [x] 04-07-PLAN.md — Feed personalization and engagement metrics tracking (DISC-01, DISC-02, DISC-05, PERF-06)
- [x] 04-08-PLAN.md — Frontend UI for forking, search, filters, and social features (FORK-01, FORK-02, FORK-03, FORK-04, DISC-03, DISC-04, DISC-05)

**UI hint**: yes

### Phase 5: Testing & Quality

**Goal**: All components have comprehensive test coverage and test suite runs automatically on CI/CD

**Depends on**: Phase 4

**Requirements**: TEST-01, TEST-02, TEST-03, TEST-04, TEST-05

**Success Criteria** (what must be TRUE):
1. Backend has unit tests for all API endpoints
2. Frontend has component tests for UI components
3. Integration tests cover key user flows (signup, create, publish, view)
4. E2E tests cover critical paths (end-to-end notebook creation to viewing)
5. Test suite runs automatically on CI/CD and provides clear pass/fail reporting

**Plans**: 7 plans (6 waves + 1 setup)

- [x] 05-00-PLAN.md — Test infrastructure setup (dependencies, directories, CI/CD foundation)
- [x] 05-01-PLAN.md — Backend unit tests (services and API endpoints, 20+ test files, 80%+ coverage)
- [x] 05-02-PLAN.md — Frontend component tests (30+ test files, 80%+ coverage)
- [x] 05-03-PLAN.md — Integration tests (6 user flows with real PostgreSQL/Redis)
- [x] 05-04-PLAN.md — E2E tests (Playwright with Chromium, 6 critical paths)
- [x] 05-05-PLAN.md — Performance testing (k6 load tests, Lighthouse CI budgets)
- [ ] 05-06-PLAN.md — CI/CD automation (parallel execution, coverage aggregation, quality gates)

### Phase 6: Production Deployment

**Goal**: Application is deployable to AWS with security hardening, monitoring, and production-ready configuration

**Depends on**: Phase 5

**Requirements**: INFRA-03

**Success Criteria** (what must be TRUE):
1. Application is deployable to AWS (ECS or equivalent) with all services configured
2. Production environment has security hardening applied (container security, network isolation, encryption)
3. Monitoring and alerting are configured for application health and performance
4. Deployment pipeline automates the build, test, and deploy process
5. Infrastructure can handle expected production load with auto-scaling capabilities

**Plans**: TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Authentication | 9/9 | Complete | 2026-04-03 |
| 2. Core Notebook Experience | 8/8 | Complete | 2026-04-04 |
| 3. Execution & Publishing | 12/12 | Complete | 2026-04-04 |
| 4. Forking & Social Discovery | 8/8 | Complete | 2026-04-05 |
| 5. Testing & Quality | 1/7 | In Progress|  |
| 6. Production Deployment | 0/0 | Not started | - |

## Phase Ordering Rationale

**Foundation first (Phase 1):**
- Authentication and user profiles are prerequisites for all interactive features
- Infrastructure setup (Docker Compose, PostgreSQL, Redis) must be in place before any feature development
- Security foundations (rate limiting, input validation, OAuth token management) prevent future rewrites

**Core experience next (Phase 2):**
- WASM editor and notebook viewing deliver the core value proposition
- Basic social interactions (likes, comments, shares) make the platform social from the start
- Establishes the Instagram-style feed pattern that all features build upon

**Execution and publishing (Phase 3):**
- Container compilation and CDN integration are critical infrastructure that need stable foundation
- Dataset uploads and output storage require security and performance considerations
- Must be in place before forking (can't fork what can't be published) and ML feeds (need published content)

**Forking and discovery (Phase 4):**
- Forking is a differentiator but requires stable notebook publishing and attribution tracking
- ML-driven feeds need published content and engagement data from earlier phases
- Search and filters build on the established content model

**Testing (Phase 5):**
- Comprehensive testing requires all features to be implemented first
- E2E tests cover the complete user journey from creation to forking to discovery
- Testing phase ensures quality before production deployment

**Production deployment (Phase 6):**
- Final phase focuses on production hardening and deployment automation
- Security audit and monitoring require a stable, tested application
- AWS deployment happens last to avoid environment switching during development

---

*Roadmap created: 2026-04-02*
*Phase 1 completed: 2026-04-03*
*Phase 2 completed: 2026-04-04*
*Phase 3 completed: 2026-04-04*
*Phase 4 completed: 2026-04-05*
*Phase 5 planned: 2026-04-05*
