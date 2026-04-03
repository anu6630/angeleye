---
phase: 3
slug: execution-publishing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend Framework** | pytest 9.0.2 |
| **Frontend Framework** | vitest 4.1.2 |
| **Backend Config** | backend/pytest.ini (Wave 0 creates) |
| **Frontend Config** | frontend/vitest.config.ts (exists) |
| **Backend Quick run command** | cd backend && pytest tests/ -v -x |
| **Frontend Quick run command** | cd frontend && npm test -- --run |
| **Backend Full suite command** | cd backend && pytest tests/ -v |
| **Frontend Full suite command** | cd frontend && npm test |
| **Estimated runtime** | ~15 seconds (combined) |

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
| 03-01-01 | 01 | 1 | STOR-01 | integration | pytest tests/test_dataset_service.py::test_upload_csv -x | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | NOTE-04 | integration | pytest tests/test_compilation_service.py::test_container_execution -x | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | SEC-01 | unit | pytest tests/test_container_executor.py::test_security_config -x | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 3 | NOTE-05 | e2e | pytest tests/test_notebook_workflow.py::test_compile_and_publish -x | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 3 | VIEW-03 | unit | pytest tests/test_cdn_service.py::test_cloudfront_url -x | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 4 | STOR-05 | integration | pytest tests/test_cdn_service.py::test_invalidate_notebook -x | ❌ W0 | ⬜ pending |
| 03-07-01 | 07 | 4 | PERF-01, PERF-02 | e2e | pytest tests/test_performance.py -v -x | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

**Backend Test Infrastructure:**
- [ ] `backend/tests/__init__.py` — stubs for REQ-IDs
- [ ] `backend/tests/conftest.py` — shared fixtures for database, storage (MinIO mock), container (Docker mock), Celery worker
- [ ] `backend/pytest.ini` — pytest configuration
- [ ] `backend/tests/test_dataset_service.py` — dataset upload tests
- [ ] `backend/tests/test_compilation_service.py` — container execution tests
- [ ] `backend/tests/test_storage_service.py` — S3/MinIO storage tests
- [ ] `backend/tests/test_cdn_service.py` — CloudFront invalidation tests
- [ ] `backend/tests/test_compilation_tasks.py` — Celery task tests
- [ ] `backend/tests/test_container_executor.py` — security and timeout tests

**Frontend Test Infrastructure:**
- [ ] `tests/e2e/viewer.spec.ts` — Playwright tests for CDN and lazy loading
- [ ] `tests/e2e/performance.spec.ts` — Playwright performance tests

**Manual-Only Verifications:**
| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Container isolation enforcement | SEC-01 | Requires Docker inspection | Run `docker ps` and `docker inspect` to verify non-root user, read-only filesystem, network disabled |
| Celery async task execution | INFRA-06 | Requires worker process running | Start Celery worker, submit task, verify worker log shows task execution |
| Feed load time < 2s | PERF-01 | Requires browser timing measurement | Open feed in Chrome DevTools Performance tab, measure time to first paint |
| Viewer load time < 3s | PERF-02 | Requires browser timing measurement | Open viewer page in Chrome DevTools Performance tab, measure time to first paint |
| Image lazy loading | PERF-04 | Subjective UX evaluation | Scroll viewer page and verify images load as they enter viewport |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
