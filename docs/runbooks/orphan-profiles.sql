-- ==============================================================================
-- Runbook: Orphan Profiles Audit and Backfill
-- File: docs/runbooks/orphan-profiles.sql
-- Description:
--   Identifies confirmed users in auth.users who do not have a corresponding
--   row in public.profiles, and provides an idempotent, safe backfill script
--   that normalizes phone numbers to E.164 with the leading '+' prefix.
--
-- CAUTION:
--   DO NOT EXECUTE AUTOMATICALLY.
--   Run Step 1 (count/inspection) first. Review results in production or staging
--   before deciding whether to execute Step 2 (backfill).
-- ==============================================================================

-- ── STEP 1: Audit and Count Orphan Confirmed Users ─────────────────────────────
-- Returns the exact number of users with a confirmed phone number who lack a profile.
select count(*) as orphan_confirmed_users_count
from auth.users u
left join public.profiles p on u.id = p.id
where u.phone_confirmed_at is not null
  and p.id is null;

-- (Optional) Inspect the orphan records to check phone formatting and creation dates:
select
  u.id,
  u.phone as raw_phone,
  case
    when u.phone is null or trim(u.phone) = '' then null
    when left(trim(u.phone), 1) = '+' then trim(u.phone)
    else '+' || trim(u.phone)
  end as e164_phone,
  u.raw_user_meta_data->>'full_name' as meta_full_name,
  u.phone_confirmed_at,
  u.created_at
from auth.users u
left join public.profiles p on u.id = p.id
where u.phone_confirmed_at is not null
  and p.id is null
order by u.created_at asc;


-- ── STEP 2: Idempotent Backfill (Run only after reviewing Step 1) ──────────────
-- Inserts a minimal public.profiles row for every confirmed user lacking one.
-- Phone numbers are explicitly normalized to E.164 with '+' prefix.
-- Safe and idempotent: Uses ON CONFLICT (id) DO NOTHING.
begin;

insert into public.profiles (
  id,
  phone,
  full_name,
  created_at,
  updated_at
)
select
  u.id,
  case
    when u.phone is null or trim(u.phone) = '' then null
    when left(trim(u.phone), 1) = '+' then trim(u.phone)
    else '+' || trim(u.phone)
  end as phone,
  coalesce(u.raw_user_meta_data->>'full_name', '') as full_name,
  coalesce(u.created_at, now()) as created_at,
  now() as updated_at
from auth.users u
left join public.profiles p on u.id = p.id
where u.phone_confirmed_at is not null
  and p.id is null
on conflict (id) do nothing;

-- ── STEP 3: Post-Backfill Verification ─────────────────────────────────────────
-- Should return 0 orphans remaining.
select count(*) as remaining_orphans
from auth.users u
left join public.profiles p on u.id = p.id
where u.phone_confirmed_at is not null
  and p.id is null;

commit;
