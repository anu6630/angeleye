#!/usr/bin/env bash
# Start backend + Celery on the host (e.g. for Docker socket access on macOS).
# Ensure docker compose Postgres is up; host port defaults to 5435 (see POSTGRES_HOST_PORT).

set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
cd "$BACKEND"

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

PORT="${POSTGRES_HOST_PORT:-5435}"
export DATABASE_URL="${DATABASE_URL:-postgresql://notebooksocial:notebooksocial_password@127.0.0.1:${PORT}/notebooksocial}"
export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379/0}"
export MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:9000}"
export MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
export MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
export SECRET_KEY="${SECRET_KEY:-dev-secret-key-change-in-production}"

if [ -d venv ]; then
  # shellcheck source=/dev/null
  source venv/bin/activate
fi

echo "Starting backend on :8001 (logs /tmp/backend.log)..."
uvicorn app.main:app --host 0.0.0.0 --port 8001 > /tmp/backend.log 2>&1 &
sleep 3

echo "Starting Celery worker (logs /tmp/celery.log)..."
celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2 -Q compilation > /tmp/celery.log 2>&1 &

echo "✅ Backend and Celery started (host)."
echo "📋 DATABASE_URL uses host port ${PORT} — set POSTGRES_HOST_PORT if compose maps Postgres elsewhere."
