begin;
select plan(28);

-- 1. Schema check
select has_column('public', 'notifications', 'event_key', 'Column event_key exists on notifications');
select has_column('public', 'notifications', 'push_sent_at', 'Column push_sent_at exists on notifications');
select has_column('public', 'notifications', 'push_attempts', 'Column push_attempts exists on notifications');

-- Verify no INSERT policies remain on public.notifications for anon, authenticated, or public
select is(
  (
    select count(*)
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and cmd in ('INSERT', 'ALL')
      and ('anon' = any(roles) or 'authenticated' = any(roles) or 'public' = any(roles))
  ),
  0::bigint,
  'No INSERT policy remains for anon, authenticated, or public on public.notifications'
);

-- Setup test users
insert into auth.users (id, phone, phone_confirmed_at, role, aud)
values
  ('11111111-1111-1111-1111-111111111111', '+250788000001', now(), 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', '+250788000002', now(), 'authenticated', 'authenticated');

-- 2. Verify handle_user_phone_confirmed automatically created profiles
select is(
  (select count(*) from public.profiles where id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')),
  2::bigint,
  'Phone confirmation trigger created profiles for confirmed users'
);

-- Setup a test ride (posted by driver 11111111-1111-1111-1111-111111111111)
insert into public.rides (
  id, posted_by, from_short, to_short, from_address, to_address,
  depart_at, seats, price_rwf, status
) values (
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  'KGL', 'MUS', 'Kigali City Center', 'Musanze Bus Park',
  now() + interval '2 hours', 3, 3000, 'active'
);

-- 3. Server-side notification trigger on booking creation
insert into public.bookings (
  id, ride_id, passenger_id, seats, status
) values (
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  1, 'pending'
);

-- Verify two notifications were created: driver (new_booking) and passenger (booking_pending)
select is(
  (select count(*) from public.notifications where booking_id = '44444444-4444-4444-4444-444444444444'),
  2::bigint,
  'Booking trigger created notifications for driver and passenger'
);

-- 4. Idempotency test: Re-inserting the same event_key does not create duplicates
select lives_ok(
  $$
    insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
    values (
      '11111111-1111-1111-1111-111111111111',
      'new_booking',
      'Duplicate attempt',
      'This should be ignored',
      '33333333-3333-3333-3333-333333333333',
      '44444444-4444-4444-4444-444444444444',
      'booking:44444444-4444-4444-4444-444444444444:new_booking'
    )
    on conflict (user_id, event_key) do nothing
  $$,
  'Replaying insert with existing event_key on conflict do nothing executes safely'
);

select is(
  (select count(*) from public.notifications where event_key = 'booking:44444444-4444-4444-4444-444444444444:new_booking'),
  1::bigint,
  'Idempotent event_key guarantees exactly one row exists'
);

-- 5. Security Lockdown: Spoofed notification insertion from authenticated role is rejected
set local role authenticated;
set local "request.jwt.claim.sub" = '22222222-2222-2222-2222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

select throws_ok(
  $$
    insert into public.notifications (user_id, type, title, message, event_key)
    values ('11111111-1111-1111-1111-111111111111', 'new_booking', 'Spoofed', 'Hacked', 'spoofed:key')
  $$,
  '42501',
  null,
  'Authenticated user cannot directly insert notification rows'
);

-- 6. Authenticated user cannot delete notifications
select throws_ok(
  $$
    delete from public.notifications where user_id = '22222222-2222-2222-2222-222222222222'
  $$,
  '42501',
  null,
  'Authenticated user cannot delete notification rows'
);

-- 7. Authenticated user cannot call insert_notification RPC
select throws_ok(
  $$
    select public.insert_notification('11111111-1111-1111-1111-111111111111'::uuid, 'new_booking', 'X', 'Y')
  $$,
  '42501',
  null,
  'Authenticated user cannot execute insert_notification RPC'
);

-- 8. Authenticated user cannot modify non-read columns (title, event_key, etc.)
select throws_ok(
  $$
    update public.notifications
    set title = 'Tampered'
    where user_id = '22222222-2222-2222-2222-222222222222'
  $$,
  '42501',
  null,
  'Authenticated user cannot update title column (restricted column grant)'
);

-- 9. Authenticated user CAN mark their own notification as read
select lives_ok(
  $$
    update public.notifications
    set read = true
    where user_id = '22222222-2222-2222-2222-222222222222'
  $$,
  'Authenticated user can update read status on their own notifications'
);

-- 10. SMS Rate Limiting & Delivery RPC privilege checks
select throws_ok(
  $$
    select public.auth_sms_reserve('+250780000099', 60, 2, 1000)
  $$,
  '42501',
  null,
  'Authenticated user cannot execute auth_sms_reserve RPC'
);

select throws_ok(
  $$
    select public.auth_sms_mark('00000000-0000-0000-0000-000000000000'::uuid, 'sent')
  $$,
  '42501',
  null,
  'Authenticated user cannot execute auth_sms_mark RPC'
);

select throws_ok(
  $$
    select * from public.sms_delivery_rates
  $$,
  '42501',
  null,
  'Authenticated user cannot query sms_delivery_rates view'
);

-- Reset back to postgres superuser
reset role;

-- 11. Trigger rollback verification in savepoint
savepoint sp_rollback_test;
insert into public.bookings (
  id, ride_id, passenger_id, seats, status
) values (
  '55555555-5555-5555-5555-555555555555',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  1, 'pending'
);
rollback to savepoint sp_rollback_test;

select is(
  (select count(*) from public.notifications where booking_id = '55555555-5555-5555-5555-555555555555'),
  0::bigint,
  'Trigger rollback on aborted transaction leaves no orphaned notification rows'
);

-- 12. Fault Isolation: Payment UPDATE commits even when payment notification trigger throws error
insert into public.payments (
  id, booking_id, ride_id, passenger_id, driver_id, deposit_id,
  gross_amount, service_fee, net_amount, currency, passenger_phone, driver_phone,
  network, escrow_status, deposit_status, payout_status
) values (
  '99999999-9999-9999-9999-999999999991',
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'dep-fault-test-1',
  3000, 300, 2700, 'RWF', '+250788000002', '+250788000001',
  'MTN_MOMO_RWA', 'holding', 'pending', 'pending'
);

-- Simulate trigger failure
set test.simulate_payment_trigger_error = 'true';

select lives_ok(
  $$
    update public.payments
    set deposit_status = 'completed'
    where id = '99999999-9999-9999-9999-999999999991'
  $$,
  'Payment UPDATE succeeds and commits even when payment notification trigger raises error'
);

select is(
  (select deposit_status from public.payments where id = '99999999-9999-9999-9999-999999999991'),
  'completed',
  'Payment deposit_status successfully committed as completed despite notification trigger failure'
);

reset test.simulate_payment_trigger_error;

-- 13. Fault Isolation: auth.users phone_confirmed_at commits even when handle_user_phone_confirmed raises error
insert into auth.users (id, phone, role, aud)
values ('77777777-7777-7777-7777-777777777777', '+250788999888', 'authenticated', 'authenticated');

set test.simulate_phone_confirmed_trigger_error = 'true';

select lives_ok(
  $$
    update auth.users
    set phone_confirmed_at = now()
    where id = '77777777-7777-7777-7777-777777777777'
  $$,
  'auth.users phone confirmation succeeds and commits even when phone_confirmed trigger raises error'
);

select ok(
  (select phone_confirmed_at is not null from auth.users where id = '77777777-7777-7777-7777-777777777777'),
  'phone_confirmed_at was committed successfully despite trigger error'
);

reset test.simulate_phone_confirmed_trigger_error;

-- 14. Fault Isolation: auto_approve_dev_test_driver failure does not prevent profile update
set test.simulate_auto_approve_trigger_error = 'true';

select lives_ok(
  $$
    update public.profiles
    set phone = '+250780000001'
    where id = '11111111-1111-1111-1111-111111111111'
  $$,
  'Profile phone update succeeds even when auto_approve trigger raises error'
);

reset test.simulate_auto_approve_trigger_error;

-- 15. Legacy insert_notification path without p_event_key never inserts duplicate
select lives_ok(
  $$
    select public.insert_notification(
      '11111111-1111-1111-1111-111111111111'::uuid,
      'ride_started',
      'Test Ride Started',
      'Your ride is now starting',
      '33333333-3333-3333-3333-333333333333'::uuid,
      null
    );
    -- Second invocation with exact same parameters (missing p_event_key)
    select public.insert_notification(
      '11111111-1111-1111-1111-111111111111'::uuid,
      'ride_started',
      'Test Ride Started',
      'Your ride is now starting',
      '33333333-3333-3333-3333-333333333333'::uuid,
      null
    );
  $$,
  'Legacy insert_notification call without p_event_key executes idempotently'
);

select is(
  (
    select count(*)
    from public.notifications
    where user_id = '11111111-1111-1111-1111-111111111111'
      and type = 'ride_started'
      and event_key like 'legacy:%'
  ),
  1::bigint,
  'Legacy insert_notification path never creates duplicate notification rows'
);

-- 16. Purge safety: Dry-run view and safe unconfirmed user purge
-- Insert an unconfirmed user older than 8 days with no related rows
insert into auth.users (id, phone, created_at, role, aud)
values ('88888888-8888-8888-8888-888888888888', '+250788000888', now() - interval '8 days', 'authenticated', 'authenticated');

-- Candidate should appear in dry-run view
select is(
  (select count(*) from public.unconfirmed_users_purge_candidates where id = '88888888-8888-8888-8888-888888888888'),
  1::bigint,
  'unconfirmed_users_purge_candidates dry-run view correctly identifies orphan unconfirmed user'
);

-- Execute safe batch purge
select is(
  (select public.purge_unconfirmed_auth_users()),
  1,
  'purge_unconfirmed_auth_users successfully deleted 1 orphan user'
);

-- 17. SMS Provider Latency Stats view
select has_view('public', 'sms_provider_latency_stats', 'View sms_provider_latency_stats exists');

insert into public.sms_send_log (
  phone_e164, status, provider, latency_ms, send_outcome
) values (
  '+250788111222', 'sent', 'pindo', 230, 'success'
);

select ok(
  (select count(*) >= 1 from public.sms_provider_latency_stats where provider = 'pindo'),
  'sms_provider_latency_stats computes provider latency aggregations'
);

select * from finish();
rollback;
