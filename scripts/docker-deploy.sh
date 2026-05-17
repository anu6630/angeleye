#!/usr/bin/env bash
# Build and start the full stack (Postgres, Redis, MinIO, Meilisearch, backend, Celery, frontend).
# Run from repo root after Docker Desktop is running:
#   chmod +x scripts/docker-deploy.sh && ./scripts/docker-deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "== docker compose build (backend + frontend) =="
docker compose build backend frontend

echo "== docker compose up -d =="
docker compose up -d

echo "== wait for backend healthy =="
for i in $(seq 1 60); do
  if docker compose exec -T backend python -c \
    "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')" \
    2>/dev/null; then
    echo "backend is up"
    break
  fi
  if [[ "$i" -eq 60 ]]; then
    echo "backend did not become healthy in time; check: docker compose logs backend"
    exit 1
  fi
  sleep 2
done

echo "== alembic upgrade head =="
docker compose exec -T backend alembic upgrade head

echo "== done =="
echo "Frontend: http://localhost:3000"
echo "API docs: http://localhost:8000/docs"
docker compose ps
