-- Send-side limiting and delivery logging for SMS OTP

-- ── 1. Table sms_send_log ────────────────────────────────────────────────────
create table if not exists public.sms_send_log (
  id uuid primary key default gen_random_uuid(),
  phone_e164 text not null,
  created_at timestamptz not null default now(),
  status text not null check (
    status in (
      'reserved',
      'sent',
      'failed',
      'accepted',
      'delivered',
      'undelivered',
      'expired',
      'rejected',
      'unknown'
    )
  ),
  provider text,
  provider_message_id text,
  remaining_balance numeric,
  error_code text,
  latency_ms integer,
  send_outcome text
);

create index if not exists sms_send_log_phone_created_idx
  on public.sms_send_log (phone_e164, created_at desc);

create unique index if not exists sms_send_log_provider_msg_uidx
  on public.sms_send_log (provider, provider_message_id)
  where provider is not null and provider_message_id is not null;

create index if not exists sms_send_log_breaker_idx
  on public.sms_send_log (provider, created_at desc)
  where provider is not null;

-- ── 2. RLS & Permissions: Service Role Only ───────────────────────────────────
alter table public.sms_send_log enable row level security;
revoke all on public.sms_send_log from public, anon, authenticated;
grant all on public.sms_send_log to service_role;

-- ── 3. Function auth_sms_reserve ─────────────────────────────────────────────
-- Limits are parameters passed from the Edge Function, not hardcoded.
-- Takes an advisory transaction lock on hashtext(p_phone) to serialize checks.
-- Status 'failed' does not count toward per-phone limits, preventing lockout on provider outage.
create or replace function public.auth_sms_reserve(
  p_phone text,
  p_min_interval_s int,
  p_max_per_hour int,
  p_global_cap_24h int
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_id uuid;
  v_recent_cnt int;
  v_global_cnt int;
begin
  -- 1. Advisory transaction lock serialized per phone
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_phone));

  -- 2. Check cooldown (min_interval_s)
  if p_min_interval_s > 0 then
    if exists (
      select 1
      from public.sms_send_log
      where phone_e164 = p_phone
        and created_at > (pg_catalog.now() - (p_min_interval_s || ' seconds')::interval)
        and status != 'failed'
    ) then
      raise exception 'cooldown';
    end if;
  end if;

  -- 3. Check hourly cap (max_per_hour)
  if p_max_per_hour > 0 then
    select count(*)
    into v_recent_cnt
    from public.sms_send_log
    where phone_e164 = p_phone
      and created_at > (pg_catalog.now() - interval '1 hour')
      and status != 'failed';

    if v_recent_cnt >= p_max_per_hour then
      raise exception 'hourly_cap';
    end if;
  end if;

  -- 4. Check global 24h cap (global_cap_24h)
  if p_global_cap_24h > 0 then
    select count(*)
    into v_global_cnt
    from public.sms_send_log
    where created_at > (pg_catalog.now() - interval '24 hours')
      and status != 'failed';

    if v_global_cnt >= p_global_cap_24h then
      raise exception 'global_cap';
    end if;
  end if;

  -- 5. Insert reserved row
  insert into public.sms_send_log (phone_e164, status)
  values (p_phone, 'reserved')
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.auth_sms_reserve(text, int, int, int) from public, anon, authenticated;
grant execute on function public.auth_sms_reserve(text, int, int, int) to service_role;

-- ── 4. Function auth_sms_mark ────────────────────────────────────────────────
drop function if exists public.auth_sms_mark(uuid, text, text, numeric, text, text);

create or replace function public.auth_sms_mark(
  p_id uuid,
  p_status text,
  p_provider_message_id text default null,
  p_balance numeric default null,
  p_error text default null,
  p_provider text default null,
  p_latency_ms int default null,
  p_send_outcome text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  update public.sms_send_log
  set
    status = coalesce(p_status, status),
    provider_message_id = coalesce(p_provider_message_id, provider_message_id),
    remaining_balance = coalesce(p_balance, remaining_balance),
    error_code = coalesce(p_error, error_code),
    provider = coalesce(p_provider, provider),
    latency_ms = coalesce(p_latency_ms, latency_ms),
    send_outcome = coalesce(p_send_outcome, send_outcome)
  where id = p_id;
end;
$$;

revoke all on function public.auth_sms_mark(uuid, text, text, numeric, text, text, int, text) from public, anon, authenticated;
grant execute on function public.auth_sms_mark(uuid, text, text, numeric, text, text, int, text) to service_role;

-- ── 5. Admin Site Alerts helper for SMS events ────────────────────────────────
create or replace function public.log_admin_sms_alert(
  p_kind text,
  p_title text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  if not exists (
    select 1
    from public.admin_site_alerts
    where kind = p_kind
      and created_at > (pg_catalog.now() - interval '1 hour')
  ) then
    insert into public.admin_site_alerts (kind, title, message)
    values (p_kind, p_title, p_message);
  end if;
end;
$$;

revoke all on function public.log_admin_sms_alert(text, text, text) from public, anon, authenticated;
grant execute on function public.log_admin_sms_alert(text, text, text) to service_role;

-- ── 6. Delivery Rates & Latency Monitoring Views ──────────────────────────────
create or replace view public.sms_delivery_rates as
select
  provider,
  date_trunc('hour', created_at) as window_hour,
  count(*) as total_sent,
  count(*) filter (where status = 'delivered') as delivered_count,
  count(*) filter (where status in ('failed', 'undelivered', 'rejected', 'expired')) as failed_count,
  round(
    (count(*) filter (where status = 'delivered')::numeric / nullif(count(*), 0) * 100),
    2
  ) as delivery_rate_pct
from public.sms_send_log
where provider is not null
group by provider, date_trunc('hour', created_at)
order by window_hour desc;

revoke all on public.sms_delivery_rates from public, anon, authenticated;
grant select on public.sms_delivery_rates to service_role;

create or replace view public.sms_provider_latency_stats as
select
  provider,
  count(*) as total_sends,
  percentile_cont(0.5) within group (order by latency_ms) as p50_latency_ms,
  percentile_cont(0.95) within group (order by latency_ms) as p95_latency_ms
from public.sms_send_log
where latency_ms is not null and provider is not null
group by provider;

revoke all on public.sms_provider_latency_stats from public, anon, authenticated;
grant select on public.sms_provider_latency_stats to service_role;
