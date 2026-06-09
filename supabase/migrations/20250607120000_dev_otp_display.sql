-- Short-lived OTP codes for internal testing when OTP_DEV_BYPASS is enabled server-side.
-- No RLS policies: only Edge Functions (service role) can read/write.
create table if not exists public.dev_otp_display (
  phone text primary key,
  otp text not null,
  expires_at timestamptz not null
);

alter table public.dev_otp_display enable row level security;

create index if not exists dev_otp_display_expires_at_idx on public.dev_otp_display (expires_at);
