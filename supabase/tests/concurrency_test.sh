#!/usr/bin/env bash
set -euo pipefail

echo "=== Running SMS Reservation Concurrency Test ==="
PHONE="+25078$((RANDOM % 9000000 + 1000000))"
CONCURRENT_REQUESTS=10
MAX_PER_HOUR=2

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Firing $CONCURRENT_REQUESTS concurrent reservation requests for phone $PHONE (hourly cap = $MAX_PER_HOUR)..."

for i in $(seq 1 "$CONCURRENT_REQUESTS"); do
  (
    docker exec -i supabase_db_weshare-v1 psql -U postgres -d postgres -t -A \
      -c "select public.auth_sms_reserve('$PHONE', 0, $MAX_PER_HOUR, 1000);" \
      2>"$TMP_DIR/err_$i.txt" >"$TMP_DIR/out_$i.txt" || true
  ) &
done

wait

SUCCESS_COUNT=0
DENIED_COUNT=0

for i in $(seq 1 "$CONCURRENT_REQUESTS"); do
  if [ -s "$TMP_DIR/out_$i.txt" ]; then
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    DENIED_COUNT=$((DENIED_COUNT + 1))
  fi
done

echo "Results: SUCCESS=$SUCCESS_COUNT, DENIED=$DENIED_COUNT"

if [ "$SUCCESS_COUNT" -ne "$MAX_PER_HOUR" ]; then
  echo "FAIL: Expected exactly $MAX_PER_HOUR successes, got $SUCCESS_COUNT!" >&2
  exit 1
fi

if [ "$DENIED_COUNT" -ne "$((CONCURRENT_REQUESTS - MAX_PER_HOUR))" ]; then
  echo "FAIL: Expected exactly $((CONCURRENT_REQUESTS - MAX_PER_HOUR)) denied, got $DENIED_COUNT!" >&2
  exit 1
fi

echo "PASS: Concurrency test verified that parallel reservations cannot exceed the cap."
