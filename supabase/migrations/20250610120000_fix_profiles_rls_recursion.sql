-- Fix infinite recursion: policies must not SELECT from profiles inside profiles RLS.
-- Use SECURITY DEFINER helper for super-admin checks instead.

create or replace function public.auth_is_super_admin(p_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_super_admin from public.profiles p where p.id = p_user_id),
    false
  );
$$;

revoke all on function public.auth_is_super_admin(uuid) from public;
grant execute on function public.auth_is_super_admin(uuid) to authenticated;

drop policy if exists "Profiles selective read" on public.profiles;
create policy "Profiles selective read"
  on public.profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or public.passenger_has_active_booking_with_driver(id)
    or public.driver_has_passenger_on_ride(id)
    or public.auth_is_super_admin()
  );

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Super admins read all driver verifications" on public.driver_verifications;
create policy "Super admins read all driver verifications"
  on public.driver_verifications
  for select
  to authenticated
  using (public.auth_is_super_admin());

drop policy if exists "Super admins review driver verifications" on public.driver_verifications;
create policy "Super admins review driver verifications"
  on public.driver_verifications
  for update
  to authenticated
  using (public.auth_is_super_admin())
  with check (public.auth_is_super_admin());

drop policy if exists "Super admins read verification docs" on storage.objects;
create policy "Super admins read verification docs"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'driver-verification'
    and public.auth_is_super_admin()
  );
