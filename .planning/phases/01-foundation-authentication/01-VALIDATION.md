---
phase: 1
slug: foundation-authentication
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-02
updated: 2026-04-02
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Backend Framework** | pytest 9.0.2 |
| **Frontend Framework** | vitest 4.1.2 |
| **Backend Config** | `backend/pytest.ini` (Wave 0 creates) |
| **Frontend Config** | `frontend/vitest.config.ts` (Wave 0 creates) |
| **Quick run command** | `cd backend && pytest -xvs -k "test_"` (backend), `cd frontend && vitest run` (frontend) |
| **Full suite command** | `cd backend && pytest -xvs` (backend), `cd frontend && vitest run --reporter=verbose` (frontend) |
| **Estimated runtime** | ~5 seconds (combined) |

---

## Sampling Rate

- **After every task commit:** Run relevant quick run command (backend or frontend based on task)
- **After every plan wave:** Run full suite command for all frameworks used in that wave
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds (combined backend + frontend tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------|-------------------|--------|
| 01-01-01 | 01 | 1 | INFRA-01, INFRA-02 | infrastructure | `test -f docker-compose.yml && docker compose config > /dev/null 2>&1` | ✅ green |
| 01-01-02 | 01 | 1 | INFRA-01 | infrastructure | `test -d backend && test -d frontend` | ✅ green |
| 01-01-03 | 01 | 1 | INFRA-02 | infrastructure | `test -f docker-compose.yml && grep -q "postgres:" docker-compose.yml` | ✅ green |
| 01-02-01 | 02 | 1 | INFRA-04 | database | `test -f backend/app/models/user.py && grep -q "class User" backend/app/models/user.py` | ⬜ pending |
| 01-02-02 | 02 | 1 | INFRA-04, PERF-05 | database | `test -f backend/alembic/versions/*.py && grep -q "users" backend/alembic/versions/*.py` | ⬜ pending |
| 01-02-03 | 02 | 1 | INFRA-04 | database | `ls backend/alembic/versions/ | wc -l | grep -q "1"` | ⬜ pending |
| 01-03-01 | 03 | 2 | SEC-05 | security | `test -f backend/app/core/security.py && grep -q "validate_email" backend/app/core/security.py` | ⬜ pending |
| 01-03-02 | 03 | 2 | SEC-06 | security | `test -f backend/app/core/security.py && grep -q "encrypt_token" backend/app/core/security.py` | ⬜ pending |
| 01-03-03 | 03 | 2 | SEC-04, SEC-05 | security | `test -f backend/app/core/config.py && grep -q "slowapi" backend/app/core/config.py` | ⬜ pending |
| 01-04-01 | 04 | 2 | AUTH-01, AUTH-02 | auth | `test -f backend/app/api/v1/auth/router.py && grep -q "def google_login" backend/app/api/v1/auth/router.py` | ⬜ pending |
| 01-04-02 | 04 | 2 | AUTH-03 | auth | `test -f backend/app/services/auth_service.py && grep -q "def create_access_token" backend/app/services/auth_service.py` | ⬜ pending |
| 01-04-03 | 04 | 2 | AUTH-01, AUTH-02, AUTH-03 | auth | `test -f backend/app/api/v1/auth/router.py && grep -q "def callback" backend/app/api/v1/auth/router.py` | ⬜ pending |
| 01-05-01 | 05 | 2 | PROF-01, PROF-02 | profile | `test -f backend/app/api/v1/profiles/router.py && grep -q "def get_profile" backend/app/api/v1/profiles/router.py` | ⬜ pending |
| 01-05-02 | 05 | 2 | AUTH-04, AUTH-05 | auth | `test -f backend/app/api/v1/profiles/router.py && grep -q "Depends" backend/app/api/v1/profiles/router.py | head -1` | ⬜ pending |
| 01-05-03 | 05 | 2 | PROF-05, PROF-06 | profile | `test -f backend/app/services/profile_service.py && grep -q "def update_profile" backend/app/services/profile_service.py` | ⬜ pending |
| 01-05-04 | 05 | 2 | PROF-05, AUTH-05 | auth | `test -f backend/app/main.py && grep -q "include_router.*profiles" backend/app/main.py` | ⬜ pending |
| 01-06-01 | 06 | 2 | INFRA-01 | frontend | `test -f frontend/package.json && grep -q "next" frontend/package.json` | ⬜ pending |
| 01-06-02 | 06 | 2 | INFRA-01 | frontend | `test -f frontend/next.config.js && grep -q "output:" frontend/next.config.js` | ⬜ pending |
| 01-06-03 | 06 | 2 | INFRA-01 | frontend | `test -f frontend/tsconfig.json && grep -q "baseUrl" frontend/tsconfig.json` | ⬜ pending |
| 01-08-01 | 08 | 3 | PROF-01, PROF-02 | frontend | `test -f frontend/app/profile/page.tsx && grep -q "ProfileCard" frontend/app/profile/page.tsx` | ⬜ pending |
| 01-08-02 | 08 | 3 | PROF-05 | frontend | `test -f frontend/app/profile/edit/page.tsx && grep -q "ProfileEditForm" frontend/app/profile/edit/page.tsx` | ⬜ pending |
| 01-08-03 | 08 | 3 | PROF-06 | frontend | `test -f frontend/app/profile/page.tsx && grep -q "NotebookList" frontend/app/profile/page.tsx` | ⬜ pending |
| 01-04-02 | 04 | 2 | AUTH-03 | auth | `test -f backend/app/services/auth_service.py && grep -q "def create_refresh_token" backend/app/services/auth_service.py` | ⬜ pending |
| 01-09-01 | 09 | 2 | INFRA-05 | cache | `test -f backend/app/core/redis.py && grep -q "def get_cache" backend/app/core/redis.py` | ⬜ pending |
| 01-09-02 | 09 | 2 | SEC-04 | rate_limit | `test -f backend/app/core/rate_limiter.py && grep -q "def check_rate_limit" backend/app/core/rate_limiter.py` | ⬜ pending |
| 01-09-03 | 09 | 2 | INFRA-05, SEC-04 | integration | `test -f backend/app/core/config.py && grep -q "redis" backend/app/core/config.py` | ⬜ pending |
| 01-07-01 | 07 | 4 | AUTH-01, AUTH-02 | frontend | `test -f frontend/components/auth/OAuthButton.tsx && grep -q "const OAuthButton" frontend/components/auth/OAuthButton.tsx` | ⬜ pending |
| 01-07-02 | 07 | 4 | AUTH-03 | frontend | `test -f frontend/stores/auth-store.ts && grep -q "persist" frontend/stores/auth-store.ts` | ⬜ pending |
| 01-07-03 | 07 | 4 | PROF-01, PROF-05 | frontend | `test -f frontend/app/(auth)/profile-wizard/page.tsx && grep -q "ProfileWizard" frontend/app/(auth)/profile-wizard/page.tsx` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/__init__.py` — empty file to mark as package
- [ ] `backend/tests/conftest.py` — shared fixtures for database, test client
- [ ] `backend/pytest.ini` — pytest configuration
- [ ] `frontend/tests/__init__.py` — empty file to mark as package
- [ ] `frontend/vitest.config.ts` — vitest configuration
- [ ] `backend/tests/test_main.py` — basic test to verify FastAPI app starts
- [ ] `frontend/tests/test_config.test.ts` — basic test to verify Next.js config

*Note: Wave 0 is marked incomplete (`wave_0_complete: false`) in frontmatter. This is acceptable for Phase 1 as it's foundational infrastructure. Test infrastructure will be fully established in Phase 5 (Testing & Quality).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| OAuth provider registration | AUTH-01, AUTH-02 | Requires Google/Facebook developer accounts and API credentials | 1. Register application in Google Cloud Console 2. Register application in Facebook Developers 3. Update .env with OAuth credentials |
| Production session persistence | AUTH-03 | Requires production environment and browser testing | 1. Deploy to production 2. Login as user 3. Refresh browser 4. Verify session persists |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 requirements documented (will be completed in Phase 5)
- [x] No watch-mode flags
- [x] Feedback latency < 5s (combined backend + frontend tests)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready 2026-04-02
