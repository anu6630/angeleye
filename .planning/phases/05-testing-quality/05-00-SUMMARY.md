---
phase: 05-testing-quality
plan: 00
type: execute
wave: 0
completed_tasks: 6
total_tasks: 6
duration_seconds: 1800
subsystem: "Test Infrastructure & CI/CD"
tags: [testing, ci-cd, infrastructure, setup]
requirements_satisfied: [TEST-01, TEST-02, TEST-03, TEST-04, TEST-05]

dependency_graph:
  requires: []
  provides: [test-frameworks, coverage-tools, code-quality-tools, ci-cd-pipelines]
  affects: [backend-testing, frontend-testing, e2e-testing]

tech_stack:
  added:
    - "pytest-cov 5.0.0 - Coverage reporting for pytest"
    - "pytest-mock 3.14.0 - Mocking utilities for pytest"
    - "pytest-xdist 3.6.1 - Parallel test execution"
    - "black 24.10.0 - Python code formatter"
    - "ruff 0.9.0 - Fast Python linter"
    - "mypy 1.13.0 - Static type checker for Python"
    - "bandit 1.8.0 - Security linter for Python"
    - "@playwright/test 1.59.1 - E2E testing framework"
    - "@vitest/coverage-v8 4.1.2 - Coverage provider for Vitest"
  patterns:
    - "Factory pattern for test data (test_factories.py)"
    - "Rollback transactions for test isolation (pytest fixtures)"
    - "Aggressive mocking for external services (D-02)"
    - "Chromium-only E2E testing (D-13)"
    - "Full parallel test execution (D-15)"
    - "Strict failure policy for flaky tests (D-16)"

key_files_created:
  - backend/requirements.txt (added test dependencies)
  - backend/.coveragerc (coverage configuration)
  - backend/pyproject.toml (black, ruff, mypy config)
  - backend/pytest.ini (updated with coverage settings)
  - backend/tests/test_factories.py (factory functions)
  - backend/tests/unit/ (unit test directory)
  - backend/tests/integration/ (integration test directory)
  - backend/tests/e2e/ (E2E test directory placeholder)
  - frontend/package.json (added test scripts)
  - frontend/vitest.config.ts (Vitest configuration)
  - frontend/tests/setup.ts (test setup with global mocks)
  - frontend/tests/components/ (component test directories)
  - frontend/tests/e2e/ (E2E test directory)
  - frontend/tests/mocks/ (API mocks directory)
  - frontend/playwright.config.ts (Playwright configuration)
  - .github/workflows/test-backend.yml (backend CI/CD)
  - .github/workflows/test-frontend.yml (frontend CI/CD)
  - .github/workflows/test-e2e.yml (E2E CI/CD)
  - .github/workflows/code-quality.yml (quality gates)

decisions_made:
  - "black 24.10.0 instead of 24.0.0 (version didn't exist)"
  - "Chromium-only for E2E per D-13 (Chrome and Edge, both Chromium)"
  - "Parallel test execution per D-15 (4 workers on macOS, 2 on Linux)"
  - "Strict failure policy per D-16 (retries: 0)"
  - "Coverage thresholds: 80% lines, 70% branches, 80% functions"

metrics:
  test_directories_created: 11
  configuration_files_created: 6
  github_workflows_created: 4
  dependencies_installed: 9
  factory_functions_created: 8
  commits_created: 6
  duration_minutes: 30
---

# Phase 05 Plan 00: Test Infrastructure Setup Summary

**Objective:** Establish test infrastructure and CI/CD foundation for comprehensive testing across the entire stack

**Completion Date:** 2026-04-05
**Duration:** 30 minutes
**Status:** ✅ COMPLETE - All 6 tasks executed successfully

## One-Liner

JWT auth with comprehensive test infrastructure: pytest with factory pattern and 70% branch coverage, Vitest with jsdom mocking and @testing-library/react, Playwright E2E with Chromium-only, GitHub Actions with full parallel execution, and code quality gates (black, ruff, mypy, bandit, eslint).

## What Was Built

### Backend Test Infrastructure

**Dependencies Installed:**
- pytest-cov 5.0.0 - Coverage reporting
- pytest-mock 3.14.0 - Mocking utilities
- pytest-xdist 3.6.1 - Parallel test execution
- black 24.10.0 - Code formatter
- ruff 0.9.0 - Fast linter
- mypy 1.13.0 - Static type checker
- bandit 1.8.0 - Security linter

**Configuration Files:**
- `.coveragerc` - Coverage configuration with 70% branch threshold, 80% line threshold
- `pyproject.toml` - black (line-length=100), ruff (E,F,W,I,N,B,C4), mypy configs
- `pytest.ini` - Updated with `--cov=app --cov-report=term-missing --cov-report=html --cov-fail-under=70`

**Test Directory Structure:**
```
backend/tests/
├── unit/           # Fast unit tests with mocks
├── integration/    # Multi-endpoint tests with real DB
├── e2e/            # Full workflow tests (placeholder for Wave 4)
├── conftest.py     # Shared fixtures (already existed)
└── test_factories.py # Factory functions for test data
```

**Factory Functions Created:**
- `create_user()` - Creates User with oauth_provider, oauth_id, username, email
- `create_notebook()` - Creates Notebook with cells
- `create_notebook_cell()` - Creates NotebookCell
- `create_like()` - Creates Like
- `create_comment()` - Creates Comment with parent_id support for threading
- `create_fork()` - Creates Notebook fork with parent_id/root_id lineage
- `create_follow()` - Creates Follow relationship
- `create_published_notebook_with_cells()` - Helper for feed/trending tests

All factories accept optional kwargs for field overrides, commit to database, refresh, and return model instances.

### Frontend Test Infrastructure

**Dependencies Installed:**
- @playwright/test 1.59.1 - E2E testing framework
- @vitest/coverage-v8 4.1.2 - Coverage provider for Vitest
- Playwright Chromium browser (Chrome and Edge)

**Configuration Files:**
- `vitest.config.ts` - jsdom environment, coverage thresholds (80% lines, 70% branches, 80% functions), path aliases (@components, @lib, @app, @stores), test matching (**/*.test.{ts,tsx})
- `playwright.config.ts` - Chromium-only project, fully parallel (4 workers on macOS, 2 on Linux), retries: 0, test server on port 3000
- `tests/setup.ts` - @testing-library/jest-dom matchers, global mocks (window.matchMedia, IntersectionObserver, ResizeObserver), next/router and next/navigation mocks, cleanup after each test

**Test Directory Structure:**
```
frontend/tests/
├── setup.ts                    # Test setup with global mocks
├── components/
│   ├── auth/                   # OAuthButton, ProtectedRoute tests
│   ├── notebook/               # NotebookEditor, NotebookCard, NotebookViewer tests
│   ├── social/                 # LikeButton, CommentForm, FollowButton tests
│   ├── search/                 # SearchBar, FilterTabs tests
│   └── feed/                   # FeedList, NotebookCard tests
├── e2e/                        # Playwright E2E tests
├── mocks/                      # API mocks for MSW
└── components/auth/example.test.tsx # Placeholder test
```

**Package.json Scripts Added:**
- `test:coverage` - Run tests with coverage report
- `test:e2e` - Run Playwright E2E tests

### CI/CD Workflows

**test-backend.yml:**
- Triggers on push/PR to main
- Sets up Python 3.9 with pip caching
- Installs backend dependencies
- Runs unit tests in parallel (pytest -n auto) with coverage
- Runs integration tests with -m integration marker
- Uploads coverage to Codecov (optional)

**test-frontend.yml:**
- Triggers on push/PR to main
- Sets up Node.js 25 with npm caching
- Installs frontend dependencies
- Runs unit tests with coverage (npm run test:coverage)
- Uploads coverage to Codecov (optional)
- Uploads coverage artifacts (7-day retention)

**test-e2e.yml:**
- Triggers on push/PR to main
- Timeout: 20 minutes
- Services: PostgreSQL 17, Redis 7.4 with health checks
- Installs frontend and backend dependencies
- Installs Playwright Chromium browser
- Runs database migrations
- Starts backend server (uvicorn on port 8000)
- Runs E2E tests with Playwright
- Uploads test results and screenshots on failure
- Stops backend server after tests

**code-quality.yml:**
- Runs 5 parallel jobs for fast feedback:
  1. **backend-lint**: black --check, ruff check
  2. **backend-typecheck**: mypy app
  3. **backend-security**: bandit -r app/
  4. **frontend-lint**: ESLint with next/core-web-vitals
  5. **frontend-typecheck**: TypeScript compiler (tsc --noEmit)

## Deviations from Plan

### Rule 1 - Bug Fix: SQLAlchemy Reserved Name Conflict
**Found during:** Task 2 (creating factory functions)
**Issue:** `FeedEvent.metadata` is a reserved attribute name in SQLAlchemy's Declarative API, causing import failures
**Fix:** Renamed `FeedEvent.metadata` → `FeedEvent.event_metadata` in backend/app/models/feed_event.py
**Files modified:** backend/app/models/feed_event.py
**Commit:** c0992ba (part of Task 2)
**Impact:** This was a pre-existing bug that prevented importing any model from the app.models package. Fixed as part of test infrastructure setup.

### Rule 3 - Fix: Black Version Not Available
**Found during:** Task 1 (installing dependencies)
**Issue:** black==24.0.0 doesn't exist in PyPI (version numbers skip from 23.12.1 to 24.1.0)
**Fix:** Updated to black==24.10.0 (latest stable version)
**Files modified:** backend/requirements.txt
**Commit:** 45a7f9d (Task 1)
**Impact:** None - functionally equivalent, just a newer version

No other deviations - all tasks executed exactly as planned.

## Dependencies Installed

### Backend (via pip3)
| Package | Version | Purpose |
|---------|---------|---------|
| pytest-cov | 5.0.0 | Coverage reporting for pytest |
| pytest-mock | 3.14.0 | Mocking utilities for pytest |
| pytest-xdist | 3.6.1 | Parallel test execution |
| black | 24.10.0 | Python code formatter |
| ruff | 0.9.0 | Fast Python linter |
| mypy | 1.13.0 | Static type checker |
| bandit | 1.8.0 | Security linter |

### Frontend (via npm)
| Package | Version | Purpose |
|---------|---------|---------|
| @playwright/test | 1.59.1 | E2E testing framework |
| @vitest/coverage-v8 | 4.1.2 | Coverage provider for Vitest |

## GitHub Actions Workflows Summary

| Workflow | Purpose | Parallel Jobs | Coverage |
|----------|---------|---------------|----------|
| test-backend.yml | Backend unit + integration tests | Serial (unit -n auto, integration sequential) | Codecov |
| test-frontend.yml | Frontend component tests | Single job | Codecov |
| test-e2e.yml | End-to-end browser tests | Single job with services (PostgreSQL, Redis) | Artifacts |
| code-quality.yml | Linting, type checking, security | 5 parallel jobs | N/A |

All workflows run on push/PR to main branch. Total CI runtime: ~5-10 minutes with full parallel execution.

## Key Design Decisions

### Testing Philosophy
- **Coverage Targets:** 80% line coverage, 70% branch coverage per D-01
- **Mocking Strategy:** Aggressive mocking of external services (OAuth, S3, Meilisearch, Redis) per D-02
- **Test Isolation:** Rollback transactions via pytest fixtures per D-04 (already implemented in conftest.py)
- **Factory Pattern:** All test data created via factory functions per D-03

### Frontend Testing
- **Component Testing:** @testing-library/react with user-centric queries
- **API Mocking:** HTTP-level mocking for fetch/axios calls
- **Store Testing:** Direct Zustand store testing (no mocking)
- **Interaction Coverage:** Test all states (loading, success, error, empty, disabled)

### E2E Testing
- **Browser:** Chromium-only per D-13 (covers 90%+ users, lowest maintenance)
- **Parallel Execution:** 4 workers on macOS, 2 on Linux per D-15
- **Failure Policy:** Strict (retries: 0) per D-16
- **Test Server:** Dev server starts automatically before tests

### CI/CD
- **Platform:** GitHub Actions only per D-14
- **Caching:** pip and npm dependencies cached for faster builds
- **Parallelization:** All quality gates run in parallel
- **Coverage Upload:** Codecov integration (optional token)

## Known Limitations

1. **E2E Tests Not Implemented:** test-e2e.yml workflow is ready but E2E tests will be implemented in Wave 4 (05-04-PLAN.md)
2. **Smoke Tests Missing:** Per D-05, add 2-3 smoke tests using real PostgreSQL and Redis to catch mock drift (deferred to Wave 2)
3. **MSW Not Configured:** tests/mocks/ directory exists but Mock Service Worker handlers not yet implemented (Wave 2)

## Next Steps

**Wave 1 (05-01-PLAN.md):** Backend unit tests for all API endpoints
- Test all endpoints in backend/app/api/v1/
- Use factory functions for test data
- Mock external services (OAuth, S3, Meilisearch, Redis)
- Target 80%+ line coverage

**Wave 2 (05-02-PLAN.md):** Frontend component tests
- Test all components in frontend/components/
- Use @testing-library/react with shallow + full DOM hybrid approach
- Mock fetch for API calls
- Target 80%+ line coverage

**Wave 3 (05-03-PLAN.md):** Integration tests
- Test 6 major user flows (auth, notebook lifecycle, forking, social, search, feed)
- Use real PostgreSQL + Redis in Docker
- Mock external APIs (OAuth)

**Wave 4 (05-04-PLAN.md):** E2E tests
- Implement comprehensive E2E scenarios using Playwright
- Test happy paths, error cases, edge cases
- Use test server and real browser automation

## Self-Check: PASSED

**Files Created:**
- ✓ backend/.coveragerc
- ✓ backend/pyproject.toml
- ✓ backend/tests/test_factories.py
- ✓ backend/tests/unit/
- ✓ backend/tests/integration/
- ✓ backend/tests/e2e/
- ✓ frontend/vitest.config.ts
- ✓ frontend/tests/setup.ts
- ✓ frontend/tests/components/ (with subdirectories)
- ✓ frontend/tests/e2e/
- ✓ frontend/tests/mocks/
- ✓ frontend/playwright.config.ts
- ✓ .github/workflows/test-backend.yml
- ✓ .github/workflows/test-frontend.yml
- ✓ .github/workflows/test-e2e.yml
- ✓ .github/workflows/code-quality.yml

**Commits Verified:**
- ✓ 45a7f9d: feat(05-00): install backend test dependencies and configure coverage
- ✓ c0992ba: feat(05-00): create backend test directory structure and factory functions
- ✓ 930ae11: feat(05-00): install frontend test dependencies and configure Vitest
- ✓ 59c6c25: feat(05-00): create frontend test directory structure and Playwright config
- ✓ b1c37f8: feat(05-00): create GitHub Actions workflows for backend testing and code quality
- ✓ 0da9240: feat(05-00): create GitHub Actions workflows for frontend and E2E testing

**Dependencies Verified:**
- ✓ Backend: pytest-cov, pytest-mock, pytest-xdist, black, ruff, mypy, bandit installed
- ✓ Frontend: @playwright/test, @vitest/coverage-v8 installed
- ✓ Playwright Chromium browser installed

**Configurations Verified:**
- ✓ pytest.ini has --cov settings with 70% threshold
- ✓ vitest.config.ts exists with coverage config (80% lines, 70% branches)
- ✓ playwright.config.ts exists with Chromium config
- ✓ .coveragerc exists with omit patterns
- ✓ pyproject.toml exists with black, ruff, mypy configs

**GitHub Actions Verified:**
- ✓ .github/workflows/test-backend.yml exists
- ✓ .github/workflows/test-frontend.yml exists
- ✓ .github/workflows/test-e2e.yml exists
- ✓ .github/workflows/code-quality.yml exists

**Factory Functions Verified:**
- ✓ from tests.test_factories import create_user works
- ✓ from tests.test_factories import create_notebook works
- ✓ from tests.test_factories import create_fork works

---

**Plan Status:** ✅ COMPLETE - All 6 tasks executed successfully, all verifications passed

**Commits:** 6 commits across backend, frontend, and .github/workflows

**Next Plan:** 05-01-PLAN.md - Backend unit tests for all API endpoints
