#!/usr/bin/env bash
set -euo pipefail

echo "=== Running PawaPay Synthetic Webhook Round-Trip Test Suite ==="

BASE_URL="http://127.0.0.1:54321/functions/v1/pawapay-webhook"
PSQL="docker exec -i supabase_db_weshare-v1 psql -U postgres -d postgres -t -A"

# 1. Setup test fixture data in local database
echo "Setting up test users, rides, bookings, and payments..."
$PSQL <<'EOF'
begin;
-- Cleanup previous test records if any
delete from public.payments where deposit_id like 'syn-dep-%' or payout_id like 'syn-pay-%';
delete from public.notifications where event_key like 'payment:%';
delete from public.payments where id in (
  'e5555555-5555-5555-5555-555555555551',
  'e5555555-5555-5555-5555-555555555552',
  'e5555555-5555-5555-5555-555555555553',
  'e5555555-5555-5555-5555-555555555554',
  'e5555555-5555-5555-5555-555555555555'
);

-- Ensure test driver and passenger exist in auth.users & profiles
insert into auth.users (id, phone, phone_confirmed_at, role, aud)
values
  ('a1111111-1111-1111-1111-111111111111', '+250788111001', now(), 'authenticated', 'authenticated'),
  ('b2222222-2222-2222-2222-222222222222', '+250788222002', now(), 'authenticated', 'authenticated')
on conflict (id) do update set phone = excluded.phone;

insert into public.profiles (id, phone, full_name)
values
  ('a1111111-1111-1111-1111-111111111111', '+250788111001', 'Driver Test'),
  ('b2222222-2222-2222-2222-222222222222', '+250788222002', 'Passenger Test')
on conflict (id) do nothing;

-- Test Ride
insert into public.rides (
  id, posted_by, from_short, to_short, from_address, to_address,
  depart_at, seats, price_rwf, status
) values (
  'c3333333-3333-3333-3333-333333333333',
  'a1111111-1111-1111-1111-111111111111',
  'KGL', 'MUS', 'Kigali', 'Musanze',
  now() + interval '3 hours', 4, 4000, 'active'
) on conflict (id) do nothing;

-- Bookings & Payments for each scenario:
-- 1. Deposit Completed
insert into public.bookings (id, ride_id, passenger_id, seats, status)
values ('d4444444-4444-4444-4444-444444444441', 'c3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 1, 'pending')
on conflict (id) do nothing;

insert into public.payments (
  id, booking_id, ride_id, passenger_id, driver_id, deposit_id,
  gross_amount, service_fee, net_amount, currency, passenger_phone, driver_phone,
  network, escrow_status, deposit_status, payout_status
) values (
  'e5555555-5555-5555-5555-555555555551',
  'd4444444-4444-4444-4444-444444444441',
  'c3333333-3333-3333-3333-333333333333',
  'b2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  'syn-dep-completed-1',
  4000, 400, 3600, 'RWF', '+250788222002', '+250788111001',
  'MTN_MOMO_RWA', 'holding', 'pending', 'pending'
) on conflict (id) do nothing;

-- 2. Deposit Failed
insert into public.bookings (id, ride_id, passenger_id, seats, status)
values ('d4444444-4444-4444-4444-444444444442', 'c3333333-3333-3333-3333-333333333333', 'b2222222-2222-2222-2222-222222222222', 1, 'pending')
on conflict (id) do nothing;

insert into public.payments (
  id, booking_id, ride_id, passenger_id, driver_id, deposit_id,
  gross_amount, service_fee, net_amount, currency, passenger_phone, driver_phone,
  network, escrow_status, deposit_status, payout_status
) values (
  'e5555555-5555-5555-5555-555555555552',
  'd4444444-4444-4444-4444-444444444442',
  'c3333333-3333-3333-3333-333333333333',
  'b2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  'syn-dep-failed-2',
  4000, 400, 3600, 'RWF', '+250788222002', '+250788111001',
  'MTN_MOMO_RWA', 'holding', 'pending', 'pending'
) on conflict (id) do nothing;

-- 3. Payout Completed
insert into public.payments (
  id, booking_id, ride_id, passenger_id, driver_id, payout_id,
  gross_amount, service_fee, net_amount, currency, passenger_phone, driver_phone,
  network, escrow_status, deposit_status, payout_status
) values (
  'e5555555-5555-5555-5555-555555555553',
  'd4444444-4444-4444-4444-444444444441',
  'c3333333-3333-3333-3333-333333333333',
  'b2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  'syn-pay-completed-3',
  4000, 400, 3600, 'RWF', '+250788222002', '+250788111001',
  'MTN_MOMO_RWA', 'held', 'completed', 'pending'
) on conflict (id) do nothing;

-- 4. Payout Failed
insert into public.payments (
  id, booking_id, ride_id, passenger_id, driver_id, payout_id,
  gross_amount, service_fee, net_amount, currency, passenger_phone, driver_phone,
  network, escrow_status, deposit_status, payout_status
) values (
  'e5555555-5555-5555-5555-555555555554',
  'd4444444-4444-4444-4444-444444444441',
  'c3333333-3333-3333-3333-333333333333',
  'b2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  'syn-pay-failed-4',
  4000, 400, 3600, 'RWF', '+250788222002', '+250788111001',
  'MTN_MOMO_RWA', 'held', 'completed', 'pending'
) on conflict (id) do nothing;

-- 5. Refund
insert into public.payments (
  id, booking_id, ride_id, passenger_id, driver_id, deposit_id,
  gross_amount, service_fee, net_amount, currency, passenger_phone, driver_phone,
  network, escrow_status, deposit_status, payout_status
) values (
  'e5555555-5555-5555-5555-555555555555',
  'd4444444-4444-4444-4444-444444444441',
  'c3333333-3333-3333-3333-333333333333',
  'b2222222-2222-2222-2222-222222222222',
  'a1111111-1111-1111-1111-111111111111',
  'syn-refund-5',
  4000, 400, 3600, 'RWF', '+250788222002', '+250788111001',
  'MTN_MOMO_RWA', 'holding', 'completed', 'pending'
) on conflict (id) do nothing;

commit;
EOF

echo ""
echo "--- Scenario 1: Deposit COMPLETED ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/deposit" \
  -H "Content-Type: application/json" \
  -d '{"depositId": "syn-dep-completed-1", "status": "COMPLETED"}')
echo "Webhook HTTP status: $CODE"
if [[ "$CODE" != "200" ]]; then echo "FAIL: expected 200, got $CODE"; exit 1; fi

NOTIF_COUNT=$($PSQL -c "select count(*) from public.notifications where event_key in ('payment:e5555555-5555-5555-5555-555555555551:deposit_completed_driver', 'payment:e5555555-5555-5555-5555-555555555551:deposit_completed_passenger');")
echo "Notifications created: $NOTIF_COUNT (expected 2: exactly 1 for driver, 1 for passenger)"
if [[ "$NOTIF_COUNT" != "2" ]]; then echo "FAIL: expected 2 notifications, got $NOTIF_COUNT"; exit 1; fi

echo ""
echo "--- Scenario 2: Duplicate Deposit COMPLETED Callback (Idempotency) ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/deposit" \
  -H "Content-Type: application/json" \
  -d '{"depositId": "syn-dep-completed-1", "status": "COMPLETED"}')
echo "Webhook HTTP status on replay: $CODE"
if [[ "$CODE" != "200" ]]; then echo "FAIL: expected 200, got $CODE"; exit 1; fi

NOTIF_COUNT_AFTER=$($PSQL -c "select count(*) from public.notifications where event_key in ('payment:e5555555-5555-5555-5555-555555555551:deposit_completed_driver', 'payment:e5555555-5555-5555-5555-555555555551:deposit_completed_passenger');")
echo "Notifications after duplicate callback: $NOTIF_COUNT_AFTER (expected still 2)"
if [[ "$NOTIF_COUNT_AFTER" != "2" ]]; then echo "FAIL: duplicate notification was created!"; exit 1; fi

echo ""
echo "--- Scenario 3: Deposit FAILED ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/deposit" \
  -H "Content-Type: application/json" \
  -d '{"depositId": "syn-dep-failed-2", "status": "FAILED"}')
echo "Webhook HTTP status: $CODE"
if [[ "$CODE" != "200" ]]; then echo "FAIL: expected 200, got $CODE"; exit 1; fi

FAIL_NOTIF=$($PSQL -c "select count(*) from public.notifications where event_key = 'payment:e5555555-5555-5555-5555-555555555552:deposit_failed';")
echo "Notifications for deposit failed: $FAIL_NOTIF (expected exactly 1)"
if [[ "$FAIL_NOTIF" != "1" ]]; then echo "FAIL: expected 1 notification, got $FAIL_NOTIF"; exit 1; fi

echo ""
echo "--- Scenario 4: Payout COMPLETED ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/payout" \
  -H "Content-Type: application/json" \
  -d '{"payoutId": "syn-pay-completed-3", "status": "COMPLETED"}')
echo "Webhook HTTP status: $CODE"
if [[ "$CODE" != "200" ]]; then echo "FAIL: expected 200, got $CODE"; exit 1; fi

PAY_COMPL_NOTIF=$($PSQL -c "select count(*) from public.notifications where event_key = 'payment:e5555555-5555-5555-5555-555555555553:payout_completed';")
echo "Notifications for payout completed: $PAY_COMPL_NOTIF (expected exactly 1)"
if [[ "$PAY_COMPL_NOTIF" != "1" ]]; then echo "FAIL: expected 1 notification, got $PAY_COMPL_NOTIF"; exit 1; fi

echo ""
echo "--- Scenario 5: Payout FAILED ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/payout" \
  -H "Content-Type: application/json" \
  -d '{"payoutId": "syn-pay-failed-4", "status": "FAILED"}')
echo "Webhook HTTP status: $CODE"
if [[ "$CODE" != "200" ]]; then echo "FAIL: expected 200, got $CODE"; exit 1; fi

PAY_FAIL_NOTIF=$($PSQL -c "select count(*) from public.notifications where event_key = 'payment:e5555555-5555-5555-5555-555555555554:payout_failed';")
echo "Notifications for payout failed: $PAY_FAIL_NOTIF (expected exactly 1)"
if [[ "$PAY_FAIL_NOTIF" != "1" ]]; then echo "FAIL: expected 1 notification, got $PAY_FAIL_NOTIF"; exit 1; fi

echo ""
echo "--- Scenario 6: Refund ---"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/refund" \
  -H "Content-Type: application/json" \
  -d '{"refundId": "syn-refund-5", "status": "COMPLETED"}')
echo "Webhook HTTP status: $CODE"
if [[ "$CODE" != "200" ]]; then echo "FAIL: expected 200, got $CODE"; exit 1; fi

REFUND_NOTIF=$($PSQL -c "select count(*) from public.notifications where event_key = 'payment:e5555555-5555-5555-5555-555555555555:refunded';")
echo "Notifications for refund: $REFUND_NOTIF (expected exactly 1)"
if [[ "$REFUND_NOTIF" != "1" ]]; then echo "FAIL: expected 1 notification, got $REFUND_NOTIF"; exit 1; fi

echo ""
echo "ALL PAWAPAY SYNTHETIC WEBHOOK ROUND-TRIP TESTS PASSED!"
