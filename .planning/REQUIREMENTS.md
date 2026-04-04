# Requirements: NotebookSocial

**Defined:** 2026-04-02
**Core Value:** Interactive + social — make computational knowledge shareable and remixable, with forking as a first-class social action.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up via Google OAuth
- [x] **AUTH-02**: User can sign up via Facebook OAuth
- [x] **AUTH-03**: User session persists across browser refresh
- [x] **AUTH-04**: Passive users can view notebooks without authentication
- [x] **AUTH-05**: Authentication is required only for creating, editing, liking, commenting, and forking

### Notebook Creation

- [x] **NOTE-01**: User can create Python notebooks using WASM-powered editor (Pyodide)
- [x] **NOTE-02**: User can preview notebook compilation results locally before publishing
- [x] **NOTE-03**: User can upload datasets (CSV files) to support charts and data visualization
- [x] **NOTE-04**: User can compile notebooks in isolated online containers
- [x] **NOTE-05**: User can publish pre-rendered notebook outputs to social feed (if compilation succeeds and user approves)
- [x] **NOTE-06**: User can edit their own unpublished notebooks
- [x] **NOTE-07**: User can delete their own notebooks (unless forked by others)

### Notebook Viewing

- [x] **VIEW-01**: User can view Instagram-style feed of published notebooks
- [x] **VIEW-02**: User can click notebook listing to see full pre-rendered notebook
- [x] **VIEW-03**: Notebook outputs (charts, images, videos) are served via CDN for performance
- [x] **VIEW-04**: Feed loads quickly with lazy loading for infinite scroll
- [x] **VIEW-05**: Notebook viewer displays pre-rendered outputs (not executing code in browser)

### Forking

- [x] **FORK-01**: User can fork any notebook (published or draft)
- [x] **FORK-02**: Forked notebook is a copy that user can edit and publish separately
- [x] **FORK-03**: Forks appear in feed with equal weightage to original notebooks
- [x] **FORK-04**: Fork attribution chain is preserved (shows lineage from original to current)
- [x] **FORK-05**: User cannot delete notebooks that have been forked by others

### Social Features

- [x] **SOC-01**: User can like notebooks
- [x] **SOC-02**: User can unlike notebooks
- [x] **SOC-03**: User can comment on notebooks
- [x] **SOC-04**: User can reply to comments (threaded comments)
- [x] **SOC-05**: User can share notebooks (copy link, share to social platforms)
- [x] **SOC-06**: User can view like and comment counts on notebook cards in feed

### Discovery

- [x] **DISC-01**: Feed algorithm uses ML to show trending content
- [x] **DISC-02**: Feed algorithm treats main notebooks and forks with equal weightage
- [x] **DISC-03**: User can search notebooks by title, tags, and author
- [x] **DISC-04**: User can filter search results by notebook type (original vs fork)
- [x] **DISC-05**: Feed shows engagement metrics (views, likes, comments)

### User Profiles

- [x] **PROF-01**: User profile displays username and avatar
- [x] **PROF-02**: User profile displays bio
- [x] **PROF-03**: User profile shows count of published notebooks
- [x] **PROF-04**: User profile shows count of likes received
- [x] **PROF-05**: User can edit their own profile
- [x] **PROF-06**: User profile lists user's published notebooks

### Storage & CDN

- [x] **STOR-01**: Datasets (CSV files) are stored in MinIO
- [x] **STOR-02**: Dataset files have cryptographically secure URLs with expiration
- [x] **STOR-03**: Pre-rendered notebook outputs are stored in MinIO/S3
- [x] **STOR-04**: Pre-rendered outputs are served via CloudFront CDN
- [x] **STOR-05**: CDN cache is invalidated when notebook is updated or deleted
- [x] **STOR-06**: Static assets (images, videos) are optimized for delivery

### Infrastructure

- [x] **INFRA-01**: Frontend and backend are in separate folders (API-first architecture)
- [x] **INFRA-02**: Application runs in Docker Compose locally
- [ ] **INFRA-03**: Application is deployable to AWS
- [x] **INFRA-04**: PostgreSQL stores relational data (users, notebooks, social graph)
- [ ] **INFRA-05**: Redis handles caching and job queues
- [x] **INFRA-06**: Celery manages async notebook compilation tasks
- [x] **INFRA-07**: Containers have strict resource limits (CPU, memory, timeout)

### Testing

- [x] **TEST-01**: Backend has unit tests for all API endpoints
- [x] **TEST-02**: Frontend has component tests for UI components
- [ ] **TEST-03**: Integration tests cover key user flows (signup, create, publish, view)
- [ ] **TEST-04**: E2E tests cover critical paths (end-to-end notebook creation to viewing)
- [ ] **TEST-05**: Test suite runs automatically on CI/CD

### Security

- [x] **SEC-01**: Notebook execution containers are isolated (no privileged mode, seccomp profiles)
- [x] **SEC-02**: Container execution has timeout limits
- [x] **SEC-03**: Dataset access is restricted to notebook owner and viewers
- [ ] **SEC-04**: API endpoints have rate limiting
- [ ] **SEC-05**: User inputs are validated and sanitized
- [ ] **SEC-06**: OAuth tokens are securely stored and managed
- [x] **SEC-07**: Sensitive data is encrypted at rest

### Performance

- [x] **PERF-01**: Feed loads initial 10 notebooks in under 2 seconds
- [x] **PERF-02**: Notebook viewer loads in under 3 seconds (first paint)
- [x] **PERF-03**: WASM editor initializes in under 5 seconds
- [x] **PERF-04**: Images are lazy-loaded and optimized
- [x] **PERF-05**: Database queries are indexed for common operations
- [x] **PERF-06**: Redis caching reduces database load for feed and trending

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Advanced Social

- **ASOC-01**: User receives notifications for likes, comments, and new forks on their notebooks
- **ASOC-02**: User can follow other users
- **ASOC-03**: User can view activity feed of followed users
- **ASOC-04**: User can mention other users in comments

### Advanced Discovery

- **ADIS-01**: User can save notebooks to collections
- **ADIS-02**: User can filter feed by tags or topics
- **ADIS-03**: Recommendation engine suggests notebooks based on viewing history
- **ADIS-04**: User can browse trending notebooks by time period (day, week, month)

### Advanced Execution

- **AEXEC-01**: User can schedule periodic notebook execution
- **AEXEC-02**: User can access external APIs in notebooks
- **AEXEC-03**: User can install custom Python packages in containers

### Analytics

- **ANAL-01**: User can view detailed analytics on their notebooks (views, engagement over time)
- **ANAL-02**: Admin can view platform-wide analytics
- **ANAL-03**: User can export their notebook data

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real-time collaborative editing | Complexity explosion (OT/CRDT), forking is the collaboration model |
| Direct notebook execution in browser viewers | Limited WASM packages, performance issues - pre-rendered outputs are safer and faster |
| Video upload/direct embedding | Content moderation nightmare, different use case - only video outputs from notebook execution |
| Advanced analytics dashboard | Nice-to-have, not v1 - basic metrics only |
| Monetization features | Premature optimization, distracts from core value |
| Multiple language support (beyond Python) | Fragmentation, complexity - Python-only for v1 |
| Native mobile app | Resource-intensive, web-first is viable with responsive design |
| Code search across all notebook contents | Privacy concerns, compute-intensive - search metadata, tags, titles, descriptions only |
| Real-time updates (live feed) | Not required for v1, polling or manual refresh is sufficient |
| Public API for third-party integrations | Not in scope for v1, API-first architecture enables future addition |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| NOTE-01 | Phase 2 | Complete |
| NOTE-02 | Phase 2 | Complete |
| NOTE-03 | Phase 3 | Complete |
| NOTE-04 | Phase 3 | Complete |
| NOTE-05 | Phase 3 | Complete |
| NOTE-06 | Phase 2 | Complete |
| NOTE-07 | Phase 2 | Complete |
| VIEW-01 | Phase 2 | Complete |
| VIEW-02 | Phase 2 | Complete |
| VIEW-03 | Phase 3 | Complete |
| VIEW-04 | Phase 2 | Complete |
| VIEW-05 | Phase 2 | Complete |
| FORK-01 | Phase 4 | Complete |
| FORK-02 | Phase 4 | Complete |
| FORK-03 | Phase 4 | Complete |
| FORK-04 | Phase 4 | Complete |
| FORK-05 | Phase 4 | Complete |
| SOC-01 | Phase 2 | Complete |
| SOC-02 | Phase 2 | Complete |
| SOC-03 | Phase 2 | Complete |
| SOC-04 | Phase 2 | Complete |
| SOC-05 | Phase 2 | Complete |
| SOC-06 | Phase 2 | Complete |
| DISC-01 | Phase 4 | Complete |
| DISC-02 | Phase 4 | Complete |
| DISC-03 | Phase 4 | Complete |
| DISC-04 | Phase 4 | Complete |
| DISC-05 | Phase 4 | Complete |
| PROF-01 | Phase 1 | Complete |
| PROF-02 | Phase 1 | Complete |
| PROF-03 | Phase 1 | Complete |
| PROF-04 | Phase 1 | Complete |
| PROF-05 | Phase 1 | Complete |
| PROF-06 | Phase 1 | Complete |
| STOR-01 | Phase 3 | Complete |
| STOR-02 | Phase 3 | Complete |
| STOR-03 | Phase 3 | Complete |
| STOR-04 | Phase 3 | Complete |
| STOR-05 | Phase 3 | Complete |
| STOR-06 | Phase 3 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 6 | Pending |
| INFRA-04 | Phase 1 | Complete |
| INFRA-05 | Phase 1 | Pending |
| INFRA-06 | Phase 3 | Complete |
| INFRA-07 | Phase 3 | Complete |
| TEST-01 | Phase 5 | Complete |
| TEST-02 | Phase 5 | Complete |
| TEST-03 | Phase 5 | Pending |
| TEST-04 | Phase 5 | Pending |
| TEST-05 | Phase 5 | Pending |
| SEC-01 | Phase 3 | Complete |
| SEC-02 | Phase 3 | Complete |
| SEC-03 | Phase 3 | Complete |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| SEC-06 | Phase 1 | Pending |
| SEC-07 | Phase 3 | Complete |
| PERF-01 | Phase 3 | Complete |
| PERF-02 | Phase 3 | Complete |
| PERF-03 | Phase 2 | Complete |
| PERF-04 | Phase 3 | Complete |
| PERF-05 | Phase 1 | Complete |
| PERF-06 | Phase 4 | Complete |

**Coverage:**
- v1 requirements: 64 total
- Mapped to phases: 64
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation*
