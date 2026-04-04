---
phase: 04
slug: forking-social-discovery
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-04
---

# Phase 04 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.5.2 (backend), vitest 4.1.2 (frontend) |
| **Config file** | backend/pytest.ini, frontend/vitest.config.ts |
| **Quick run command** | `pytest backend/tests/unit/ -v` / `npm run test -- --run` |
| **Full suite command** | `pytest backend/tests/ -v` / `npm run test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pytest backend/tests/unit/ -v` (backend) or `npm run test -- --run` (frontend)
- **After every plan wave:** Run `pytest backend/tests/ -v` / `npm run test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 1 | FORK-01 | unit | `pytest backend/tests/unit/test_fork_service.py -v` | ✅ W0 | ⬜ pending |
| 04-01-02 | 01 | 1 | FORK-02 | unit | `pytest backend/tests/unit/test_notebook_model.py -v` | ✅ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | FORK-03, FORK-04 | integration | `pytest backend/tests/integration/test_fork_api.py -v` | ✅ W0 | ⬜ pending |
| 04-03-01 | 03 | 1 | DISC-01 | unit | `pytest backend/tests/unit/test_follow_service.py -v` | ✅ W0 | ⬜ pending |
| 04-04-01 | 04 | 2 | DISC-02 | unit | `pytest backend/tests/unit/test_trending_service.py -v` | ✅ W0 | ⬜ pending |
| 04-05-01 | 05 | 2 | DISC-03, DISC-04 | integration | `pytest backend/tests/integration/test_search_api.py -v` | ✅ W0 | ⬜ pending |
| 04-06-01 | 06 | 2 | PERF-06 | unit | `pytest backend/tests/unit/test_cache_service.py -v` | ✅ W0 | ⬜ pending |
| 04-07-01 | 07 | 3 | FORK-05, DISC-05 | integration | `pytest backend/tests/integration/test_feed_api.py -v` | ✅ W0 | ⬜ pending |
| 04-08-01 | 08 | 3 | All | integration | `npm run test -- --run` | ✅ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `backend/tests/unit/test_fork_service.py` — stubs for FORK-01, FORK-02
- [x] `backend/tests/unit/test_follow_service.py` — stubs for DISC-01
- [x] `backend/tests/unit/test_trending_service.py` — stubs for DISC-02
- [x] `backend/tests/unit/test_search_service.py` — stubs for DISC-03, DISC-04
- [x] `backend/tests/unit/test_cache_service.py` — stubs for PERF-06
- [x] `backend/tests/integration/test_fork_api.py` — API endpoint stubs
- [x] `backend/tests/integration/test_search_api.py` — search endpoint stubs
- [x] `backend/tests/integration/test_feed_api.py` — feed endpoint stubs
- [x] `backend/tests/conftest.py` — shared fixtures (database, redis, client)
- [x] `frontend/components/__tests__/FollowButton.test.tsx` — component test stubs
- [x] `frontend/components/__tests__/SearchBar.test.tsx` — component test stubs

*Existing infrastructure covers: pytest (Phase 1), vitest (Phase 2), database fixtures (Phase 1).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Fork attribution display | FORK-03 | Visual validation of breadcrumb truncation | 1. Create fork chain 5+ deep<br>2. Navigate to notebook detail page<br>3. Verify breadcrumb shows "first 2 ... last"<br>4. Verify "[▼ Show chain]" expands full chain |
| Search empty state | DISC-03 | Visual validation of fallback behavior | 1. Search for term with no results<br>2. Verify trending notebooks shown<br>3. Verify message: "No results for 'X'. Showing trending notebooks instead." |
| Zero-state metrics | DISC-05 | Visual validation of icon-only display | 1. Find notebook with 0 likes/comments<br>2. Verify feed shows icons only (👍💬)<br>3. Verify detail page shows "Be the first to like this notebook" |
| Meilisearch fallback | DISC-04 | Service failure handling | 1. Stop Meilisearch container<br>2. Search for notebooks<br>3. Verify results return (PostgreSQL fallback)<br>4. No "search down" error shown |
| Redis fallback | PERF-06 | Cache failure handling | 1. Stop Redis container<br>2. Load feed/trending<br>3. Verify data loads from database<br>4. Verify no error shown to user |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
