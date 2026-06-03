-- Passengers must read ride details for bookings after the ride leaves "active".
-- Use SECURITY DEFINER to avoid infinite recursion between rides <-> bookings RLS policies.

drop policy if exists "Passengers read booked rides" on public.rides;

create or replace function public.passenger_has_booking_on_ride(p_ride_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.bookings b
    where b.ride_id = p_ride_id
      and b.passenger_id = auth.uid()
  );
$$;

revoke all on function public.passenger_has_booking_on_ride(uuid) from public;
grant execute on function public.passenger_has_booking_on_ride(uuid) to authenticated;

create policy "Passengers read booked rides"
  on public.rides
  for select
  to authenticated
  using (public.passenger_has_booking_on_ride(id));
