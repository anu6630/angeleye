# Local development notes

## PostgreSQL port

Docker Compose publishes Postgres on **`${POSTGRES_HOST_PORT:-5435}`** → container `5432`.

- If another service uses host port **5435**, set e.g. `export POSTGRES_HOST_PORT=5433` and run:
  `POSTGRES_HOST_PORT=5433 docker compose up -d postgres`
- Host-side scripts (`backend/start-backend.sh`, `backend/start-celery.sh`, `start-dev.sh`) read `DATABASE_URL` from `backend/.env` when present, otherwise default to `127.0.0.1:${POSTGRES_HOST_PORT:-5435}`.

Copy `backend/.env.example` to `backend/.env` and adjust `DATABASE_URL` to match.

## Playwright E2E

- `frontend/tests/e2e/global-setup.ts` registers `test@example.com` via **`POST /api/v1/auth/register`**, or falls back to `backend/create_test_user.py`.
- Start **backend** on `http://localhost:8000` before `npm run test:e2e` (global setup calls the API).
- Full **publish** flow (`publish-lifecycle.spec.ts`) needs **Celery** + worker dependencies (see `docker-compose` `celery_worker`).
