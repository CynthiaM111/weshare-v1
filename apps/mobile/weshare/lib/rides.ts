import { supabase } from './supabase';

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

export async function listRides(): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('status', 'active')
    .order('depart_at', { ascending: true });

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
  return error ? error.message : null;
}

/**
 * Search rides by short city names.
 * Matches from_short against `from` query and to_short against `to` query.
 * Uses Supabase ilike for case-insensitive partial matching.
 */
export async function searchRides(fromQuery: string, toQuery: string): Promise<Ride[]> {
  const { data, error } = await supabase
    .from('rides')
    .select('*')
    .eq('status', 'active')
    .ilike('from_short', `%${fromQuery.trim()}%`)
    .ilike('to_short', `%${toQuery.trim()}%`)
    .order('depart_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToRide);
}