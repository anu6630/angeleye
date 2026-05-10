#!/usr/bin/env bash
# Verify group presence API with curl + three cookie jars.
# Prereq: API + Redis running, database migrated.
# Usage: ./scripts/verify_group_presence_curl.sh [BASE_URL]
set -euo pipefail

BASE="${1:-http://localhost:8000}"
API="$BASE/api/v1"

A_JAR=$(mktemp)
B_JAR=$(mktemp)
C_JAR=$(mktemp)
trap 'rm -f "$A_JAR" "$B_JAR" "$C_JAR"' EXIT

TS="$(date +%s)"
EMAIL_A="presence-a-$TS@example.com"
EMAIL_B="presence-b-$TS@example.com"
EMAIL_C="presence-c-$TS@example.com"
USER_A="pa$TS"
USER_B="pb$TS"
USER_C="pc$TS"
PASS='Testpass123!'

register_login() {
  local jar="$1" email="$2" user="$3"
  curl -sS -c "$jar" -X POST "$API/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"username\":\"$user\",\"password\":\"$PASS\"}" >/dev/null
  curl -sS -c "$jar" -b "$jar" -X POST "$API/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$PASS\"}" >/dev/null
}

echo "== Register + login A,B,C =="
register_login "$A_JAR" "$EMAIL_A" "$USER_A"
register_login "$B_JAR" "$EMAIL_B" "$USER_B"
register_login "$C_JAR" "$EMAIL_C" "$USER_C"

SLUG="presence-group-$TS"
echo "== A creates public group =="
curl -sS -b "$A_JAR" -X POST "$API/groups" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Presence $TS\",\"slug\":\"$SLUG\",\"visibility\":\"public\",\"join_policy\":\"open\"}" | jq .

echo "== B and C join =="
curl -sS -b "$B_JAR" -X POST "$API/groups/$SLUG/join" | jq .
curl -sS -b "$C_JAR" -X POST "$API/groups/$SLUG/join" | jq .

echo "== Heartbeats (A,B,C) =="
curl -sS -o /dev/null -w "%{http_code}\n" -b "$A_JAR" -X POST "$API/groups/$SLUG/presence/heartbeat"
curl -sS -o /dev/null -w "%{http_code}\n" -b "$B_JAR" -X POST "$API/groups/$SLUG/presence/heartbeat"
curl -sS -o /dev/null -w "%{http_code}\n" -b "$C_JAR" -X POST "$API/groups/$SLUG/presence/heartbeat"

echo "== GET presence (no auth, public group) =="
COUNT=$(curl -sS "$API/groups/$SLUG/presence" | jq .online_user_count)
echo "online_user_count=$COUNT"
test "$COUNT" = "3"

echo "== C leaves presence =="
curl -sS -o /dev/null -w "%{http_code}\n" -b "$C_JAR" -X DELETE "$API/groups/$SLUG/presence"

COUNT2=$(curl -sS "$API/groups/$SLUG/presence" | jq .online_user_count)
echo "online_user_count_after_leave=$COUNT2"
test "$COUNT2" = "2"

echo "OK presence flow for slug=$SLUG"
