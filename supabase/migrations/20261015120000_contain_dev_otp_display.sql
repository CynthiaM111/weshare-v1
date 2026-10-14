-- Contain dev_otp_display: purge unlisted numbers and rows older than 10 minutes.

-- Add created_at column if not exists for auditing / cleanup tracking
alter table public.dev_otp_display
  add column if not exists created_at timestamptz not null default now();

-- 1. Delete dev_otp_display rows for unlisted numbers
-- (Default allowlist contains only the six internal test phones: +250780000001..+250780000006)
delete from public.dev_otp_display
where phone not in (
  '+250780000001',
  '+250780000002',
  '+250780000003',
  '+250780000004',
  '+250780000005',
  '+250780000006'
);

-- 2. Purge rows older than 10 minutes
delete from public.dev_otp_display
where expires_at < now() - interval '10 minutes'
   or created_at < now() - interval '10 minutes';
