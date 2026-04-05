# NotebookSocial

A social media platform where Python notebooks are the content. Users create notebooks using a WASM-powered editor (Pyodide), compile them in isolated containers, and publish pre-rendered outputs to an Instagram-style social feed. Viewers can browse notebook listings, click to see full rendered notebooks with charts and videos, and fork notebooks to create their own versions. Forks have equal weightage in the feed, making remixing a core social action.

## CI/CD Status

[![CI](https://github.com/YOUR_USERNAME/time/actions/workflows/ci.yml/badge.svg)](https://github.com/YOUR_USERNAME/time/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/time/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/time)
[![Code Quality](https://github.com/YOUR_USERNAME/time/actions/workflows/code-quality.yml/badge.svg)](https://github.com/YOUR_USERNAME/time/actions/workflows/code-quality.yml)

## Core Value

**Interactive + social** — make computational knowledge shareable and remixable, with forking as a first-class social action.

## Technology Stack

### Frontend
- **Next.js 16** - Full-stack React framework with Server Components
- **React 19** - UI library with concurrent features
- **TypeScript 6** - Type safety and better DX
- **Tailwind CSS 4** - Utility-first CSS with JIT mode
- **shadcn/ui** - Accessible component library built on Radix UI
- **Zustand** - Lightweight state management
- **Pyodide** - Python WASM runtime for browser-based editing
- **Monaco Editor** - VS Code editor component

### Backend
- **FastAPI 0.135** - Async Python web framework
- **SQLAlchemy 2.0** - Async ORM for PostgreSQL
- **PostgreSQL 17** - Primary database with JSONB support
- **Redis 7.4** - Cache and message broker
- **Celery 5.6** - Task queue for background jobs
- **python-jose** - JWT authentication
- **Docker SDK** - Container execution for notebook compilation

### Testing
- **pytest** - Backend unit and integration tests
- **Vitest** - Frontend component tests
- **Playwright** - E2E testing with Chromium
- **GitHub Actions** - CI/CD automation

## Development

### Prerequisites

- Python 3.9+
- Node.js 25+
- Docker and Docker Compose
- PostgreSQL 17+
- Redis 7.4+

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/time.git
   cd time
   ```

2. **Backend setup**
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   uvicorn app.main:app --reload
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Start services**
   ```bash
   docker-compose up -d postgres redis
   ```

## Testing

### Running Tests Locally

**Backend tests:**
```bash
cd backend
# Unit tests (parallel)
pytest tests/unit -n auto

# Integration tests
pytest tests/integration -m integration

# With coverage
pytest --cov=app --cov-report=html
```

**Frontend tests:**
```bash
cd frontend
# Component tests
npm run test

# With coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

**E2E tests:**
```bash
cd frontend
# Install Playwright browsers
npx playwright install --with-deps chromium

# Run E2E tests
npm run test:e2e

# UI mode (debugging)
npm run test:e2e:ui
```

### Viewing Coverage Reports

**Backend coverage:**
```bash
cd backend
pytest --cov=app --cov-report=html
open htmlcov/index.html
```

**Frontend coverage:**
```bash
cd frontend
npm run test:coverage
open coverage/index.html
```

### Code Quality Checks

**Backend:**
```bash
cd backend
# Format code
black .

# Lint
ruff check .

# Type check
mypy app

# Security scan
bandit -r app/
```

**Frontend:**
```bash
cd frontend
# Lint
npm run lint

# Type check
npx tsc --noEmit

# Security audit
npm audit
```

## CI/CD

### Workflow Structure

Our CI/CD pipeline uses GitHub Actions with the following workflows:

1. **ci.yml** - Main CI orchestrator
   - Runs all test types in parallel
   - Backend tests (unit + integration)
   - Frontend tests (component + store)
   - E2E tests (Playwright with 4 shards)
   - Code quality checks
   - Coverage aggregation

2. **test-backend.yml** - Backend tests
   - Unit tests with pytest-xdist (parallel)
   - Integration tests with PostgreSQL and Redis
   - Coverage reporting to Codecov

3. **test-frontend.yml** - Frontend tests
   - Component tests with Vitest
   - Store tests for Zustand
   - Coverage reporting to Codecov

4. **test-e2e.yml** - E2E tests
   - Playwright tests with sharding (4 parallel jobs)
   - Backend server startup
   - Screenshot and trace uploads on failure

5. **code-quality.yml** - Quality gates
   - Black formatting check
   - Ruff linting
   - mypy type checking
   - Bandit security scanning
   - ESLint
   - TypeScript compiler
   - npm audit

6. **coverage.yml** - Coverage aggregation
   - Merges backend and frontend coverage
   - Checks thresholds (80% lines, 70% branches)
   - Posts coverage reports to PRs

### Parallel Execution

All tests run in parallel for fast feedback:
- Backend unit tests: ~5 min (pytest-xdist)
- Frontend tests: ~3 min (Vitest parallel)
- Integration tests: ~7 min (sequential, requires DB)
- E2E tests: ~10 min (4 shards in parallel)
- **Total CI time: ~10-15 min**

### Coverage Thresholds

- **Lines:** 80% minimum
- **Branches:** 70% minimum
- Build fails if thresholds not met

### Quality Gates

All quality checks must pass before merge:
- ✅ Code formatted (Black)
- ✅ No linting errors (Ruff, ESLint)
- ✅ No type errors (mypy, TypeScript)
- ✅ No high-severity security issues (Bandit, npm audit)
- ✅ All tests passing
- ✅ Coverage thresholds met

## Debugging CI Failures

### View Test Logs

1. Go to the failed workflow run
2. Click on the failed job
3. Expand the failed step to view logs

### Download Artifacts

1. Scroll to the "Artifacts" section at the bottom of the workflow run
2. Download relevant artifacts:
   - `backend-test-results` - JUnit XML reports
   - `frontend-coverage-report` - HTML coverage reports
   - `playwright-screenshots` - Screenshots on failure
   - `playwright-trace` - Trace files for debugging

### Reproduce Locally

**Backend test failure:**
```bash
cd backend
pytest tests/unit/test_specific_file.py -v
```

**Frontend test failure:**
```bash
cd frontend
npm run test -- test-specific-file.test.tsx
```

**E2E test failure:**
```bash
cd frontend
# Run specific test file
npx playwright test test-specific.spec.ts --headed

# Debug mode
npx playwright test --debug
```

### Common Failure Patterns

1. **Flaky tests**
   - E2E tests have 1 retry for network issues
   - If flaky, investigate timing dependencies
   - Use explicit waits instead of sleep

2. **Timeout issues**
   - Backend tests: 15 min timeout
   - Frontend tests: 10 min timeout
   - E2E tests: 20 min timeout
   - Check for infinite loops or slow operations

3. **Dependency conflicts**
   - Delete `package-lock.json` and run `npm install`
   - Delete `~/.cache/pip` and reinstall Python packages

4. **Rate limiting**
   - GitHub Actions has rate limits for some APIs
   - Use caching to reduce API calls

## Project Structure

```
time/
├── backend/               # FastAPI backend
│   ├── app/              # Application code
│   ├── tests/            # Backend tests
│   └── alembic/          # Database migrations
├── frontend/             # Next.js frontend
│   ├── app/              # App router pages
│   ├── components/       # React components
│   ├── stores/           # Zustand stores
│   └── tests/            # Frontend tests
├── .github/              # GitHub Actions workflows
│   └── workflows/        # CI/CD workflows
└── docker-compose.yml    # Local development services
```

## Contributing

### PR Requirements

- ✅ All tests must pass
- ✅ Coverage must not decrease
- ✅ No lint violations
- ✅ No security vulnerabilities
- ✅ Code formatted (Black, Prettier)
- ✅ Type checking passes

### Development Workflow

1. Create a feature branch
2. Make changes and commit
3. Push to GitHub
4. CI/CD runs automatically
5. Fix any failures
6. Request review
7. Merge after approval

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built with:
- [FastAPI](https://fastapi.tiangolo.com/)
- [Next.js](https://nextjs.org/)
- [Pyodide](https://pyodide.org/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Playwright](https://playwright.dev/)
