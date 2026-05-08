#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [ -f .env ]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

if [ -z "${DATABASE_URL:-}" ]; then
  PORT="${POSTGRES_HOST_PORT:-5435}"
  export DATABASE_URL="postgresql://notebooksocial:notebooksocial_password@127.0.0.1:${PORT}/notebooksocial"
fi

export REDIS_URL="${REDIS_URL:-redis://127.0.0.1:6379/0}"
export MINIO_ENDPOINT="${MINIO_ENDPOINT:-http://127.0.0.1:9000}"
export MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
export MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
export SECRET_KEY="${SECRET_KEY:-dev-secret-key-change-in-production}"
export FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

if [ -d venv ]; then
  # shellcheck source=/dev/null
  source venv/bin/activate
fi

exec celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2 -Q compilation
