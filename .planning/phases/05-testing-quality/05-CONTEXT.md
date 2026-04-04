# Phase 5: Testing & Quality - Context

**Gathered:** 2026-04-05
**Status:** Ready for planning

## Phase Boundary

This phase establishes comprehensive test coverage across all components. It includes: (1) Backend unit tests for all API endpoints with 80%+ line coverage, (2) Frontend component tests with shallow + full DOM hybrid approach, (3) Integration tests covering 6 major user flows, (4) E2E tests with comprehensive scenarios using Playwright, (5) Performance testing with load testing and performance budgets, (6) CI/CD automation with GitHub Actions, (7) Code quality gates (linting, type checking, security, dependencies).

**What this phase delivers:** Full test suite that runs automatically on every commit via GitHub Actions, with comprehensive coverage across unit, integration, E2E, and performance tests. All tests must pass before merge.

**What this phase does NOT deliver:** Production deployment infrastructure (Phase 6) or new product features.

---

## Implementation Decisions

### 1. Testing Philosophy & Coverage

- **D-01:** Target 80%+ line coverage and 70%+ branch coverage across all code (high bar, comprehensive investment in quality)
- **D-02:** Aggressive mocking strategy - mock all external services (OAuth, S3/MinIO, Meilisearch, Redis) for fast, isolated unit tests
- **D-03:** Factory pattern for test data - `create_notebook()`, `create_user()`, `create_fork()` functions generate data on-the-fly for flexible test scenarios
- **D-04:** Database isolation via rollback transactions - pytest fixtures wrap each test in a transaction and roll back after (fast test cycles, no shared state between tests)
- **D-05:** Note: With aggressive mocking, add 2-3 "smoke tests" using real PostgreSQL and Redis to catch mock drift from actual service behavior

### 2. Frontend Testing Approach

- **D-06:** Hybrid component testing - shallow rendering for prop validation (fast), full DOM rendering for user interactions (comprehensive)
- **D-07:** Use @testing-library/react for component testing - user-centric queries (`getByRole`, `getByText`), industry standard, actively maintained
- **D-08:** HTTP-level mocking for API calls - intercept fetch/axios to verify correct URLs, methods, and payloads
- **D-09:** Direct store testing for Zustand - import stores, call actions, verify state changes (no store mocking)
- **D-10:** Comprehensive interaction testing - test all states: loading, success, error, empty, disabled for each component

### 3. Integration & E2E Testing

- **D-11:** Comprehensive integration tests covering 6 user flows:
  - Authentication (OAuth callback → user creation → session)
  - Notebook lifecycle (create → edit → compile → publish → view)
  - Forking (fork → verify lineage → independent edits)
  - Social interactions (follow → like → comment → feed updates)
  - Search (publish → index → search → filter)
  - Feed (followed users → personalized feed → trending fallback)
- **D-12:** Comprehensive E2E tests with multiple scenarios per flow - happy path, error cases, edge cases using Playwright
- **D-13:** Chromium-only for E2E - Chrome and Edge only (both Chromium), covers 90%+ users with lowest maintenance overhead

### 4. CI/CD & Automation

- **D-14:** GitHub Actions only - build, test, lint, type check, security scan, and dependency check all in GitHub Actions (simple, free, excellent GitHub integration)
- **D-15:** Full parallel test execution - backend unit tests, frontend tests, integration tests, and E2E tests run simultaneously in separate jobs for fastest feedback (~5-10 min total despite 30+ min of tests)
- **D-16:** Strict failure policy for flaky tests - no automatic retries, any test failure fails the build (forces immediate fixes, maintains test integrity)
- **D-17:** Performance testing included in Phase 5 - load testing for APIs (k6 or Locust), performance budgets for frontend, ensures production-ready before deployment
- **D-18:** Comprehensive code quality gates - linting (ESLint, Black/Ruff), type checking (TypeScript, mypy), security scanning (Bandit, npm audit), dependency scanning (Dependabot alerts)

---

## Claude's Discretion

**Backend Testing:**
- Exact pytest fixture structure and organization
- Test file naming conventions (test_*.py vs *_test.py)
- Whether to use pytest-asyncio for async endpoint tests
- Mock library choice (unittest.mock vs pytest-mock)

**Frontend Testing:**
- Exact loading skeleton design and timing
- Test file organization (co-located __tests__ vs separate test/ directory)
- Whether to use Vitest watch mode during development

**Integration & E2E:**
- Page object pattern or direct Playwright interactions
- Test data setup for complex multi-user flows (e.g., fork chains with multiple users)
- Screenshot testing for visual regression (optional, if time permits)

**CI/CD:**
- Exact GitHub Actions workflow structure (single workflow vs multiple)
- Caching strategy for dependencies (actions/cache with custom keys)
- Badge/display strategy for test results in PR comments

**Performance Testing:**
- Load testing tool choice (k6 vs Locust - lean toward k6 for simpler JS-based scripts)
- Performance budget thresholds (e.g., API p95 < 500ms, frontend LCP < 2.5s)
- Whether to include performance degradation tests (e.g., "response time doesn't double under load")

---

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Testing Requirements
- `.planning/REQUIREMENTS.md` - TEST-01 through TEST-05 (backend unit tests, frontend component tests, integration tests, E2E tests, CI/CD automation)
- `.planning/ROADMAP.md` - Phase 5 success criteria (5 requirements for test coverage and automation)

### Prior Phase Context
- `.planning/phases/01-foundation-authentication/01-CONTEXT.md` - Authentication patterns, JWT sessions, OAuth flow decisions
- `.planning/phases/04-forking-social-discovery/04-CONTEXT.md` - Social features (fork, follow, search, feed) requiring test coverage

### Technology Stack
- `research/STACK.md` - pytest, vitest, Playwright, @testing-library/react already selected as test frameworks

### Existing Code Patterns
- `backend/app/api/v1/` - FastAPI router structure (reference for API test patterns)
- `backend/app/services/` - Service layer pattern (reference for service unit tests)
- `frontend/components/` - React components using shadcn/ui (reference for component tests)
- `frontend/stores/` - Zustand stores (reference for direct store testing)

---

## Existing Code Insights

### Reusable Assets
- **Pytest:** Already configured for backend (from Phase 1), `backend/pytest.ini` exists
- **Vitest:** Configured for frontend (from Phase 2), `frontend/vitest.config.ts` exists
- **GitHub Actions:** Basic workflows exist (`.github/workflows/`), extend for comprehensive testing
- **Test utilities:** `backend/tests/conftest.py` may have fixtures from prior phases
- **Mock patterns:** Check existing test files for mock patterns to maintain consistency

### Established Patterns
- **Service layer:** Backend uses service classes (AuthService, NotebookService, etc.) - test these directly
- **API routes:** FastAPI routers in `backend/app/api/v1/` - use TestClient for endpoint tests
- **React components:** Functional components with hooks - @testing-library/react works well
- **Zustand stores:** Simple stores with actions - import and test directly
- **Docker Compose:** Test database services can use same `docker-compose.test.yml` pattern

### Integration Points
- **Backend tests:** Use `pytest` with TestClient for API tests, mock services (OAuth, S3, Meilisearch, Redis)
- **Frontend tests:** Use Vitest with @testing-library/react, mock fetch for API calls, test stores directly
- **Integration tests:** Use real PostgreSQL + Redis in Docker, mock external APIs (OAuth)
- **E2E tests:** Use Playwright with test server (FastAPI TestClient or real backend), real browser automation

---

## Deferred Ideas

None — discussion stayed within Phase 5 scope (testing and quality infrastructure). Performance monitoring and APM tools deferred to Phase 6 (Production Deployment).

---

*Phase: 05-testing-quality*
*Context gathered: 2026-04-05*
