#!/usr/bin/env bash
# Verify Groups API with curl + cookie jar (two password accounts).
# Prereq: API running (e.g. docker compose), database migrated.
# Usage: ./scripts/verify_groups_curl.sh [BASE_URL]
# Default BASE_URL=http://localhost:8000
set -euo pipefail

BASE="${1:-http://localhost:8000}"
API="$BASE/api/v1"

A_JAR=$(mktemp)
B_JAR=$(mktemp)
trap 'rm -f "$A_JAR" "$B_JAR"' EXIT

TS="$(date +%s)"
EMAIL_A="groups-a-$TS@example.com"
EMAIL_B="groups-b-$TS@example.com"
USER_A="ga$TS"
USER_B="gb$TS"
PASS='Testpass123!'

echo "== Register A =="
curl -sS -c "$A_JAR" -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL_A\",\"username\":\"$USER_A\",\"password\":\"$PASS\"}" | jq .

echo "== Register B =="
curl -sS -c "$B_JAR" -X POST "$API/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL_B\",\"username\":\"$USER_B\",\"password\":\"$PASS\"}" | jq .

echo "== Login A =="
curl -sS -c "$A_JAR" -b "$A_JAR" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL_A\",\"password\":\"$PASS\"}" | jq .

echo "== Login B =="
curl -sS -c "$B_JAR" -b "$B_JAR" -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL_B\",\"password\":\"$PASS\"}" | jq .

A_ID=$(curl -sS -b "$A_JAR" "$API/auth/me" | jq -r .id)
B_ID=$(curl -sS -b "$B_JAR" "$API/auth/me" | jq -r .id)
echo "A_ID=$A_ID B_ID=$B_ID"

SLUG="curl-group-$TS"

echo "== A creates group =="
curl -sS -b "$A_JAR" -X POST "$API/groups" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Curl Group $TS\",\"slug\":\"$SLUG\",\"visibility\":\"public\",\"join_policy\":\"open\"}" | jq .

echo "== B lists public groups (includes slug?) =="
curl -sS -b "$B_JAR" "$API/groups?limit=50" | jq --arg s "$SLUG" '.items | map(.slug) | contains([$s])'

echo "== B joins =="
curl -sS -b "$B_JAR" -X POST "$API/groups/$SLUG/join" | jq .

echo "== A requests B as admin =="
REQ=$(curl -sS -b "$A_JAR" -X POST "$API/groups/$SLUG/admin-requests" \
  -H 'Content-Type: application/json' \
  -d "{\"candidate_user_id\": $B_ID}")
echo "$REQ" | jq .
RID=$(echo "$REQ" | jq -r .id)

echo "== B /groups/me =="
curl -sS -b "$B_JAR" "$API/groups/me" | jq .

echo "== B accepts admin promotion =="
curl -sS -b "$B_JAR" -X POST "$API/groups/$SLUG/admin-requests/$RID/accept" | jq .

SLUG2="curl-invite-$TS"
echo "== A creates invite-only group =="
curl -sS -b "$A_JAR" -X POST "$API/groups" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"Invite Only\",\"slug\":\"$SLUG2\",\"visibility\":\"public\",\"join_policy\":\"invite_only\"}" | jq .

echo "== A invites B =="
curl -sS -b "$A_JAR" -X POST "$API/groups/$SLUG2/invites" \
  -H 'Content-Type: application/json' \
  -d "{\"invitee_user_id\": $B_ID}" | jq .

INV_ID=$(curl -sS -b "$B_JAR" "$API/groups/me" | jq -r --arg s "$SLUG2" '.pending_invites[] | select(.group.slug == $s) | .id' | head -1)
echo "INV_ID=$INV_ID"

echo "== B accepts invite =="
curl -sS -b "$B_JAR" -X POST "$API/groups/$SLUG2/invites/$INV_ID/accept" | jq .

echo "== B views invite-only group =="
curl -sS -b "$B_JAR" "$API/groups/$SLUG2" | jq .

echo "== Group posts feed (empty list, 200) =="
curl -sS -b "$B_JAR" "$API/groups/$SLUG/posts" | jq .

echo "OK — groups curl verification finished"
