-- Migration: Profile creation trigger on auth.users phone confirmation with fault isolation.

-- ── 1. Phone Normalizer Helper ────────────────────────────────────────────────
create or replace function public.normalize_phone_e164(p_phone text)
returns text
language sql
immutable
as $$
  select case
    when p_phone is null or trim(p_phone) = '' then null
    when left(trim(p_phone), 1) = '+' then trim(p_phone)
    else '+' || trim(p_phone)
  end;
$$;

-- ── 2. Trigger Function on auth.users phone confirmation ──────────────────────
-- Automatically provisions a minimal public.profiles row when phone_confirmed_at is confirmed.
-- Fault isolation: Wrapped in an exception block so unexpected errors (or downstream triggers)
-- log a warning and NEVER abort the auth confirmation transaction.
create or replace function public.handle_user_phone_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_phone text;
begin
  -- Test fault isolation simulation hook
  if current_setting('test.simulate_phone_confirmed_trigger_error', true) = 'true' then
    raise exception 'Simulated phone confirmed trigger error for test';
  end if;

  if new.phone_confirmed_at is not null and (old.phone_confirmed_at is null or tg_op = 'INSERT') then
    v_phone := public.normalize_phone_e164(new.phone);
    insert into public.profiles (id, phone, full_name, created_at, updated_at)
    values (new.id, v_phone, '', now(), now())
    on conflict (id) do update
    set
      phone = coalesce(public.profiles.phone, excluded.phone),
      updated_at = now();
  end if;

  return new;
exception
  when others then
    raise warning 'handle_user_phone_confirmed failed: % (SQLSTATE %)', sqlerrm, sqlstate;
    return new;
end;
$$;

drop trigger if exists on_auth_user_phone_confirmed on auth.users;
create trigger on_auth_user_phone_confirmed
  after insert or update of phone_confirmed_at on auth.users
  for each row execute function public.handle_user_phone_confirmed();
