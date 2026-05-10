import { supabase } from './supabase';

export type Booking = {
  id: string;
  rideId: string;
  passengerId: string;
  seats: number;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  createdAtISO: string;
};

function rowToBooking(row: any): Booking {
  return {
    id: row.id,
    rideId: row.ride_id,
    passengerId: row.passenger_id,
    seats: row.seats,
    status: row.status,
    createdAtISO: row.created_at,
  };
}

export async function createBooking(
  rideId: string,
  passengerId: string,
  seats: number
): Promise<Booking> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({ ride_id: rideId, passenger_id: passengerId, seats, status: 'pending' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToBooking(data);
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  if (error || !data) return null;
  return rowToBooking(data);
}

export async function listMyBookings(passengerId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToBooking);
}

export async function listBookingsForRide(rideId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToBooking);
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status']
): Promise<string | null> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId);
  return error ? error.message : null;
}

export async function cancelBooking(bookingId: string): Promise<string | null> {
  return updateBookingStatus(bookingId, 'cancelled');
}