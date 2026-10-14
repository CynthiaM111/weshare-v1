-- Baseline schema: profiles, rides, bookings, payments, notifications, insert_notification RPC, triggers, and RLS policies.

-- Helper for updated_at timestamps
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ── 1. Profiles ─────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ── 2. Rides ────────────────────────────────────────────────────────────────
create table if not exists public.rides (
  id uuid primary key default gen_random_uuid(),
  posted_by uuid not null references public.profiles(id) on delete cascade,
  from_address text not null,
  from_short text not null,
  from_lat double precision,
  from_lng double precision,
  to_address text not null,
  to_short text not null,
  to_lat double precision,
  to_lng double precision,
  depart_at timestamptz not null,
  seats integer not null check (seats > 0),
  price_rwf integer not null check (price_rwf >= 0),
  note text,
  status text not null default 'active'
    constraint rides_status_check check (status in ('active', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists rides_posted_by_idx on public.rides(posted_by);
create index if not exists rides_depart_at_idx on public.rides(depart_at);
create index if not exists rides_status_idx on public.rides(status);

alter table public.rides enable row level security;

create policy "Rides are viewable by everyone"
  on public.rides for select
  using (true);

create policy "Users can insert their own rides"
  on public.rides for insert
  to authenticated
  with check (auth.uid() = posted_by);

create policy "Users can update their own rides"
  on public.rides for update
  to authenticated
  using (auth.uid() = posted_by)
  with check (auth.uid() = posted_by);

create policy "Users can delete their own rides"
  on public.rides for delete
  to authenticated
  using (auth.uid() = posted_by);

-- ── 3. Bookings ─────────────────────────────────────────────────────────────
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  seats integer not null check (seats > 0),
  status text not null default 'pending'
    constraint bookings_status_check check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

create index if not exists bookings_ride_id_idx on public.bookings(ride_id);
create index if not exists bookings_passenger_id_idx on public.bookings(passenger_id);
create index if not exists bookings_status_idx on public.bookings(status);

alter table public.bookings enable row level security;

create policy "Users can view own bookings or bookings for their rides"
  on public.bookings for select
  to authenticated
  using (
    auth.uid() = passenger_id
    or exists (
      select 1 from public.rides r
      where r.id = bookings.ride_id and r.posted_by = auth.uid()
    )
  );

create policy "Users can insert their own bookings"
  on public.bookings for insert
  to authenticated
  with check (auth.uid() = passenger_id);

create policy "Users can update their own bookings or bookings on their rides"
  on public.bookings for update
  to authenticated
  using (
    auth.uid() = passenger_id
    or exists (
      select 1 from public.rides r
      where r.id = bookings.ride_id and r.posted_by = auth.uid()
    )
  );

-- ── 4. Payments ─────────────────────────────────────────────────────────────
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  ride_id uuid not null references public.rides(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  deposit_id text,
  payout_id text,
  gross_amount numeric not null,
  service_fee numeric not null,
  net_amount numeric not null,
  currency text not null default 'RWF',
  passenger_phone text not null,
  driver_phone text,
  network text not null,
  escrow_status text not null default 'holding',
  deposit_status text not null default 'pending',
  payout_status text not null default 'pending',
  gps_verified boolean not null default false,
  driver_end_lat double precision,
  driver_end_lng double precision,
  distance_km numeric,
  refund_eligible_at timestamptz,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists payments_booking_id_idx on public.payments(booking_id);
create index if not exists payments_ride_id_idx on public.payments(ride_id);
create index if not exists payments_deposit_id_idx on public.payments(deposit_id);
create index if not exists payments_passenger_id_idx on public.payments(passenger_id);
create index if not exists payments_driver_id_idx on public.payments(driver_id);

alter table public.payments enable row level security;

create policy "Users can view their own payments"
  on public.payments for select
  to authenticated
  using (auth.uid() = passenger_id or auth.uid() = driver_id);

create policy "Authenticated users can insert payments"
  on public.payments for insert
  to authenticated
  with check (auth.uid() = passenger_id);

create policy "Users can update their own payments"
  on public.payments for update
  to authenticated
  using (auth.uid() = passenger_id or auth.uid() = driver_id);

-- ── 5. Notifications ────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  ride_id uuid references public.rides (id) on delete set null,
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "own notifications - select"
  on public.notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "own notifications - update"
  on public.notifications for update
  to authenticated
  using (auth.uid() = user_id);

create policy "Authenticated insert"
  on public.notifications for insert
  to authenticated
  with check (true);

-- ── 6. insert_notification RPC ──────────────────────────────────────────────
create or replace function public.insert_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_ride_id uuid default null,
  p_booking_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, title, message, ride_id, booking_id)
  values (p_user_id, p_type, p_title, p_message, p_ride_id, p_booking_id)
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.insert_notification(uuid, text, text, text, uuid, uuid) from public;
grant execute on function public.insert_notification(uuid, text, text, text, uuid, uuid) to anon, authenticated, service_role;
