-- Allow booking status to follow ride lifecycle (started / completed).
alter table public.bookings drop constraint if exists bookings_status_check;

alter table public.bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'started', 'cancelled', 'completed'));
