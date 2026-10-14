-- Migration: Notifications server-side hardening, idempotent triggers, and fault isolation.

-- ── 1. Notifications Table Schema Additions ──────────────────────────────────
alter table public.notifications
  add column if not exists event_key text,
  add column if not exists push_sent_at timestamptz,
  add column if not exists push_attempts integer not null default 0;

-- Backfill legacy event_keys if any exist
update public.notifications
set event_key = 'legacy:' || id
where event_key is null;

alter table public.notifications
  alter column event_key set not null;

create unique index if not exists notifications_user_event_key_uidx
  on public.notifications (user_id, event_key);

create index if not exists notifications_push_pending_idx
  on public.notifications (created_at asc)
  where push_sent_at is null and push_attempts < 3;

-- ── 2. Security Lockdown: Server-Side Creation Only ──────────────────────────
-- Dynamically drop all INSERT or ALL policies on public.notifications regardless of policy name
do $$
declare
  r record;
begin
  for r in (
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and cmd in ('INSERT', 'ALL')
  ) loop
    execute format('drop policy if exists %I on public.notifications', r.policyname);
  end loop;
end;
$$;

-- Revoke raw insert/delete from authenticated and anon
revoke insert, delete on public.notifications from public, anon, authenticated;
revoke update on public.notifications from public, anon, authenticated;

-- Grant select and column-specific update on 'read' only
grant select on public.notifications to authenticated;
grant update (read) on public.notifications to authenticated;

-- Lock down update policy so users can only update their own notifications
drop policy if exists "own notifications - update" on public.notifications;
create policy "own notifications - update"
  on public.notifications
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Restrict update trigger: guarantees only the 'read' column can ever change
create or replace function public.restrict_notification_update()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.type is distinct from old.type
     or new.title is distinct from old.title
     or new.message is distinct from old.message
     or new.ride_id is distinct from old.ride_id
     or new.booking_id is distinct from old.booking_id
     or new.created_at is distinct from old.created_at
     or new.event_key is distinct from old.event_key
     or new.push_sent_at is distinct from old.push_sent_at
     or new.push_attempts is distinct from old.push_attempts
  then
    raise exception 'Only the read column on notifications may be updated by users';
  end if;
  return new;
exception
  when others then
    raise warning 'restrict_notification_update failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists trg_restrict_notification_update on public.notifications;
create trigger trg_restrict_notification_update
  before update on public.notifications
  for each row execute function public.restrict_notification_update();

-- ── 3. insert_notification RPC ──────────────────────────────────────────────
-- Function behavior when p_event_key is missing (legacy notifyUser path):
--   When p_event_key is NULL, this function synthesizes a deterministic
--   idempotency key based on p_user_id, p_type, p_booking_id / p_ride_id, and
--   the message content hash. It executes INSERT with ON CONFLICT (user_id, event_key) DO NOTHING,
--   guaranteeing that multiple invocations with the same parameters never produce duplicate notifications.
--   If a row already exists, the existing notification id is returned.
--   Fault isolation: wrapped in an exception handler that logs a warning and returns null on unexpected failure.
create or replace function public.insert_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_ride_id uuid default null,
  p_booking_id uuid default null,
  p_event_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
  v_event_key text;
begin
  -- Deterministic event_key fallback for legacy callers lacking p_event_key
  v_event_key := coalesce(
    p_event_key,
    'legacy:' || p_user_id || ':' || p_type || ':' || coalesce(
      p_booking_id::text,
      p_ride_id::text,
      md5(coalesce(p_title, '') || ':' || coalesce(p_message, ''))
    )
  );

  insert into public.notifications (
    user_id, type, title, message, ride_id, booking_id, event_key
  ) values (
    p_user_id, p_type, p_title, p_message, p_ride_id, p_booking_id, v_event_key
  )
  on conflict (user_id, event_key) do nothing
  returning id into v_id;

  -- If conflict occurred and row was skipped, retrieve the existing id
  if v_id is null then
    select id into v_id
    from public.notifications
    where user_id = p_user_id and event_key = v_event_key;
  end if;

  return v_id;
exception
  when others then
    raise warning 'insert_notification failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return null;
end;
$$;

-- Drop previous 6-argument version to prevent parameter ambiguity
drop function if exists public.insert_notification(uuid, text, text, text, uuid, uuid);

revoke all on function public.insert_notification(uuid, text, text, text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.insert_notification(uuid, text, text, text, uuid, uuid, text) to service_role;

-- ── 4. Server-Side Notification Triggers on Bookings ──────────────────────────
create or replace function public.handle_booking_notification_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_ride record;
  v_passenger_name text;
  v_route text;
begin
  -- Test fault isolation simulation hook
  if current_setting('test.simulate_booking_trigger_error', true) = 'true' then
    raise exception 'Simulated booking trigger error for test';
  end if;

  -- Look up ride details
  select posted_by, from_short, to_short
  into v_ride
  from public.rides
  where id = coalesce(new.ride_id, old.ride_id);

  if not found then
    return new;
  end if;

  v_route := coalesce(v_ride.from_short, 'origin') || ' → ' || coalesce(v_ride.to_short, 'destination');

  select coalesce(nullif(trim(full_name), ''), 'A passenger')
  into v_passenger_name
  from public.profiles
  where id = coalesce(new.passenger_id, old.passenger_id);

  if v_passenger_name is null then
    v_passenger_name := 'A passenger';
  end if;

  -- 1. INSERT of new booking (status = 'pending')
  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
    values (
      v_ride.posted_by,
      'new_booking',
      'New booking request',
      v_passenger_name || ' requested ' || new.seats || ' seat(s) on ' || v_route || '.',
      new.ride_id,
      new.id,
      'booking:' || new.id || ':new'
    )
    on conflict (user_id, event_key) do nothing;

    insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
    values (
      new.passenger_id,
      'booking_pending',
      'Booking requested',
      'Your request for ' || new.seats || ' seat(s) on ' || v_route || ' was sent to the driver.',
      new.ride_id,
      new.id,
      'booking:' || new.id || ':pending'
    )
    on conflict (user_id, event_key) do nothing;

    return new;
  end if;

  -- 2. UPDATE of status
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'confirmed' then
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.passenger_id,
        'booking_confirmed',
        'Booking confirmed!',
        'Your seat on ' || v_route || ' is confirmed. View details in My Bookings.',
        new.ride_id,
        new.id,
        'booking:' || new.id || ':confirmed'
      )
      on conflict (user_id, event_key) do nothing;

    elsif new.status = 'cancelled' then
      if old.status = 'pending' then
        insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
        values (
          new.passenger_id,
          'booking_cancelled',
          'Booking declined',
          'Your request for ' || v_route || ' was declined by the driver.',
          new.ride_id,
          new.id,
          'booking:' || new.id || ':declined'
        )
        on conflict (user_id, event_key) do nothing;
      else
        insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
        values (
          new.passenger_id,
          'booking_cancelled',
          'Booking cancelled',
          'Your booking for ' || v_route || ' was cancelled.',
          new.ride_id,
          new.id,
          'booking:' || new.id || ':cancelled_passenger'
        )
        on conflict (user_id, event_key) do nothing;

        insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
        values (
          v_ride.posted_by,
          'booking_cancelled',
          'Booking cancelled',
          v_passenger_name || ' cancelled their seat on ' || v_route || '.',
          new.ride_id,
          new.id,
          'booking:' || new.id || ':cancelled_driver'
        )
        on conflict (user_id, event_key) do nothing;
      end if;

    elsif new.status = 'started' then
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.passenger_id,
        'ride_started',
        'Ride started',
        'Your ride from ' || v_route || ' has started.',
        new.ride_id,
        new.id,
        'booking:' || new.id || ':started'
      )
      on conflict (user_id, event_key) do nothing;

    elsif new.status = 'completed' then
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.passenger_id,
        'ride_completed',
        'Ride complete',
        'You have arrived at your destination on ' || v_route || '.',
        new.ride_id,
        new.id,
        'booking:' || new.id || ':completed'
      )
      on conflict (user_id, event_key) do nothing;
    end if;
  end if;

  return new;
exception
  when others then
    raise warning 'handle_booking_notification_trigger failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists trg_booking_notifications on public.bookings;
create trigger trg_booking_notifications
  after insert or update of status on public.bookings
  for each row execute function public.handle_booking_notification_trigger();

-- ── 5. Server-Side Notification Triggers on Payments ──────────────────────────
create or replace function public.handle_payment_notification_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Test fault isolation simulation hook
  if current_setting('test.simulate_payment_trigger_error', true) = 'true' then
    raise exception 'Simulated payment trigger error for test';
  end if;

  -- 1. Deposit Status transitions
  if new.deposit_status is distinct from old.deposit_status then
    if new.deposit_status = 'completed' then
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.driver_id,
        'payment_received',
        'Payment received',
        'Payment of ' || new.net_amount || ' RWF received for your ride',
        new.ride_id,
        new.booking_id,
        'payment:' || new.id || ':deposit_completed_driver'
      )
      on conflict (user_id, event_key) do nothing;

      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.passenger_id,
        'booking_confirmed',
        'Payment confirmed',
        'Your payment of ' || new.gross_amount || ' RWF was successful',
        new.ride_id,
        new.booking_id,
        'payment:' || new.id || ':deposit_completed_passenger'
      )
      on conflict (user_id, event_key) do nothing;

    elsif new.deposit_status = 'failed' then
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.passenger_id,
        'booking_cancelled',
        'Payment failed',
        'Payment could not be completed. Your booking request was cancelled.',
        new.ride_id,
        new.booking_id,
        'payment:' || new.id || ':deposit_failed'
      )
      on conflict (user_id, event_key) do nothing;
    end if;
  end if;

  -- 2. Payout Status transitions
  if new.payout_status is distinct from old.payout_status then
    if new.payout_status = 'completed' then
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.driver_id,
        'payment_received',
        'Payout sent',
        'Payout of ' || new.net_amount || ' RWF sent to your mobile money',
        new.ride_id,
        new.booking_id,
        'payment:' || new.id || ':payout_completed'
      )
      on conflict (user_id, event_key) do nothing;

    elsif new.payout_status = 'failed' then
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.driver_id,
        'payment_received',
        'Payout failed',
        'Payout could not be processed automatically. Support has been notified.',
        new.ride_id,
        new.booking_id,
        'payment:' || new.id || ':payout_failed'
      )
      on conflict (user_id, event_key) do nothing;
    end if;
  end if;

  -- 3. Escrow Status transitions (Refunds)
  if new.escrow_status is distinct from old.escrow_status then
    if new.escrow_status = 'refunded' then
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        new.passenger_id,
        'booking_cancelled',
        'Refund sent',
        'Your refund of ' || new.gross_amount || ' RWF has been processed to your mobile money.',
        new.ride_id,
        new.booking_id,
        'payment:' || new.id || ':refunded'
      )
      on conflict (user_id, event_key) do nothing;
    end if;
  end if;

  return new;
exception
  when others then
    raise warning 'handle_payment_notification_trigger failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists trg_payment_notifications on public.payments;
create trigger trg_payment_notifications
  after update of deposit_status, payout_status, escrow_status on public.payments
  for each row execute function public.handle_payment_notification_trigger();

-- ── 6. Server-Side Notification Triggers on Rides (Cancellation) ──────────────
create or replace function public.handle_ride_notification_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_b record;
  v_route text;
begin
  -- Test fault isolation simulation hook
  if current_setting('test.simulate_ride_trigger_error', true) = 'true' then
    raise exception 'Simulated ride trigger error for test';
  end if;

  if tg_op = 'UPDATE' and new.status = 'cancelled' and old.status != 'cancelled' then
    v_route := coalesce(new.from_short, 'origin') || ' → ' || coalesce(new.to_short, 'destination');

    for v_b in (
      select id, passenger_id
      from public.bookings
      where ride_id = new.id
        and status in ('pending', 'confirmed')
    ) loop
      insert into public.notifications (user_id, type, title, message, ride_id, booking_id, event_key)
      values (
        v_b.passenger_id,
        'ride_cancelled',
        'Ride cancelled',
        'Your ride from ' || v_route || ' was cancelled by the driver.',
        new.id,
        v_b.id,
        'ride:' || new.id || ':booking:' || v_b.id || ':ride_cancelled'
      )
      on conflict (user_id, event_key) do nothing;
    end loop;
  end if;

  return new;
exception
  when others then
    raise warning 'handle_ride_notification_trigger failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists trg_ride_notifications on public.rides;
create trigger trg_ride_notifications
  after update of status on public.rides
  for each row execute function public.handle_ride_notification_trigger();

-- ── 7. Push Delivery Dispatch Trigger (Zero Secret Literals) ──────────────────
create or replace function public.handle_notification_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_url text;
  v_secret text;
begin
  -- Attempt to retrieve push webhook secret from Vault; fallback to current_setting
  begin
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'vault' and table_name = 'decrypted_secrets'
    ) then
      select decrypted_secret into v_secret
      from vault.decrypted_secrets
      where name = 'send_push_secret'
      limit 1;
    end if;
  exception
    when others then
      v_secret := null;
  end;

  if v_secret is null or v_secret = '' then
    v_secret := current_setting('app.settings.send_push_secret', true);
  end if;

  v_url := coalesce(
    current_setting('app.settings.send_push_url', true),
    'http://127.0.0.1:54321/functions/v1/send-push'
  );

  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    if v_secret is not null and v_secret != '' then
      perform net.http_post(
        url := v_url,
        body := jsonb_build_object(
          'type', 'INSERT',
          'table', 'notifications',
          'record', row_to_json(new),
          'schema', 'public'
        ),
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-webhook-secret', v_secret
        ),
        timeout_milliseconds := 5000
      );
    end if;
  end if;

  return new;
exception
  when others then
    raise warning 'handle_notification_push_webhook failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists trg_notification_push_webhook on public.notifications;
create trigger trg_notification_push_webhook
  after insert on public.notifications
  for each row execute function public.handle_notification_push_webhook();

-- ── 8. Fault Isolation on auto_approve_dev_test_driver ────────────────────────
-- Protects phone updates from raising errors if driver verification provisioning fails
create or replace function public.auto_approve_dev_test_driver()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Test fault isolation simulation hook
  if current_setting('test.simulate_auto_approve_trigger_error', true) = 'true' then
    raise exception 'Simulated auto-approve trigger error for test';
  end if;

  perform public.ensure_driver_verification_row(new.id);

  if public.is_dev_test_phone(coalesce(new.phone, '')) then
    update public.driver_verifications
    set
      status = 'approved',
      license_plate = coalesce(license_plate, 'TEST-PLATE'),
      car_model = coalesce(car_model, 'Test Vehicle'),
      car_color = coalesce(car_color, 'Silver'),
      reviewed_at = coalesce(reviewed_at, now()),
      updated_at = now()
    where user_id = new.id;
  end if;

  return new;
exception
  when others then
    raise warning 'auto_approve_dev_test_driver failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return new;
end;
$$;
