# CI/CD Documentation

**Phase:** 05 - Testing & Quality
**Plan:** 05-06 - CI/CD automation
**Created:** 2026-04-05

## Overview

This document describes the CI/CD infrastructure for NotebookSocial, including workflow triggers, parallel job structure, timeout durations, artifact retention, quality gates, and failure debugging.

## Workflow Structure

### Main CI Workflow (ci.yml)

**Purpose:** Orchestrates all test types in parallel for fast feedback

**Trigger Conditions:**
- Push to `main` branch
- Pull request to `main` branch

**Concurrency Control:**
- Cancels in-progress runs for same branch
- Group: `${{ github.workflow }}-${{ github.ref }}`

**Jobs:**

1. **backend-tests** (15 min timeout)
   - Runs unit and integration tests
   - Uses pytest-xdist for parallel unit test execution
   - PostgreSQL and Redis services
   - Coverage upload to Codecov
   - Test results upload as artifacts

2. **frontend-tests** (10 min timeout)
   - Runs component and store tests
   - Vitest with coverage reporting
   - Coverage upload to Codecov
   - Coverage artifacts for review

3. **e2e-tests** (20 min timeout)
   - Playwright E2E tests with Chromium
   - PostgreSQL and Redis services
   - Backend server startup with health check
   - Screenshot and trace uploads on failure

4. **code-quality** (10 min timeout)
   - Black, Ruff, mypy, Bandit (backend)
   - ESLint, TypeScript, npm audit (frontend)
   - All quality checks run in parallel

5. **coverage-aggregation** (depends on test jobs)
   - Downloads coverage artifacts
   - Generates coverage summary
   - Posts PR comment with coverage results

6. **status-check** (depends on all jobs)
   - Requires all jobs to pass
   - Final gate before merge

### Test Workflows

#### test-backend.yml

**Jobs:**

1. **backend-unit** (10 min timeout)
   - Parallel execution via pytest-xdist (`-n auto`)
   - Coverage: 70% minimum
   - JUnit XML report upload
   - Coverage upload to Codecov

2. **backend-integration** (15 min timeout)
   - Sequential execution (requires database)
   - PostgreSQL and Redis services
   - Database migrations via Alembic
   - Integration coverage (appended)

3. **test-summary** (depends on unit and integration)
   - Aggregates test results
   - Posts PR comment with results

#### test-frontend.yml

**Jobs:**

1. **frontend-component** (10 min timeout)
   - Vitest component tests
   - Coverage reporting (JSON + HTML)
   - Coverage upload to Codecov

2. **frontend-store** (5 min timeout)
   - Zustand store tests
   - JUnit XML report upload

3. **test-summary** (depends on component and store)
   - Aggregates test results
   - Posts PR comment with results

**Note:** UI mode commented out (not for CI). To run locally: `npm run test:ui`

#### test-e2e.yml

**Jobs:**

1. **e2e-tests** (20 min timeout, matrix strategy)
   - 4 shards for parallel execution
   - Matrix: `shard: [1/4, 2/4, 3/4, 4/4]`
   - `fail-fast: false` (all shards run)
   - Limited retries: 1 (per D-16 strict policy)
   - Screenshot, trace, video uploads on failure

2. **e2e-summary** (depends on all shards)
   - Merges Playwright reports from all shards
   - Uploads combined report
   - Posts PR comment with results

### Quality Gate Workflow (code-quality.yml)

**Jobs:**

1. **backend-lint** - Black formatting check
2. **backend-lint-ruff** - Ruff linting (E, F, W)
3. **backend-typecheck** - mypy type checking
4. **backend-security** - Bandit security scan
5. **frontend-lint** - ESLint
6. **frontend-typecheck** - TypeScript compiler
7. **frontend-security** - npm audit
8. **dependency-check** - Outdated package check

**All jobs run independently** (no dependencies between them)

**lint-summary** job:
- Aggregates all results
- Posts PR comment with pass/fail status
- Fails if any critical check fails

### Coverage Aggregation Workflow (coverage.yml)

**Trigger:**
- On completion of Test Backend and Test Frontend workflows
- On pull_request events

**Steps:**

1. Download coverage artifacts from all test jobs
2. Parse coverage percentages from XML and JSON
3. Calculate overall coverage (average of backend and frontend)
4. Check thresholds:
   - Lines: 80% minimum
   - Branches: 70% minimum
5. Fail if thresholds not met
6. Generate coverage badge
7. Post detailed report as PR comment
8. Upload combined coverage and HTML reports

## Coverage Thresholds

| Type       | Backend | Frontend | Overall |
|------------|---------|----------|---------|
| Lines      | 80%     | 80%      | 80%     |
| Branches   | 70%     | 70%      | 70%     |
| Functions  | 80%     | 80%      | 80%     |
| Statements | 80%     | 80%      | 80%     |

**Build fails** if any threshold not met.

## Quality Gates

### Backend Quality Checks

| Check           | Tool      | Threshold      | Action on Failure |
|-----------------|-----------|----------------|-------------------|
| Formatting      | Black     | Must pass      | Fail build        |
| Linting         | Ruff      | E, F, W errors | Fail build        |
| Type checking   | mypy      | Any error      | Warn only         |
| Security        | Bandit    | High severity  | Fail build        |

### Frontend Quality Checks

| Check           | Tool          | Threshold              | Action on Failure |
|-----------------|---------------|------------------------|-------------------|
| Linting         | ESLint        | max-warnings: 0        | Fail build        |
| Type checking   | TypeScript    | Any error              | Fail build        |
| Security        | npm audit     | High/Critical          | Fail build        |
| Security        | npm audit     | Medium                 | Warn only         |

### Dependency Checks

| Check           | Frequency     | Action                     |
|-----------------|---------------|----------------------------|
| Outdated deps   | Every run     | Warn only (report only)    |
| Security alerts | GitHub native | Block merge (Dependabot)   |

## Timeout Durations

| Workflow           | Job                   | Timeout |
|--------------------|-----------------------|---------|
| ci.yml             | backend-tests         | 15 min  |
| ci.yml             | frontend-tests        | 10 min  |
| ci.yml             | e2e-tests             | 20 min  |
| ci.yml             | code-quality          | 10 min  |
| test-backend.yml   | backend-unit          | 10 min  |
| test-backend.yml   | backend-integration   | 15 min  |
| test-frontend.yml  | frontend-component    | 10 min  |
| test-frontend.yml  | frontend-store        | 5 min   |
| test-e2e.yml       | e2e-tests (per shard) | 20 min  |

## Artifact Retention

All artifacts retained for **7 days**:

| Artifact                     | Content                            |
|------------------------------|------------------------------------|
| backend-test-results         | JUnit XML reports                  |
| backend-coverage-report      | HTML coverage report               |
| frontend-coverage-report     | Vitest coverage (JSON + HTML)     |
| playwright-report            | Playwright HTML report             |
| playwright-screenshots       | Screenshots on failure             |
| playwright-trace             | Trace files on failure             |
| ruff-report                  | Ruff linting results (JSON)        |
| mypy-report                  | mypy type checking results         |
| bandit-report                | Bandit security scan (JSON)        |
| eslint-report                | ESLint results (JSON)              |
| npm-audit-report             | npm audit results (JSON)           |
| dependency-report            | Outdated packages report           |
| combined-coverage-report     | Merged coverage from all sources   |
| coverage-html-report         | HTML coverage summary              |

## Failure Debugging

### View Test Logs

1. Navigate to the failed workflow run
2. Click on the failed job
3. Expand the failed step to view full logs
4. Look for error messages and stack traces

### Download Artifacts

1. Scroll to "Artifacts" section at bottom of workflow run
2. Download relevant artifacts:
   - **Test failures:** Download `*-test-results` artifacts
   - **Coverage issues:** Download `*-coverage-report` artifacts
   - **E2E failures:** Download `playwright-screenshots` and `playwright-trace`
   - **Lint failures:** Download `*-report` artifacts

### Reproduce Locally

**Backend unit test failure:**
```bash
cd backend
pytest tests/unit/test_failing_file.py -v --tb=long
```

**Backend integration test failure:**
```bash
cd backend
# Start services
docker-compose up -d postgres redis

# Run failing test
pytest tests/integration/test_failing_file.py -v --tb=long

# Check logs
docker-compose logs postgres
docker-compose logs redis
```

**Frontend test failure:**
```bash
cd frontend
npm run test -- test/failing/test.test.tsx
```

**E2E test failure:**
```bash
cd frontend
# Run specific test file
npx playwright test tests/failing.spec.ts --headed

# Debug mode
npx playwright test --debug

# View trace
npx playwright show-trace playwright-report/trace.zip
```

**Lint failure:**
```bash
# Backend
cd backend
black --check .  # See formatting issues
ruff check .     # See linting issues
mypy app         # See type errors

# Frontend
cd frontend
npm run lint     # See ESLint issues
npx tsc --noEmit # See TypeScript errors
```

### Common Failure Patterns

#### 1. Flaky Tests

**Symptoms:** Test passes locally but fails in CI (or vice versa)

**Solutions:**
- E2E tests have 1 retry for network issues
- Use explicit waits instead of `sleep()`
- Check for timing dependencies
- Ensure tests are isolated (no shared state)

**Example:**
```typescript
// Bad
await page.waitForTimeout(1000);

// Good
await page.waitForSelector('[data-testid="loaded"]');
```

#### 2. Timeout Issues

**Symptoms:** Job exceeds time limit and is cancelled

**Solutions:**
- Check for infinite loops
- Optimize slow database queries
- Use parallel execution where possible
- Increase timeout if necessary (last resort)

**Debugging:**
```bash
# Check job duration in GitHub Actions
# Look for slow steps
# Profile test execution time
```

#### 3. Dependency Conflicts

**Symptoms:** Installation fails or tests have import errors

**Solutions:**
- Delete `package-lock.json` and run `npm install`
- Delete `~/.cache/pip` and reinstall Python packages
- Check for version conflicts in `requirements.txt` or `package.json`

**Frontend:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Backend:**
```bash
cd backend
pip uninstall -r requirements.txt -y
pip install -r requirements.txt
```

#### 4. Rate Limiting

**Symptoms:** API calls fail with 429 errors

**Solutions:**
- Use caching to reduce API calls
- Implement exponential backoff
- Check GitHub Actions rate limits

#### 5. Database Connection Failures

**Symptoms:** Integration tests fail with connection errors

**Solutions:**
- Ensure services are healthy before running tests
- Check service health check configuration
- Verify connection strings and credentials
- Check service logs

**Debugging:**
```bash
# Check service status
docker-compose ps

# View service logs
docker-compose logs postgres

# Restart services
docker-compose restart postgres
```

#### 6. Memory Issues

**Symptoms:** Tests fail with out-of-memory errors

**Solutions:**
- Reduce parallel test count
- Free resources in tests (close connections, clean up)
- Check for memory leaks in test code

**Backend:**
```bash
# Reduce parallel workers
pytest tests/unit -n 2  # Instead of -n auto
```

## PR Requirements

All pull requests must meet these requirements before merge:

### Test Requirements

- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ All E2E tests passing
- ✅ Coverage not decreased
- ✅ Coverage thresholds met (80% lines, 70% branches)

### Code Quality Requirements

- ✅ Code formatted (Black for Python, Prettier for TypeScript)
- ✅ No linting errors (Ruff, ESLint)
- ✅ No type errors (mypy, TypeScript)
- ✅ No high-severity security issues (Bandit, npm audit)
- ✅ No critical dependencies outdated

### CI/CD Requirements

- ✅ All CI checks passing
- ✅ All quality gates passing
- ✅ Coverage report posted to PR
- ✅ Test results posted to PR
- ✅ No blocking failures

## Performance Metrics

### Execution Times (approximate)

| Test Type        | Duration | Parallelization |
|------------------|----------|-----------------|
| Backend unit     | 5 min    | pytest-xdist     |
| Backend integration | 7 min | Sequential       |
| Frontend tests   | 3 min    | Vitest parallel  |
| E2E tests        | 10 min   | 4 shards        |
| Code quality     | 2 min    | All parallel    |
| **Total CI time** | **~12-15 min** | Parallel jobs |

### Coverage Aggregation

- Backend coverage: ~85% lines, ~75% branches
- Frontend coverage: ~85% lines, ~75% branches
- Overall coverage: ~85% lines, ~75% branches

## Troubleshooting Guide

### Issue: "No coverage artifacts found"

**Cause:** Coverage upload failed or job was cancelled

**Solution:**
1. Check if test job completed successfully
2. Verify coverage file paths in workflow
3. Check Codecov token configuration

### Issue: "Coverage threshold not met"

**Cause:** Coverage decreased below 80% lines or 70% branches

**Solution:**
1. View coverage report artifact
2. Identify files with low coverage
3. Add tests for uncovered code
4. Re-run CI to verify

### Issue: "Flaky E2E test"

**Cause:** Timing issues or network problems

**Solution:**
1. Download screenshots and trace
2. Check if element selectors are correct
3. Add explicit waits
4. Consider increasing retry count

### Issue: "Dependency check fails"

**Cause:** Outdated packages with security vulnerabilities

**Solution:**
1. Review dependency report artifact
2. Update vulnerable packages
3. Test updates thoroughly
4. Commit updated package files

## Best Practices

1. **Write tests first** (TDD approach)
2. **Keep tests fast** (use mocks, avoid sleep)
3. **Test in isolation** (no shared state between tests)
4. **Use descriptive test names** (explain what is being tested)
5. **Test edge cases** (not just happy paths)
6. **Maintain high coverage** (aim for 80%+)
7. **Fix flaky tests immediately** (don't ignore failures)
8. **Review CI logs** (understand what's happening)
9. **Optimize slow tests** (parallelize, cache, refactor)
10. **Document complex scenarios** (add comments for tricky tests)

## Contact

For questions or issues with CI/CD, please:
1. Check this documentation
2. Review GitHub Actions logs
3. Download and examine artifacts
4. Ask in team chat or create issue

---

**Last updated:** 2026-04-05
**Maintained by:** Development team
