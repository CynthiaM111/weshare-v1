-- Driver verification, super-admin role, private document storage, and ride posting gate.

-- ── Profiles: super-admin flag ───────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false;

-- ── Driver verifications ─────────────────────────────────────────────────────
create table if not exists public.driver_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'none'
    check (status in ('none', 'pending', 'approved', 'rejected')),
  license_plate text,
  car_model text,
  car_color text,
  license_image_path text,
  car_image_path text,
  rejection_reason text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists driver_verifications_status_idx
  on public.driver_verifications (status);

create index if not exists driver_verifications_user_id_idx
  on public.driver_verifications (user_id);

-- ── Dev test numbers: auto-approved drivers for internal Play testing ───────
-- Supabase Auth test numbers +250780000001 … +250780000006 (OTP 123456).
create or replace function public.is_dev_test_phone(p_phone text)
returns boolean
language sql
immutable
as $$
  select p_phone ~ '^\+25078000000[1-6]$';
$$;

create or replace function public.ensure_driver_verification_row(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.driver_verifications (user_id, status)
  values (p_user_id, 'none')
  on conflict (user_id) do nothing;
end;
$$;

create or replace function public.auto_approve_dev_test_driver()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
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
end;
$$;

drop trigger if exists profiles_auto_approve_dev_test_driver on public.profiles;
create trigger profiles_auto_approve_dev_test_driver
  after insert or update of phone on public.profiles
  for each row
  execute function public.auto_approve_dev_test_driver();

-- Backfill existing dev test profiles.
insert into public.driver_verifications (user_id, status, license_plate, car_model, car_color, reviewed_at)
select
  p.id,
  'approved',
  'TEST-PLATE',
  'Test Vehicle',
  'Silver',
  now()
from public.profiles p
where public.is_dev_test_phone(coalesce(p.phone, ''))
on conflict (user_id) do update
set
  status = 'approved',
  license_plate = coalesce(public.driver_verifications.license_plate, excluded.license_plate),
  car_model = coalesce(public.driver_verifications.car_model, excluded.car_model),
  car_color = coalesce(public.driver_verifications.car_color, excluded.car_color),
  reviewed_at = coalesce(public.driver_verifications.reviewed_at, excluded.reviewed_at),
  updated_at = now();

-- ── Super-admin helper (run via SQL or set-super-admins.sh) ─────────────────
create or replace function public.set_super_admin_by_phone(p_phone text, p_is_admin boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set is_super_admin = p_is_admin
  where phone = p_phone;
end;
$$;

revoke all on function public.set_super_admin_by_phone(text, boolean) from public;
grant execute on function public.set_super_admin_by_phone(text, boolean) to service_role;

-- ── RLS: driver_verifications ────────────────────────────────────────────────
alter table public.driver_verifications enable row level security;

drop policy if exists "Users read own driver verification" on public.driver_verifications;
create policy "Users read own driver verification"
  on public.driver_verifications
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Super admins read all driver verifications" on public.driver_verifications;
create policy "Super admins read all driver verifications"
  on public.driver_verifications
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_super_admin = true
    )
  );

drop policy if exists "Users insert own driver verification" on public.driver_verifications;
create policy "Users insert own driver verification"
  on public.driver_verifications
  for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users update own pending driver verification" on public.driver_verifications;
create policy "Users update own pending driver verification"
  on public.driver_verifications
  for update
  to authenticated
  using (
    user_id = auth.uid()
    and status in ('none', 'rejected', 'pending')
  )
  with check (user_id = auth.uid());

drop policy if exists "Super admins review driver verifications" on public.driver_verifications;
create policy "Super admins review driver verifications"
  on public.driver_verifications
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_super_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_super_admin = true
    )
  );

-- Anyone authenticated can read approved driver car info (no phone — that stays on profiles).
drop policy if exists "Public read approved driver car info" on public.driver_verifications;
create policy "Public read approved driver car info"
  on public.driver_verifications
  for select
  to authenticated, anon
  using (status = 'approved');

-- ── Ride posting: verified drivers only ─────────────────────────────────────
drop policy if exists "Verified drivers insert rides" on public.rides;
create policy "Verified drivers insert rides"
  on public.rides
  for insert
  to authenticated
  with check (
    posted_by = auth.uid()
    and exists (
      select 1 from public.driver_verifications dv
      where dv.user_id = auth.uid() and dv.status = 'approved'
    )
  );

-- ── Storage: driver-verification bucket ────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'driver-verification',
  'driver-verification',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

drop policy if exists "Users upload own verification docs" on storage.objects;
create policy "Users upload own verification docs"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'driver-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users update own verification docs" on storage.objects;
create policy "Users update own verification docs"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'driver-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users read own verification docs" on storage.objects;
create policy "Users read own verification docs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'driver-verification'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Super admins read verification docs" on storage.objects;
create policy "Super admins read verification docs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'driver-verification'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_super_admin = true
    )
  );

-- ── Passenger may read driver phone only when they have a booking on a ride ──
create or replace function public.passenger_has_active_booking_with_driver(
  p_driver_id uuid,
  p_passenger_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.rides r on r.id = b.ride_id
    where r.posted_by = p_driver_id
      and b.passenger_id = p_passenger_id
      and b.status in ('pending', 'confirmed', 'started', 'completed')
  );
$$;

revoke all on function public.passenger_has_active_booking_with_driver(uuid, uuid) from public;
grant execute on function public.passenger_has_active_booking_with_driver(uuid, uuid) to authenticated;

create or replace function public.driver_has_passenger_on_ride(
  p_passenger_id uuid,
  p_driver_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    join public.rides r on r.id = b.ride_id
    where b.passenger_id = p_passenger_id
      and r.posted_by = p_driver_id
      and b.status in ('pending', 'confirmed', 'started', 'completed')
  );
$$;

revoke all on function public.driver_has_passenger_on_ride(uuid, uuid) from public;
grant execute on function public.driver_has_passenger_on_ride(uuid, uuid) to authenticated;

-- Masked driver info for browse (no phone). Callable by guests and signed-in users.
create or replace function public.get_public_driver_summaries(p_driver_ids uuid[])
returns table (
  driver_id uuid,
  display_name text,
  driver_verified boolean,
  car_model text,
  car_color text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    case
      when trim(coalesce(p.full_name, '')) = '' then 'WeShare Driver'
      else split_part(trim(p.full_name), ' ', 1)
    end,
    dv.status = 'approved',
    dv.car_model,
    dv.car_color
  from public.profiles p
  inner join public.driver_verifications dv on dv.user_id = p.id and dv.status = 'approved'
  where p.id = any (p_driver_ids);
$$;

revoke all on function public.get_public_driver_summaries(uuid[]) from public;
grant execute on function public.get_public_driver_summaries(uuid[]) to anon, authenticated;

drop policy if exists "Passengers read driver phone after booking" on public.profiles;
drop policy if exists "Profiles selective read" on public.profiles;
create policy "Profiles selective read"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.passenger_has_active_booking_with_driver(id)
    or public.driver_has_passenger_on_ride(id)
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.is_super_admin = true
    )
  );
