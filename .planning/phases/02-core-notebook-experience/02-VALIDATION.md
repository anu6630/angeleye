---
phase: 2
slug: core-notebook-experience
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend Framework** | pytest 9.0.2 |
| **Frontend Framework** | vitest 4.1.2 |
| **Backend Config** | backend/pytest.ini (Wave 0 creates) |
| **Frontend Config** | frontend/vitest.config.ts (Wave 0 creates) |
| **Backend Quick run command** | cd backend && pytest -xvs -k "test_<feature>" |
| **Frontend Quick run command** | cd frontend && vitest run |
| **Backend Full suite command** | cd backend && pytest -xvs |
| **Frontend Full suite command** | cd frontend && vitest run --reporter=verbose |
| **Estimated runtime** | ~5 seconds (combined) |

---

## Sampling Rate

- **After every task commit:** Run quick run command for respective domain (backend or frontend)
- **After every plan wave:** Run full suite command for both backend and frontend
- **Before `/gsd:verify-work`:** Full suite must be green for both backend and frontend
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Backend Test Infrastructure:**
- [ ] `backend/tests/__init__.py` — stubs for REQ-IDs
- [ ] `backend/tests/conftest.py` — shared fixtures for database, test client, Pyodide mock
- [ ] `backend/pytest.ini` — pytest configuration
- [ ] `backend/tests/test_notebook_service.py` — notebook CRUD tests
- [ ] `backend/tests/test_like_service.py` — like/unlike tests
- [ ] `backend/tests/test_comment_service.py` — threaded comment tests
- [ ] `backend/tests/test_feed_service.py` — feed pagination tests

**Frontend Test Infrastructure:**
- [ ] `frontend/tests/setup.ts` — test setup (MSW for API mocking, testing-library config)
- [ ] `frontend/vitest.config.ts` — vitest configuration
- [ ] `frontend/tests/notebook/editor.test.ts` — Pyodide integration tests (with mocked Pyodide)
- [ ] `frontend/tests/feed/feed-list.test.ts` — infinite scroll tests
- [ ] `frontend/tests/social/like.test.ts` — optimistic update tests
- [ ] `frontend/tests/social/comment.test.ts` — threaded comment tests

**E2E Test Infrastructure:**
- [ ] `tests/e2e/notebook-viewer.spec.ts` — Playwright tests for notebook viewing
- [ ] `tests/e2e/editor.spec.ts` — Playwright tests for editor (with Pyodide CDN)

**Manual-Only Verifications:**
| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Pyodide initialization performance | PERF-03 | Requires browser timing measurement | Open editor in Chrome DevTools Performance tab, measure time to interactive state, verify < 5 seconds |
| Feed scroll smoothness | VIEW-04 | Subjective UX evaluation | Manually scroll feed and verify no stuttering/jank when loading more items |
| Comment thread readability | SOC-04 | Subjective UX evaluation | View comment thread and verify depth limit (3 levels) is appropriate and nesting is clear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
