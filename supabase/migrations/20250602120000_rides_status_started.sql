-- Allow ride lifecycle statuses used by the mobile app (start / complete / payout).
-- Run in Supabase Dashboard → SQL Editor if you see:
--   "new row for relation rides violates check constraint rides_status_check"

alter table public.rides drop constraint if exists rides_status_check;

alter table public.rides add constraint rides_status_check
  check (status in ('active', 'started', 'completed', 'cancelled', 'paid_out'));
