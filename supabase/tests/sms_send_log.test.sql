begin;
select plan(13);

-- 1. Table structure and RLS checks
select has_table('public', 'sms_send_log', 'Table sms_send_log exists');
select has_column('public', 'sms_send_log', 'phone_e164', 'Column phone_e164 exists');
select has_column('public', 'sms_send_log', 'status', 'Column status exists');

-- 2. First reservation succeeds
select lives_ok(
  $$ select public.auth_sms_reserve('+250780000010', 60, 2, 1000) $$,
  'First reservation for phone succeeds'
);

-- 3. Cooldown test: immediate second call throws cooldown
select throws_ok(
  $$ select public.auth_sms_reserve('+250780000010', 60, 2, 1000) $$,
  'cooldown',
  'Second reservation within cooldown interval is denied with cooldown'
);

-- 4. Concurrency lock verification: advisory lock is held during transaction
select is(
  (
    select count(*)
    from pg_locks
    where locktype = 'advisory'
      and objid = hashtext('+250780000010')
      and mode = 'ExclusiveLock'
      and granted = true
  ),
  1::bigint,
  'Exclusive advisory transaction lock on hashtext(phone) is held for serialization'
);

-- 5. Hourly cap test: with min_interval = 0, can reserve up to max_per_hour
select lives_ok(
  $$ select public.auth_sms_reserve('+250780000020', 0, 2, 1000) $$,
  'First reservation with zero interval succeeds'
);

select lives_ok(
  $$ select public.auth_sms_reserve('+250780000020', 0, 2, 1000) $$,
  'Second reservation with zero interval succeeds'
);

select throws_ok(
  $$ select public.auth_sms_reserve('+250780000020', 0, 2, 1000) $$,
  'hourly_cap',
  'Third reservation exceeding hourly cap is denied with hourly_cap'
);

-- 6. Global cap test: reservation exceeding global cap
select throws_ok(
  $$ select public.auth_sms_reserve('+250780000030', 0, 100, 3) $$,
  'global_cap',
  'Reservation exceeding 24h global cap is denied with global_cap'
);

-- 7. Failed status does not count toward per-phone cap
do $$
declare
  v_id uuid;
begin
  v_id := public.auth_sms_reserve('+250780000040', 60, 1, 1000);
  -- Mark as failed due to provider outage
  perform public.auth_sms_mark(v_id, 'failed', null, null, 'PROVIDER_OUTAGE', 'pindo');
end;
$$;

select lives_ok(
  $$ select public.auth_sms_reserve('+250780000040', 60, 1, 1000) $$,
  'Failed status does not lock user out: next reservation succeeds'
);

-- 8. auth_sms_mark status and metadata update
do $$
declare
  v_id uuid;
begin
  v_id := public.auth_sms_reserve('+250780000050', 0, 10, 1000);
  perform public.auth_sms_mark(v_id, 'sent', 'PINDO-MSG-999', 42.5, null, 'pindo');
end;
$$;

select is(
  (select status from public.sms_send_log where phone_e164 = '+250780000050' order by created_at desc limit 1),
  'sent',
  'auth_sms_mark updates status to sent'
);

select is(
  (select provider_message_id from public.sms_send_log where phone_e164 = '+250780000050' order by created_at desc limit 1),
  'PINDO-MSG-999',
  'auth_sms_mark records provider message id'
);

select * from finish();
rollback;
