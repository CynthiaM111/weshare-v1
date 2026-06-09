import { supabase } from './supabase';

export type RideDriverPublic = {
  driverId: string;
  displayName: string;
  driverVerified: boolean;
  carModel: string;
  carColor: string;
};

export type RideDriverWithContact = RideDriverPublic & {
  fullName: string;
  phoneE164: string;
  licensePlate: string;
};

type BookingDetailsRow = {
  driver_id: string;
  display_name: string;
  full_name: string;
  phone: string;
  license_plate: string;
  car_model: string;
  car_color: string;
  driver_verified: boolean;
};

type SummaryRow = {
  driver_id: string;
  display_name: string;
  driver_verified: boolean;
  car_model: string | null;
  car_color: string | null;
};

/** Public driver info for browse (first name only, no phone). */
export async function getPublicDriverSummaries(
  driverIds: string[]
): Promise<Map<string, RideDriverPublic>> {
  const unique = [...new Set(driverIds.filter(Boolean))];
  const map = new Map<string, RideDriverPublic>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.rpc('get_public_driver_summaries', {
    p_driver_ids: unique,
  });

  if (error) throw new Error(error.message);

  for (const row of (data ?? []) as SummaryRow[]) {
    map.set(row.driver_id, {
      driverId: row.driver_id,
      displayName: row.display_name || 'WeShare Driver',
      driverVerified: row.driver_verified,
      carModel: row.car_model?.trim() || 'Vehicle',
      carColor: row.car_color?.trim() || 'Silver',
    });
  }
  return map;
}

/** Phone + license plate — only after the passenger has booked (server-enforced). */
export async function getDriverContact(driverId: string): Promise<RideDriverWithContact | null> {
  const { data, error } = await supabase.rpc('get_driver_booking_details', {
    p_driver_id: driverId,
  });

  if (error) throw new Error(error.message);
  if (!data || typeof data !== 'object') return null;

  const row = data as BookingDetailsRow;
  return {
    driverId: row.driver_id,
    displayName: row.display_name || 'WeShare Driver',
    driverVerified: row.driver_verified,
    carModel: row.car_model?.trim() || 'Vehicle',
    carColor: row.car_color?.trim() || 'Silver',
    fullName: row.full_name?.trim() || row.display_name || 'WeShare Driver',
    phoneE164: row.phone ?? '',
    licensePlate: row.license_plate?.trim() || '',
  };
}

export async function attachDriversToRides<T extends { postedByUserId: string }>(
  rides: T[],
  options?: { requireVerified?: boolean }
): Promise<(T & { driver?: RideDriverPublic })[]> {
  const driverIds = rides.map(r => r.postedByUserId);
  const summaries = await getPublicDriverSummaries(driverIds);
  const requireVerified = options?.requireVerified ?? false;

  const result: (T & { driver?: RideDriverPublic })[] = [];
  for (const ride of rides) {
    const driver = summaries.get(ride.postedByUserId);
    if (requireVerified && !driver) continue;
    result.push(driver ? { ...ride, driver } : ride);
  }
  return result;
}
