-- Passenger-only driver details (phone + license plate) after booking.

create or replace function public.get_driver_booking_details(p_driver_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result json;
begin
  if auth.uid() is null then
    return null;
  end if;

  if not public.passenger_has_active_booking_with_driver(p_driver_id) then
    return null;
  end if;

  select json_build_object(
    'driver_id', p.id,
    'display_name', case
      when trim(coalesce(p.full_name, '')) = '' then 'WeShare Driver'
      else split_part(trim(p.full_name), ' ', 1)
    end,
    'full_name', coalesce(nullif(trim(p.full_name), ''), 'WeShare Driver'),
    'phone', coalesce(p.phone, ''),
    'license_plate', coalesce(dv.license_plate, ''),
    'car_model', coalesce(dv.car_model, 'Vehicle'),
    'car_color', coalesce(dv.car_color, 'Silver'),
    'driver_verified', dv.status = 'approved'
  )
  into result
  from public.profiles p
  inner join public.driver_verifications dv
    on dv.user_id = p.id and dv.status = 'approved'
  where p.id = p_driver_id;

  return result;
end;
$$;

revoke all on function public.get_driver_booking_details(uuid) from public;
grant execute on function public.get_driver_booking_details(uuid) to authenticated;
