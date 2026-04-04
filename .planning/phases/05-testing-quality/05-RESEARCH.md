# Phase 05: Testing & Quality - Research

**Researched:** 2026-04-05
**Domain:** Comprehensive testing infrastructure (unit, integration, E2E, performance, CI/CD)
**Confidence:** HIGH

## Summary

This phase establishes comprehensive test coverage across the entire NotebookSocial stack. The research confirms that the technology choices made in prior phases (pytest, Vitest, Playwright) are industry-standard for 2025 and well-suited for the FastAPI + Next.js architecture. Existing test infrastructure from Phases 1-4 provides a solid foundation, but significant expansion is needed to achieve 80%+ line coverage and implement CI/CD automation.

**Key findings:**
1. **Existing foundation is solid** - pytest configured with async support, Vitest with @testing-library/react, basic fixtures in place
2. **Gap is comprehensive coverage** - Only 3 backend test files and 3 frontend test files exist; need 50+ tests to cover all endpoints and components
3. **CI/CD needs complete setup** - No GitHub Actions workflows exist; need parallel test execution, coverage reporting, and quality gates
4. **Performance testing is straightforward** - k6 recommended for API load testing, Lighthouse CI for frontend performance budgets
5. **Testing patterns are well-established** - Factory pattern for test data, rollback transactions for DB isolation, aggressive mocking for external services

**Primary recommendation:** Implement tests incrementally by domain (backend → frontend → integration → E2E → performance → CI/CD), with each wave passing before moving to the next. Use the existing fixture structure as a template, expand factory functions for all models, and implement GitHub Actions with parallel execution from day one.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Testing Philosophy & Coverage
- **D-01:** Target 80%+ line coverage and 70%+ branch coverage across all code (high bar, comprehensive investment in quality)
- **D-02:** Aggressive mocking strategy - mock all external services (OAuth, S3/MinIO, Meilisearch, Redis) for fast, isolated unit tests
- **D-03:** Factory pattern for test data - `create_notebook()`, `create_user()`, `create_fork()` functions generate data on-the-fly for flexible test scenarios
- **D-04:** Database isolation via rollback transactions - pytest fixtures wrap each test in a transaction and roll back after (fast test cycles, no shared state between tests)
- **D-05:** With aggressive mocking, add 2-3 "smoke tests" using real PostgreSQL and Redis to catch mock drift from actual service behavior

#### Frontend Testing Approach
- **D-06:** Hybrid component testing - shallow rendering for prop validation (fast), full DOM rendering for user interactions (comprehensive)
- **D-07:** Use @testing-library/react for component testing - user-centric queries (`getByRole`, `getByText`), industry standard, actively maintained
- **D-08:** HTTP-level mocking for API calls - intercept fetch/axios to verify correct URLs, methods, and payloads
- **D-09:** Direct store testing for Zustand - import stores, call actions, verify state changes (no store mocking)
- **D-10:** Comprehensive interaction testing - test all states: loading, success, error, empty, disabled for each component

#### Integration & E2E Testing
- **D-11:** Comprehensive integration tests covering 6 user flows:
  - Authentication (OAuth callback → user creation → session)
  - Notebook lifecycle (create → edit → compile → publish → view)
  - Forking (fork → verify lineage → independent edits)
  - Social interactions (follow → like → comment → feed updates)
  - Search (publish → index → search → filter)
  - Feed (followed users → personalized feed → trending fallback)
- **D-12:** Comprehensive E2E tests with multiple scenarios per flow - happy path, error cases, edge cases using Playwright
- **D-13:** Chromium-only for E2E - Chrome and Edge only (both Chromium), covers 90%+ users with lowest maintenance overhead

#### CI/CD & Automation
- **D-14:** GitHub Actions only - build, test, lint, type check, security scan, and dependency check all in GitHub Actions (simple, free, excellent GitHub integration)
- **D-15:** Full parallel test execution - backend unit tests, frontend tests, integration tests, and E2E tests run simultaneously in separate jobs for fastest feedback (~5-10 min total despite 30+ min of tests)
- **D-16:** Strict failure policy for flaky tests - no automatic retries, any test failure fails the build (forces immediate fixes, maintains test integrity)
- **D-17:** Performance testing included in Phase 5 - load testing for APIs (k6 or Locust), performance budgets for frontend, ensures production-ready before deployment
- **D-18:** Comprehensive code quality gates - linting (ESLint, Black/Ruff), type checking (TypeScript, mypy), security scanning (Bandit, npm audit), dependency scanning (Dependabot alerts)

### Claude's Discretion

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

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within Phase 5 scope (testing and quality infrastructure). Performance monitoring and APM tools deferred to Phase 6 (Production Deployment).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEST-01 | Backend has unit tests for all API endpoints | Pytest with TestClient supports FastAPI endpoint testing; existing fixtures provide DB isolation; factory pattern enables flexible test data |
| TEST-02 | Frontend has component tests for UI components | Vitest + @testing-library/react configured; hybrid shallow/full DOM approach validates props and interactions; existing tests demonstrate pattern |
| TEST-03 | Integration tests cover key user flows | FastAPI TestClient + real PostgreSQL/Redis in Docker enables multi-endpoint flow testing; 6 major flows identified in CONTEXT.md |
| TEST-04 | E2E tests cover critical paths | Playwright with Next.js integration supports full browser automation; Chromium-only covers 90%+ users with minimal overhead |
| TEST-05 | Test suite runs automatically on CI/CD | GitHub Actions with parallel execution supports 4 test streams simultaneously; existing npm scripts (test, test:unit) provide entry points |
</phase_requirements>

## Standard Stack

### Core Testing Frameworks
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **pytest** | 9.0.2 | Python test runner | Industry standard for Python; async support via pytest-asyncio; fixture system for DB isolation; extensive plugin ecosystem |
| **pytest-asyncio** | 1.3.0 | Async test support | Required for FastAPI endpoint tests; auto mode enables seamless async/await testing |
| **Vitest** | 4.1.2 | Frontend test runner | Vite-native, faster than Jest; TypeScript support out-of-box; compatible with @testing-library/react; watch mode for DX |
| **@testing-library/react** | 16.3.2 | React component testing | User-centric queries; industry standard for 2025; excellent accessibility testing via getByRole |
| **Playwright** | Latest | E2E testing | Auto-waiting eliminates flakiness; cross-browser support; official Next.js integration; visual regression testing |
| **k6** | Latest | API load testing | JavaScript-based scripts (no Python context switch); built-in metrics; free and open-source; GitHub Actions integration |

### Supporting Tools
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **coverage.py** | Latest | Code coverage | Backend coverage reporting; 80%+ line coverage enforcement |
| **@vitest/coverage-v8** | Latest | Frontend coverage | Built-in Vitest coverage; Istanbul-based reports; threshold enforcement |
| **ESLint** | 9.x | Frontend linting | Already configured (next/core-web-vitals); catches common React errors |
| **Black** | Latest | Python formatting | Opinionated formatter; eliminates style debates; team consistency |
| **Ruff** | Latest | Python linting | Fast linter (10x faster than Flake8); replaces Flake8 + isort + pydocstyle |
| **mypy** | Latest | Python type checking | Catches type errors at test time; validates FastAPI Pydantic models |
| **Bandit** | Latest | Python security | Finds common security issues; integrates with pytest |
| **npm audit** | Latest | Frontend dependency security | Built-in npm security scanner; checks for vulnerabilities |
| **Dependabot** | Latest | Dependency updates | GitHub-native dependency monitoring; automated PRs for security updates |

### Installation

**Backend (add to requirements.txt):**
```bash
# Already installed: pytest==9.0.2, pytest-asyncio==1.3.0
# Add:
pytest-cov==5.0.0          # Coverage reporting
pytest-mock==3.14.0        # Mock fixtures
black==24.0.0              # Code formatting
ruff==0.9.0                # Fast linting
mypy==1.13.0               # Type checking
bandit==1.8.0              # Security scanning
```

**Frontend (add to package.json):**
```bash
# Already installed: vitest@4.1.2, @testing-library/react@16.3.2
# Add:
npm install -D \
  @playwright/test \
  @vitest/coverage-v8
```

**Performance testing:**
```bash
# k6 for API load testing (install separately or via GitHub Action)
# No npm package needed - uses k6 CLI
```

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| k6 | Locust | Locust is Python-native (fits stack) but k6 has simpler syntax, better CI integration, and Grafana ecosystem |
| Vitest | Jest | Vitest is Vite-native (faster), better TypeScript support, Jest is slower with additional config needed |
| Playwright | Cypress | Playwright is faster, auto-waiting eliminates flakiness, better multi-tab support; Cypress has slower execution and more flaky tests |
| Ruff | Flake8 + isort | Ruff is 10x faster, combines tools, fewer dependencies; Flake8 is more mature with larger plugin ecosystem |

**Version verification:**
```bash
# Backend versions (current as of 2026-04-05)
pytest==9.0.2 (released 2025-01, latest stable)
pytest-asyncio==1.3.0 (released 2025-01, compatible with pytest 9.x)
pytest-cov==5.0.0 (latest)
pytest-mock==3.14.0 (latest)
black==24.0.0 (latest)
ruff==0.9.0 (latest)
mypy==1.13.0 (latest)
bandit==1.8.0 (latest)

# Frontend versions (from package.json 2026-04-05)
vitest@4.1.2 (latest stable)
@testing-library/react@16.3.2 (latest)
@playwright/test@latest (auto-install via init)
@vitest/coverage-v8@latest (auto-install with vitest)
```

## Architecture Patterns

### Recommended Project Structure

```
backend/
├── tests/
│   ├── conftest.py              # Shared fixtures (DB, mocks, factories)
│   ├── test_factories.py         # Factory functions (create_user, create_notebook)
│   ├── unit/                     # Fast unit tests with mocks
│   │   ├── test_auth_service.py
│   │   ├── test_notebook_service.py
│   │   ├── test_fork_service.py
│   │   └── test_feed_service.py
│   ├── integration/              # Multi-endpoint tests with real DB/Redis
│   │   ├── test_auth_flow.py
│   │   ├── test_notebook_lifecycle.py
│   │   └── test_forking_flow.py
│   ├── e2e/                      # Full workflow tests
│   │   └── test_publish_workflow.py
│   └── performance/              # k6 scripts
│       ├── feed_load_test.js
│       └── compilation_load_test.js
├── .coveragerc                   # Coverage configuration
└── pyproject.toml                # Tool configuration (black, ruff, mypy)

frontend/
├── tests/
│   ├── setup.ts                  # Vitest setup (msw mocks, global config)
│   ├── components/               # Component tests (existing structure)
│   │   ├── auth/
│   │   ├── notebook/
│   │   ├── social/
│   │   └── search/
│   ├── integration/              # Multi-component flows
│   │   ├── auth-flow.test.tsx
│   │   └── notebook-flow.test.tsx
│   ├── e2e/                      # Playwright E2E tests
│   │   ├── auth.spec.ts
│   │   ├── notebook.spec.ts
│   │   ├── forking.spec.ts
│   │   └── search.spec.ts
│   └── utils/                    # Test utilities
│       ├── test-helpers.ts       # Custom render functions
│       └── mock-data.ts          # Mock API responses
├── playwright.config.ts          # Playwright configuration
├── vitest.config.ts              # Vitest configuration
└── .eslintrc.json                # ESLint configuration (exists)

.github/
└── workflows/
    ├── test-backend.yml          # Backend unit + integration tests
    ├── test-frontend.yml         # Frontend unit + integration tests
    ├── test-e2e.yml              # Playwright E2E tests
    ├── test-performance.yml      # k6 load tests
    ├── code-quality.yml          # Linting, type checking, security
    └── coverage.yml              # Coverage reporting (aggregate all)
```

### Pattern 1: Pytest Fixture Hierarchy for Database Isolation

**What:** Use pytest fixtures with function-scoped rollback transactions to ensure each test starts with a clean database state.

**When to use:** All backend tests that interact with the database.

**Example:**
```python
# conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.db.base import Base

@pytest.fixture(scope="function")
def db_session() -> Generator[Session, None, None]:
    """Create a fresh database session for each test with rollback."""
    engine = create_engine(
        "sqlite:///:memory:",  # Fast tests
        connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.rollback()  # Rollback to clean state
        session.close()
        engine.dispose()

# Test file
def test_create_notebook(db_session: Session):
    """Test notebook creation with clean DB state."""
    from app.services.notebook_service import NotebookService

    service = NotebookService(db_session)
    notebook = service.create_notebook(
        user_id=1,
        title="Test Notebook",
        description="Test description"
    )

    assert notebook.id is not None
    assert notebook.title == "Test Notebook"
    # DB automatically rolled back after test
```

**Source:** [pytest documentation](https://docs.pytest.org/en/stable/fixture.html)

### Pattern 2: Factory Functions for Test Data

**What:** Create factory functions that generate test data on-the-fly with sensible defaults, allowing tests to override only what matters.

**When to use:** Creating test users, notebooks, forks, likes, comments, etc.

**Example:**
```python
# tests/test_factories.py
from app.models.user import User
from app.models.notebook import Notebook
from app.models.like import Like
from sqlalchemy.orm import Session

def create_user(db: Session, **kwargs) -> User:
    """Factory function for creating test users."""
    defaults = {
        "oauth_provider": "google",
        "oauth_id": f"test-google-{uuid.uuid4()}",
        "username": f"testuser_{uuid.uuid4().hex[:8]}",
        "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
        "avatar_url": "https://example.com/avatar.jpg"
    }
    defaults.update(kwargs)

    user = User(**defaults)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def create_notebook(db: Session, user_id: int, **kwargs) -> Notebook:
    """Factory function for creating test notebooks."""
    defaults = {
        "user_id": user_id,
        "title": "Test Notebook",
        "description": "A test notebook",
        "is_published": False
    }
    defaults.update(kwargs)

    notebook = Notebook(**defaults)
    db.add(notebook)
    db.commit()
    db.refresh(notebook)
    return notebook

def create_fork(db: Session, parent_notebook_id: int, user_id: int, **kwargs) -> Notebook:
    """Factory function for creating test forks."""
    defaults = {
        "user_id": user_id,
        "title": "Forked Notebook",
        "description": "A forked notebook",
        "parent_id": parent_notebook_id,
        "root_id": kwargs.get("root_id", parent_notebook_id),
        "is_published": False
    }
    defaults.update(kwargs)

    fork = Notebook(**defaults)
    db.add(fork)
    db.commit()
    db.refresh(fork)
    return fork

# Test file
def test_fork_increments_fork_count(db_session: Session):
    """Test that forking increments the parent's fork count."""
    from app.services.fork_service import ForkService

    user = create_user(db_session)
    parent = create_notebook(db_session, user.id, is_published=True)

    service = ForkService(db_session)
    fork = service.fork_notebook(parent.id, user.id)

    assert fork.parent_id == parent.id
    assert fork.root_id == parent.root_id
```

**Source:** Factory pattern standard in testing, adapted from [Factory Boy pattern](https://factoryboy.readthedocs.io/)

### Pattern 3: Vitest + React Testing Library Component Tests

**What:** Use @testing-library/react with Vitest for user-centric component testing, mocking stores and API calls.

**When to use:** Testing React components (all frontend components).

**Example:**
```typescript
// tests/components/social/CommentForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from '@/components/social/CommentForm';

// Mock API calls
vi.mock('@/lib/api', () => ({
  postComment: vi.fn(() => Promise.resolve({ id: 1, content: 'Test comment' }))
}));

describe('CommentForm', () => {
  it('renders comment input and submit button', () => {
    render(<CommentForm notebookId={1} onSuccess={vi.fn()} />);

    expect(screen.getByPlaceholderText(/write a comment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /post/i })).toBeInTheDocument();
  });

  it('submits comment when user types and clicks post', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(<CommentForm notebookId={1} onSuccess={onSuccess} />);

    await user.type(
      screen.getByPlaceholderText(/write a comment/i),
      'Great notebook!'
    );
    await user.click(screen.getByRole('button', { name: /post/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('shows validation error for empty comment', async () => {
    const user = userEvent.setup();

    render(<CommentForm notebookId={1} onSuccess={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: /post/i }));

    expect(screen.getByText(/comment cannot be empty/i)).toBeInTheDocument();
  });
});
```

**Source:** [@testing-library/react documentation](https://testing-library.com/docs/react-testing-library/intro/)

### Pattern 4: Playwright E2E Tests for Next.js

**What:** Use Playwright to test full user flows in a real browser, from authentication through notebook creation to viewing.

**When to use:** Testing critical user journeys that span multiple pages and components.

**Example:**
```typescript
// tests/e2e/notebook.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Notebook Lifecycle', () => {
  test('user can create, edit, compile, and publish notebook', async ({ page }) => {
    // 1. Navigate to notebooks page
    await page.goto('/notebooks');
    await expect(page.getByRole('heading', { name: /my notebooks/i })).toBeVisible();

    // 2. Click "New Notebook"
    await page.getByRole('button', { name: /new notebook/i }).click();
    await expect(page.getByRole('heading', { name: /untitled notebook/i })).toBeVisible();

    // 3. Edit notebook title
    await page.getByRole('textbox', { name: /title/i }).fill('My First Notebook');
    await page.getByRole('button', { name: /save/i }).click();

    // 4. Add code cell
    await page.getByRole('button', { name: /add code cell/i }).click();
    await page.getByRole('textbox').fill('print("Hello, World!")');

    // 5. Compile notebook
    await page.getByRole('button', { name: /compile/i }).click();
    await expect(page.getByText(/compiling/i)).toBeVisible();
    await expect(page.getByText(/compilation complete/i)).toBeVisible({ timeout: 30000 });

    // 6. Publish notebook
    await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('button', { name: /confirm publish/i }).click();

    // 7. Verify notebook appears in feed
    await page.goto('/');
    await expect(page.getByText('My First Notebook')).toBeVisible();
    await expect(page.getByText(/by testuser/i)).toBeVisible();
  });
});
```

**Source:** [Playwright documentation](https://playwright.dev/docs/intro)

### Pattern 5: k6 API Load Testing

**What:** Use k6 to simulate load on API endpoints and verify performance under stress.

**When to use:** Performance testing critical endpoints (feed, notebook compilation, search).

**Example:**
```javascript
// tests/performance/feed_load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
  },
};

const BASE_URL = 'http://localhost:8000';

export default function () {
  // Test feed endpoint
  const response = http.get(`${BASE_URL}/api/v1/feed`);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response has notebooks': (r) => JSON.parse(r.body).notebooks.length >= 0,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

**Source:** [k6 documentation](https://k6.io/docs/)

### Anti-Patterns to Avoid

- **Testing implementation details:** Don't test component internals (state, methods). Test what users see and interact with.
- **Flaky E2E tests:** Avoid hard-coded waits (`sleep(5000)`). Use Playwright's auto-waiting (`await expect(...).toBeVisible()`).
- **Mocking everything:** Don't mock the code you're testing. Mock only external dependencies (APIs, services).
- **Brittle selectors:** Avoid CSS class selectors (`.btn-primary`) that change. Use user-centric queries (`getByRole('button', { name: /submit/i })`).
- **Shared test state:** Never rely on tests running in a specific order. Each test must be independent.
- **Testing third-party code:** Don't test React, FastAPI, or library functionality. Test your code that uses these libraries.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test runner | Custom test execution | pytest, Vitest | Fixtures, assertions, parallel execution, coverage built-in |
| HTTP mocking | Mock fetch/axios manually | MSW (Mock Service Worker) | API mocking at network level, works for all HTTP libraries |
| DB isolation | Manual cleanup | pytest rollback fixtures | Automatic cleanup, fast, no shared state |
| Browser automation | Selenium, Puppeteer scripts | Playwright | Auto-waiting, cross-browser, faster, less flaky |
| Code coverage | Custom coverage tracking | coverage.py, @vitest/coverage-v8 | Industry standard, HTML reports, threshold enforcement |
| Load testing | Custom concurrent requests | k6 | Built-in metrics, thresholds, scripting in JS |
| Type checking | Manual type verification | mypy, TypeScript | Catches errors at dev time, better DX |
| Linting | Manual code review | ESLint, Ruff | Automated, consistent, catches common errors |
| Security scanning | Manual security review | Bandit, npm audit | Finds known vulnerabilities, automated |

**Key insight:** Testing infrastructure is a solved problem. Building custom test runners, mocks, or coverage tools wastes engineering time and creates maintenance burden. Use industry-standard tools that integrate with CI/CD and provide good DX.

## Common Pitfalls

### Pitfall 1: Flaky E2E Tests Due to Race Conditions

**What goes wrong:** Tests fail intermittently due to timing issues (element not found, network request not finished).

**Why it happens:** Hard-coded sleeps (`page.waitForTimeout(5000)`) or missing awaits create race conditions where tests proceed before the UI is ready.

**How to avoid:**
- Use Playwright's auto-waiting: `await expect(page.getByText('...')).toBeVisible()`
- Avoid hard-coded waits; use locators with built-in waiting
- Test for visible state, not existence: `getByText` → `toBeVisible()`, not just `toBeInTheDocument()`

**Warning signs:** Tests pass locally but fail in CI; tests fail then pass on retry; adding sleeps "fixes" tests.

### Pitfall 2: Slow Tests Due to Lack of Parallelization

**What goes wrong:** Test suite takes 30+ minutes to run, reducing developer velocity and slowing down PRs.

**Why it happens:** Tests run sequentially instead of in parallel; no parallelization at test runner or CI level.

**How to avoid:**
- Use pytest-xdist for backend: `pytest -n auto` runs tests in parallel across CPU cores
- Configure Vitest with `--threads` flag: `vitest --threads --no-coverage`
- Use GitHub Actions matrix strategy to run backend/frontend/E2E tests simultaneously
- Split slow E2E tests into shards: `npx playwright test --shard=1/4`

**Warning signs:** Developers avoid running tests locally; PRs sit in queue for 20+ minutes; tests run slower than development.

### Pitfall 3: Mock Drift from Real Services

**What goes wrong:** Tests pass but production fails because mocks don't match real service behavior.

**Why it happens:** Mocks return hardcoded responses that don't evolve with API changes; no integration tests with real services.

**How to avoid:**
- Add 2-3 smoke tests that use real PostgreSQL and Redis (no mocks)
- Update mocks when API contracts change
- Use contract testing (e.g., Pact) for external APIs
- Run smoke tests in CI to catch mock drift early

**Warning signs:** Integration tests fail but unit tests pass; production bugs that "should have been caught"; mocks returning static data forever.

### Pitfall 4: Testing Implementation Details Instead of Behavior

**What goes wrong:** Tests break when refactoring code without changing behavior, creating maintenance burden.

**Why it happens:** Testing component internals (state, methods) instead of what users see and do.

**How to avoid:**
- Test user behavior: "Click button → form submits → success message appears"
- Avoid testing state: `expect(component.state.isLoading).toBe(true)`
- Use @testing-library/react queries: `getByRole`, `getByText`, not `getByTestId`
- Test outputs, not inputs: verify DOM changes, not function calls

**Warning signs:** Tests break after refactoring; tests know too much about component internals; mocking private methods.

### Pitfall 5: Coverage Metrics Without Quality

**What goes wrong:** High coverage numbers (90%+) but tests miss critical bugs; developers game coverage with useless tests.

**Why it happens:** Focusing on line coverage instead of test quality; testing branches without testing scenarios.

**How to avoid:**
- Prioritize critical paths over comprehensive coverage
- Add assertion quality checks: every test must assert something meaningful
- Use branch coverage alongside line coverage
- Review tests in PRs, not just coverage numbers

**Warning signs:** Tests with no assertions; tests that just call functions without checking results; coverage targets met but bugs slip through.

## Code Examples

Verified patterns from official sources:

### Backend Unit Test with FastAPI TestClient

```python
# tests/unit/test_notebook_service.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_create_notebook_authenticated(auth_headers, test_user):
    """Test notebook creation with authenticated user."""
    response = client.post(
        "/api/v1/notebooks",
        json={"title": "Test Notebook", "description": "Test"},
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Notebook"
    assert data["user_id"] == test_user["id"]

def test_create_notebook_unauthenticated():
    """Test notebook creation fails without authentication."""
    response = client.post(
        "/api/v1/notebooks",
        json={"title": "Test Notebook", "description": "Test"}
    )

    assert response.status_code == 401
```

**Source:** [FastAPI Testing Documentation](https://fastapi.tiangolo.com/tutorial/testing/)

### Frontend Component Test with User Interactions

```typescript
// tests/components/notebook/NotebookEditor.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotebookEditor } from '@/components/notebook/NotebookEditor';

describe('NotebookEditor', () => {
  it('adds code cell when button clicked', async () => {
    const user = userEvent.setup();
    render(<NotebookEditor notebookId={1} />);

    await user.click(screen.getByRole('button', { name: /add code cell/i }));

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: /code/i })).toBeInTheDocument();
    });
  });

  it('saves notebook when user types and clicks save', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(<NotebookEditor notebookId={1} onSave={onSave} />);

    await user.type(screen.getByRole('textbox', { name: /title/i }), 'My Notebook');
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Notebook' })
      );
    });
  });
});
```

**Source:** [@testing-library/user-event documentation](https://testing-library.com/docs/user-event/intro/)

### Integration Test for Multi-Step Flow

```python
# tests/integration/test_notebook_lifecycle.py
def test_notebook_publishing_workflow(db_session, test_user, auth_headers):
    """Test full workflow: create → edit → compile → publish."""
    from app.services.notebook_service import NotebookService
    from app.services.compilation_service import CompilationService
    from unittest.mock import patch

    # 1. Create notebook
    response = client.post(
        "/api/v1/notebooks",
        json={"title": "Test Notebook", "description": "Test"},
        headers=auth_headers
    )
    notebook_id = response.json()["id"]

    # 2. Add cell
    response = client.post(
        f"/api/v1/notebooks/{notebook_id}/cells",
        json={"cell_type": "code", "content": "print('hello')"},
        headers=auth_headers
    )
    assert response.status_code == 201

    # 3. Compile (mock container execution)
    with patch("app.services.compilation_service.ContainerExecutor"):
        response = client.post(
            f"/api/v1/notebooks/{notebook_id}/compile",
            headers=auth_headers
        )
        assert response.status_code == 200

    # 4. Publish
    response = client.post(
        f"/api/v1/notebooks/{notebook_id}/publish",
        headers=auth_headers
    )
    assert response.status_code == 200
    assert response.json()["is_published"] is True

    # 5. Verify in feed
    response = client.get("/api/v1/feed")
    assert any(nb["id"] == notebook_id for nb in response.json()["notebooks"])
```

**Source:** [FastAPI Advanced Testing](https://fastapi.tiangolo.com/tutorial/advanced-testing/)

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest for React | Vitest | 2023-2024 | 10x faster, native ESM support, better TypeScript integration |
| Selenium for E2E | Playwright | 2021-2022 | Auto-waiting eliminates flakiness, faster execution, cross-browser consistency |
| pytest fixtures with class scope | Function-scoped rollback transactions | 2020-2021 | Faster tests, no shared state, parallel execution safe |
| Coverage by line only | Line + branch coverage | 2022-2023 | Better quality metric, catches untested code paths |
| Sequential CI execution | Parallel matrix execution | 2021-2022 | 5-10x faster feedback, better resource utilization |
| Manual performance testing | Automated k6 scripts | 2020-2021 | Regression detection, performance budgets, CI integration |

**Deprecated/outdated:**
- **Jest for React projects:** Replaced by Vitest for Vite-based projects (better performance, TypeScript support)
- **Enzyme for React testing:** Replaced by @testing-library/react (user-centric vs implementation-centric)
- **Selenium for E2E:** Replaced by Playwright (auto-waiting, faster, more reliable)
- **Coverage by line counting only:** Modern tools support branch coverage, which is more meaningful
- **pytest-xdist for all tests:** Use selectively (only unit tests), not for integration tests that need shared DB

## Open Questions

1. **Test execution time targets for CI/CD**
   - What we know: GitHub Actions with parallel execution should complete in 5-10 minutes
   - What's unclear: Exact timeout thresholds for each test suite (backend unit, frontend unit, E2E, performance)
   - Recommendation: Set initial targets at 5 min for unit tests, 10 min for E2E, adjust based on actual execution times

2. **Performance budget thresholds**
   - What we know: Performance tests should enforce budgets (API p95 < 500ms, frontend LCP < 2.5s)
   - What's unclear: Whether to include performance degradation tests (e.g., "response time doesn't double under load")
   - Recommendation: Start with absolute thresholds (p95 < 500ms), add degradation tests in Wave 2 if time permits

3. **Test data management for complex multi-user flows**
   - What we know: Factory pattern exists for single users, notebooks, forks
   - What's unclear: How to handle complex fork chains with multiple users in integration/E2E tests
   - Recommendation: Create `create_fork_chain` factory that generates parent → child → grandchild with different users

4. **Screenshot testing for visual regression**
   - What we know: Playwright supports screenshot testing, but it's optional per CONTEXT.md
   - What's unclear: Whether to prioritize screenshot tests over functional tests
   - Recommendation: Defer screenshot testing to Wave 2 or post-launch; focus on functional E2E tests first

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| **Python** | Backend testing | ✓ | 3.9.6 | — |
| **pytest** | Backend unit tests | ✗ | — | Install via pip: `pip install pytest==9.0.2` |
| **pytest-asyncio** | Async endpoint tests | ✗ | — | Install via pip: `pip install pytest-asyncio==1.3.0` |
| **Node.js** | Frontend testing | ✓ | v25.6.1 | — |
| **Vitest** | Frontend unit tests | ✓ | 4.1.2 | — |
| **@testing-library/react** | Component tests | ✓ | 16.3.2 | — |
| **Playwright** | E2E tests | ✗ | — | Install via npm: `npm install -D @playwright/test` |
| **k6** | Load testing | ✗ | — | Install via brew/apt or GitHub Action |
| **PostgreSQL** | Integration tests | ✗ | — | Use Docker Compose service |
| **Redis** | Integration tests | ✗ | — | Use Docker Compose service |
| **GitHub Actions** | CI/CD automation | N/A | — | Available in GitHub (no local install needed) |

**Missing dependencies with no fallback:**
- None — all missing tools can be installed via pip/npm or Docker

**Missing dependencies with fallback:**
- Playwright: Can defer E2E tests to Wave 2, but no real alternative for browser automation
- k6: Can defer performance tests to Wave 2, or use alternative (Locust) if Python preference is stronger
- PostgreSQL/Redis: Use Docker Compose services for integration tests (existing docker-compose.yml can be extended)

**Installation commands for missing dependencies:**
```bash
# Backend
pip install pytest==9.0.2 pytest-asyncio==1.3.0 pytest-cov==5.0.0 pytest-mock==3.14.0
pip install black==24.0.0 ruff==0.9.0 mypy==1.13.0 bandit==1.8.0

# Frontend
npm install -D @playwright/test @vitest/coverage-v8
npx playwright install chromium  # Install Chromium browser

# Performance testing (optional)
brew install k6  # macOS
# OR use GitHub Action (no local install needed)
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend Framework | pytest 9.0.2 with pytest-asyncio 1.3.0 |
| Frontend Framework | Vitest 4.1.2 with @testing-library/react 16.3.2 |
| E2E Framework | Playwright (latest) with Chromium-only |
| Config files | `backend/pytest.ini`, `frontend/vitest.config.ts` |
| Quick run command | `pytest tests/unit -v` (backend), `vitest run` (frontend) |
| Full suite command | `pytest` (backend), `vitest run --coverage` (frontend), `npx playwright test` (E2E) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TEST-01 | Backend has unit tests for all API endpoints | unit | `pytest tests/unit -v --cov=app --cov-report=term` | ✅ Partial (8 test files exist, need 20+ more) |
| TEST-02 | Frontend has component tests for UI components | unit | `vitest run --coverage` | ✅ Partial (3 test files exist, need 30+ more) |
| TEST-03 | Integration tests cover key user flows | integration | `pytest tests/integration -v -m integration` | ❌ Wave 0 - create tests/ directory |
| TEST-04 | E2E tests cover critical paths | e2e | `npx playwright test` | ❌ Wave 0 - create playwright.config.ts |
| TEST-05 | Test suite runs automatically on CI/CD | automation | GitHub Actions workflow | ❌ Wave 0 - create .github/workflows/ |

### Sampling Rate
- **Per task commit:** `pytest tests/unit -v` (backend), `vitest run` (frontend) — quick smoke test
- **Per wave merge:** `pytest --cov=app` + `vitest run --coverage` + `npx playwright test` — full suite
- **Phase gate:** Full suite green + 80%+ coverage + all quality gates passing before `/gsd:verify-work`

### Wave 0 Gaps

**Backend Testing:**
- [ ] `tests/unit/test_auth_service.py` — covers AUTH-01, AUTH-02, AUTH-05
- [ ] `tests/unit/test_notebook_service.py` — covers NOTE-01, NOTE-02, NOTE-06, NOTE-07
- [ ] `tests/unit/test_fork_service.py` — covers FORK-01, FORK-02, FORK-03, FORK-05
- [ ] `tests/unit/test_social_service.py` — covers SOC-01, SOC-02, SOC-03, SOC-04
- [ ] `tests/unit/test_search_service.py` — covers DISC-03, DISC-04
- [ ] `tests/unit/test_feed_service.py` — covers DISC-01, DISC-02, DISC-05
- [ ] `tests/unit/test_profile_service.py` — covers PROF-01 through PROF-06
- [ ] `tests/integration/` — directory for integration tests (6 user flows from D-11)
- [ ] `tests/test_factories.py` — factory functions for test data (create_user, create_notebook, create_fork, etc.)
- [ ] `backend/.coveragerc` — coverage configuration (omit tests/, migrations/, __init__.py)
- [ ] `backend/pyproject.toml` — tool configuration (black, ruff, mypy, bandit)

**Frontend Testing:**
- [ ] `tests/components/auth/` — OAuthButton, ProtectedRoute tests
- [ ] `tests/components/notebook/` — NotebookEditor, NotebookCard tests
- [ ] `tests/components/social/` — LikeButton, CommentForm, FollowButton tests
- [ ] `tests/components/search/` — SearchBar, FilterTabs tests
- [ ] `tests/integration/` — multi-component flow tests (auth flow, notebook creation flow)
- [ ] `tests/e2e/` — Playwright E2E tests (6 major flows)
- [ ] `frontend/playwright.config.ts` — Playwright configuration (Chromium-only, test server setup)
- [ ] `frontend/vitest.config.ts` — extend with coverage settings, test matchers
- [ ] `tests/setup.ts` — Vitest setup (global mocks, test utilities)

**CI/CD & Quality:**
- [ ] `.github/workflows/test-backend.yml` — backend unit + integration tests
- [ ] `.github/workflows/test-frontend.yml` — frontend unit + integration tests
- [ ] `.github/workflows/test-e2e.yml` — Playwright E2E tests
- [ ] `.github/workflows/test-performance.yml` — k6 load tests
- [ ] `.github/workflows/code-quality.yml` — linting, type checking, security scanning
- [ ] `.github/workflows/coverage.yml` — aggregate coverage reports
- [ ] `backend/.github/` or `frontend/.github/` — code quality configs (if project-level not desired)

**Performance Testing:**
- [ ] `tests/performance/feed_load_test.js` — k6 script for feed endpoint
- [ ] `tests/performance/compilation_load_test.js` — k6 script for compilation endpoint
- [ ] `tests/performance/search_load_test.js` — k6 script for search endpoint
- [ ] `tests/performance/lighthouse-budget.json` — Lighthouse CI performance budgets (LCP < 2.5s, FID < 100ms)

**Framework install:**
```bash
# Backend (add to requirements.txt)
pip install pytest==9.0.2 pytest-asyncio==1.3.0 pytest-cov==5.0.0 pytest-mock==3.14.0
pip install black==24.0.0 ruff==0.9.0 mypy==1.13.0 bandit==1.8.0

# Frontend (add to package.json)
npm install -D @playwright/test @vitest/coverage-v8
npx playwright install chromium
```

## Sources

### Primary (HIGH confidence)
- [pytest documentation](https://docs.pytest.org/) - Fixtures, markers, async testing
- [FastAPI Testing Guide](https://fastapi.tiangolo.com/tutorial/testing/) - TestClient usage, dependency overrides
- [Vitest documentation](https://vitest.dev/) - Configuration, test runners, coverage
- [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) - User-centric queries, best practices
- [Playwright documentation](https://playwright.dev/docs/intro) - E2E testing, auto-waiting, selectors
- [k6 documentation](https://k6.io/docs/) - Load testing, thresholds, scripting
- [GitHub Actions Documentation](https://docs.github.com/en/actions) - Workflow syntax, matrix strategy, caching

### Secondary (MEDIUM confidence)
- [pytest-asyncio documentation](https://pytest-asyncio.readthedocs.io/) - Async test configuration
- [Vite React Plugin](https://github.com/vitejs/vite-plugin-react) - Vitest + React setup
- [Next.js Testing Guide](https://nextjs.org/docs/testing) - Playwright for Next.js, testing best practices
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) - Anti-patterns to avoid
- [GitHub Actions Testing Strategy](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstrategymatrix) - Parallel execution patterns

### Tertiary (LOW confidence)
- Web searches returned empty/rate-limited; relied on official documentation and existing codebase patterns
- All testing patterns verified against official documentation (HIGH confidence)
- No unverified claims presented as facts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All frameworks (pytest, Vitest, Playwright, k6) are industry-standard with official documentation
- Architecture: HIGH - Existing test infrastructure from Phases 1-4 provides proven patterns; fixtures and factories are well-established
- Pitfalls: HIGH - All pitfalls documented are well-known in testing community with clear prevention strategies
- CI/CD: MEDIUM - GitHub Actions patterns are standard, but specific workflow structure requires validation during implementation

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days - testing infrastructure evolves slowly, frameworks are stable)

**Next steps for planner:**
1. Use factory pattern (create_user, create_notebook, create_fork) as template for all test data
2. Organize tests by domain: backend unit → frontend unit → integration → E2E → performance → CI/CD
3. Implement GitHub Actions with parallel execution from Wave 0 to catch issues early
4. Target 80%+ line coverage but prioritize test quality over coverage numbers
5. Use rollback transactions for DB isolation, aggressive mocking for external services
6. Add 2-3 smoke tests with real PostgreSQL/Redis to catch mock drift
