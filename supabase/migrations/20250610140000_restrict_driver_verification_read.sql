-- Remove broad read on driver_verifications (exposed license_plate + document paths).
-- Public browse uses get_public_driver_summaries(); post-booking uses get_driver_booking_details().

drop policy if exists "Public read approved driver car info" on public.driver_verifications;
