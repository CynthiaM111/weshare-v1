-- Migration: Scheduled pg_cron maintenance jobs, push delivery sweep, and safe unconfirmed user purge.

-- ── 1. Dry-Run View for Unconfirmed Auth User Purge Candidates ─────────────────
create or replace view public.unconfirmed_users_purge_candidates as
select
  u.id,
  u.phone,
  u.created_at,
  u.phone_confirmed_at
from auth.users u
where (u.phone_confirmed_at is null and u.email_confirmed_at is null and u.confirmed_at is null)
  and u.created_at < (pg_catalog.now() - interval '7 days')
  and not exists (select 1 from public.profiles p where p.id = u.id)
  and not exists (select 1 from public.bookings b where b.passenger_id = u.id)
  and not exists (select 1 from public.rides r where r.posted_by = u.id)
  and not exists (select 1 from public.payments py where py.passenger_id = u.id or py.driver_id = u.id)
  and not exists (select 1 from public.push_tokens pt where pt.user_id = u.id);

grant select on public.unconfirmed_users_purge_candidates to service_role;

-- ── 2. Safe Unconfirmed User Purge Function ───────────────────────────────────
-- Purges unconfirmed auth users in batches of at most 500.
-- If the deleted count exceeds 50, logs an alert in public.admin_site_alerts.
create or replace function public.purge_unconfirmed_auth_users()
returns integer
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_deleted_count integer := 0;
begin
  with to_delete as (
    select id
    from public.unconfirmed_users_purge_candidates
    limit 500
  )
  delete from auth.users
  where id in (select id from to_delete);

  get diagnostics v_deleted_count = row_count;

  if v_deleted_count > 50 then
    insert into public.admin_site_alerts (kind, title, message)
    values (
      'UNCONFIRMED_USER_PURGE_HIGH_VOLUME',
      'High volume unconfirmed user purge',
      'Purged ' || v_deleted_count || ' unconfirmed auth users in a single run.'
    );
  end if;

  return v_deleted_count;
exception
  when others then
    raise warning 'purge_unconfirmed_auth_users failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return 0;
end;
$$;

revoke all on function public.purge_unconfirmed_auth_users() from public, anon, authenticated;
grant execute on function public.purge_unconfirmed_auth_users() to service_role;

-- ── 3. Push Delivery Retry Sweep Function ─────────────────────────────────────
create or replace function public.sweep_pending_notification_pushes()
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_rec record;
  v_url text;
  v_secret text;
begin
  -- Retrieve secret securely from Vault or current_setting
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

  for v_rec in (
    select id, user_id, type, title, message, ride_id, booking_id, push_attempts
    from public.notifications
    where push_sent_at is null
      and push_attempts < 3
      and created_at < (pg_catalog.now() - interval '2 minutes')
    order by created_at asc
    limit 50
  ) loop
    if exists (select 1 from pg_available_extensions where name = 'pg_net') then
      if v_secret is not null and v_secret != '' then
        perform net.http_post(
          url := v_url,
          body := jsonb_build_object(
            'type', 'SWEEP',
            'table', 'notifications',
            'record', row_to_json(v_rec),
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
  end loop;
exception
  when others then
    raise warning 'sweep_pending_notification_pushes failed: % (SQLSTATE %)', sqlerrm, sqlstate;
end;
$$;

revoke all on function public.sweep_pending_notification_pushes() from public, anon, authenticated;
grant execute on function public.sweep_pending_notification_pushes() to service_role;

-- ── 4. pg_cron Maintenance Schedules ──────────────────────────────────────────
do $cron_schedules$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron with schema extensions;
      if exists (select 1 from information_schema.tables where table_schema = 'cron' and table_name = 'job') then
        -- 1. Purge sms_send_log older than 30 days daily at 03:00 UTC
        if not exists (select 1 from cron.job where jobname = 'purge_sms_send_log_30d') then
          perform cron.schedule(
            'purge_sms_send_log_30d',
            '0 3 * * *',
            $cmd$delete from public.sms_send_log where created_at < now() - interval '30 days'$cmd$
          );
        end if;

        -- 2. Push retry sweep every 5 minutes
        if not exists (select 1 from cron.job where jobname = 'sweep_pending_notification_pushes') then
          perform cron.schedule(
            'sweep_pending_notification_pushes',
            '*/5 * * * *',
            $cmd$select public.sweep_pending_notification_pushes()$cmd$
          );
        end if;

        -- 3. Purge unconfirmed auth users daily at 04:00 UTC
        if not exists (select 1 from cron.job where jobname = 'purge_unconfirmed_auth_users_7d') then
          perform cron.schedule(
            'purge_unconfirmed_auth_users_7d',
            '0 4 * * *',
            $cmd$select public.purge_unconfirmed_auth_users()$cmd$
          );
        end if;
      end if;
    exception
      when others then null;
    end;
  end if;
end;
$cron_schedules$;
