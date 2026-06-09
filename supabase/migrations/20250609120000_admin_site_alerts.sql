-- In-site admin alerts when drivers submit verification (reviewed on weshare.rw admin page).

create table if not exists public.admin_site_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'driver_verification',
  title text not null,
  message text not null,
  driver_user_id uuid references public.profiles(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists admin_site_alerts_unread_idx
  on public.admin_site_alerts (created_at desc)
  where read_at is null;

alter table public.admin_site_alerts enable row level security;

-- No client policies — web admin API uses service role only.

create or replace function public.notify_admin_site_driver_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_name text;
  driver_phone text;
begin
  if new.status = 'pending'
     and (tg_op = 'INSERT' or old.status is distinct from 'pending') then
    select
      coalesce(nullif(trim(p.full_name), ''), 'Unknown driver'),
      coalesce(p.phone, '')
    into driver_name, driver_phone
    from public.profiles p
    where p.id = new.user_id;

    insert into public.admin_site_alerts (kind, title, message, driver_user_id)
    values (
      'driver_verification',
      'New driver verification',
      driver_name
        || case when driver_phone <> '' then ' (' || driver_phone || ')' else '' end
        || ' submitted vehicle details for review.',
      new.user_id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists driver_verification_admin_site_alert on public.driver_verifications;
create trigger driver_verification_admin_site_alert
  after insert or update on public.driver_verifications
  for each row
  execute function public.notify_admin_site_driver_verification();
