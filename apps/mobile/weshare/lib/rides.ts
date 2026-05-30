import { createNotification } from './notifications';
import { supabase } from './supabase';

function formatDepartDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export type Ride = {
  id: string;
  postedByUserId: string;
  from: string;
  fromShort: string;
  fromLat: number | null;
  fromLng: number | null;
  to: string;
  toShort: string;
  toLat: number | null;
  toLng: number | null;
  departAtISO: string;
  seats: number;
  priceRwf: number;
  note?: string;
  status: 'active' | 'completed' | 'cancelled';
  createdAtISO: string;
};

function rowToRide(row: any): Ride {
  return {
    id: row.id,
    postedByUserId: row.posted_by,
    from: row.from_address,
    fromShort: row.from_short,
    fromLat: row.from_lat,
    fromLng: row.from_lng,
    to: row.to_address,
    toShort: row.to_short,
    toLat: row.to_lat,
    toLng: row.to_lng,
    departAtISO: row.depart_at,
    seats: row.seats,
    priceRwf: row.price_rwf,
    note: row.note ?? undefined,
    status: row.status ?? 'active',
    createdAtISO: row.created_at,
  };
}

/** Ride IDs where sum(confirmed booking seats) >= ride.seats (fully booked). */
async function getFullyBookedRideIds(): Promise<string[]> {
  const { data: bookings, error: bookingsError } = await supabase
    .from('bookings')
    .select('ride_id, seats')
    .eq('status', 'confirmed');

  if (bookingsError) throw new Error(bookingsError.message);
  if (!bookings?.length) return [];

  const confirmedByRide: Record<string, number> = {};
  for (const row of bookings as { ride_id: string; seats: number }[]) {
    confirmedByRide[row.ride_id] = (confirmedByRide[row.ride_id] ?? 0) + row.seats;
  }

  const rideIds = Object.keys(confirmedByRide);
  const { data: rides, error: ridesError } = await supabase
    .from('rides')
    .select('id, seats')
    .in('id', rideIds);

  if (ridesError) throw new Error(ridesError.message);

  return (rides ?? [])
    .filter((r: { id: string; seats: number }) => (confirmedByRide[r.id] ?? 0) >= r.seats)
    .map((r: { id: string }) => r.id);
}

export async function listRides(): Promise<Ride[]> {
  const fullRideIds = await getFullyBookedRideIds();
  const now = new Date().toISOString();
  let query = supabase
    .from('rides')
    .select('*')
    .eq('status', 'active')
    .gte('depart_at', now);
  if (fullRideIds.length > 0) {
    query = query.not('id', 'in', `(${fullRideIds.join(',')})`);
  }
  const { data, error } = await query.order('depart_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToRide);
}

/** Removes all rows from `rides` (e.g. clearing local/sample data). Requires appropriate RLS/policy. */
export async function clearRides(): Promise<void> {
  const { error } = await supabase.from('rides').delete();
  if (error) throw new Error(error.message);
}

export async function getRide(id: string): Promise<Ride | null> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return rowToRide(data);
}

export async function listMyRides(userId: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('posted_by', userId)
    .order('depart_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToRide);
}

export async function createRide(
  userId: string,
  fields: Omit<Ride, 'id' | 'postedByUserId' | 'status' | 'createdAtISO'>
): Promise<Ride> {
  const { data, error } = await supabase
    .from('rides')
    .insert({
      posted_by: userId,
      from_address: fields.from,
      from_short: fields.fromShort,
      from_lat: fields.fromLat,
      from_lng: fields.fromLng,
      to_address: fields.to,
      to_short: fields.toShort,
      to_lat: fields.toLat,
      to_lng: fields.toLng,
      depart_at: fields.departAtISO,
      seats: fields.seats,
      price_rwf: fields.priceRwf,
      note: fields.note ?? null,
      status: 'active',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToRide(data);
}

export async function updateRideStatus(
  rideId: string,
  status: 'active' | 'completed' | 'cancelled'
): Promise<string | null> {
  const { error } = await supabase
    .from('rides')
    .update({ status })
    .eq('id', rideId);
  if (error) return error.message;

  // On completion, thank the driver and every confirmed passenger (best-effort).
  if (status === 'completed') {
    try {
      const ride = await getRide(rideId);
      if (ride) {
        const { listBookingsForRide } = await import('./bookings');
        const bookings = await listBookingsForRide(rideId);
        const message = `Your ride from ${ride.fromShort} to ${ride.toShort} is complete. Thanks for riding with WeShare!`;
        const confirmedPassengerIds = [
          ...new Set(
            bookings.filter(b => b.status === 'confirmed').map(b => b.passengerId)
          ),
        ];
        for (const passengerId of confirmedPassengerIds) {
          await createNotification(passengerId, 'ride_completed', 'Ride complete', message, ride.id);
        }
        await createNotification(ride.postedByUserId, 'ride_completed', 'Ride complete', message, ride.id);
      }
    } catch {
      // Ignore notification failures.
    }
  }

  return null;
}

export async function cancelRide(rideId: string): Promise<string | null> {
  const { listBookingsForRide, updateBookingStatus } = await import('./bookings');
  const bookings = await listBookingsForRide(rideId);

  // Passengers whose active bookings are being cancelled (notify them after).
  const affectedPassengerIds: string[] = [];
  for (const booking of bookings) {
    if (booking.status === 'pending' || booking.status === 'confirmed') {
      const err = await updateBookingStatus(booking.id, 'cancelled');
      if (err) return err;
      affectedPassengerIds.push(booking.passengerId);
    }
  }

  const statusErr = await updateRideStatus(rideId, 'cancelled');
  if (statusErr) return statusErr;

  // Notify each affected passenger that the ride was cancelled (best-effort).
  try {
    const ride = await getRide(rideId);
    if (ride) {
      const message = `Your ${ride.fromShort} → ${ride.toShort} ride on ${formatDepartDate(ride.departAtISO)} has been cancelled by the driver`;
      for (const passengerId of [...new Set(affectedPassengerIds)]) {
        await createNotification(passengerId, 'ride_cancelled', 'Ride cancelled', message, ride.id);
      }
    }
  } catch {
    // Ignore notification failures.
  }

  return null;
}

/**
 * Partial update of an editable ride. Only the fields a driver is allowed to
 * tweak after posting are supported; route changes require a new ride.
 */
export async function updateRide(
  rideId: string,
  fields: Partial<Pick<Ride, 'departAtISO' | 'seats' | 'priceRwf' | 'note'>>
): Promise<string | null> {
  const updates: Record<string, unknown> = {};
  if (fields.departAtISO !== undefined) updates.depart_at = fields.departAtISO;
  if (fields.seats !== undefined) updates.seats = fields.seats;
  if (fields.priceRwf !== undefined) updates.price_rwf = fields.priceRwf;
  if (fields.note !== undefined) updates.note = fields.note ?? null;

  const { error } = await supabase
    .from('rides')
    .update(updates)
    .eq('id', rideId);
  return error ? error.message : null;
}

/**
 * Search rides by city/place.
 * A ride matches when:
 *   (from_short ILIKE %from% OR from_address ILIKE %from%)
 *   AND (to_short ILIKE %to% OR to_address ILIKE %to%)
 * so "Kigali" finds rides stored as "City of Kigali" and vice versa.
 */
export async function searchRides(fromQuery: string, toQuery: string): Promise<Ride[]> {
  const fullRideIds = await getFullyBookedRideIds();
  const now = new Date().toISOString();
  let query = supabase
    .from('rides')
    .select('*')
    .eq('status', 'active')
    .gte('depart_at', now)
    .or(`from_short.ilike.%${fromQuery.trim()}%,from_address.ilike.%${fromQuery.trim()}%`)
    .or(`to_short.ilike.%${toQuery.trim()}%,to_address.ilike.%${toQuery.trim()}%`);
  if (fullRideIds.length > 0) {
    query = query.not('id', 'in', `(${fullRideIds.join(',')})`);
  }
  const { data, error } = await query.order('depart_at', { ascending: true });


  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToRide);
}