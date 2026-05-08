#!/usr/bin/env bash
# Optional: source from repo root before running Alembic or create_test_user on the host.
#   source scripts/dev-db-url.sh
# Override published port when docker-compose uses a non-default host binding:
#   export POSTGRES_HOST_PORT=5433 && source scripts/dev-db-url.sh

PORT="${POSTGRES_HOST_PORT:-5435}"
export DATABASE_URL="${DATABASE_URL:-postgresql://notebooksocial:notebooksocial_password@127.0.0.1:${PORT}/notebooksocial}"
