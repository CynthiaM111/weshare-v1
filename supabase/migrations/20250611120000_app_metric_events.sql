-- Client-side metrics for internal testing (search, payments, errors).
-- Admin dashboard reads via service role; clients may insert only.

create table if not exists public.app_metric_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('search', 'payment', 'error')),
  user_id uuid references auth.users (id) on delete set null,
  success boolean not null default true,
  duration_ms integer,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_metric_events_type_created_idx
  on public.app_metric_events (event_type, created_at desc);

create index if not exists app_metric_events_created_idx
  on public.app_metric_events (created_at desc);

alter table public.app_metric_events enable row level security;

create policy "Clients insert metrics"
  on public.app_metric_events
  for insert
  to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
