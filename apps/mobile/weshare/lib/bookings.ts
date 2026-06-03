import { getProfile, getProfiles, passengerDisplayName, profileFromRow, type UserProfile } from './auth/users';
import { createNotification } from './notifications';
import { getRide, rideFromRow, type Ride } from './rides';
import { supabase } from './supabase';

function formatDepartDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatDepartTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
}

export type Booking = {
  id: string;
  rideId: string;
  passengerId: string;
  seats: number;
  status: 'pending' | 'confirmed' | 'started' | 'cancelled' | 'completed';
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

/** Bookings that hold a seat (confirmed or in-progress on a started ride). */
const BOOKED_STATUSES = ['confirmed', 'started'] as const;

export async function getConfirmedSeatsForRide(rideId: string): Promise<number> {
  const { data, error } = await supabase
    .from('bookings')
    .select('seats')
    .eq('ride_id', rideId)
    .in('status', [...BOOKED_STATUSES]);

  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + row.seats, 0);
}

export async function createBooking(
  rideId: string,
  passengerId: string,
  seats: number
): Promise<Booking> {
  const ride = await getRide(rideId);
  if (!ride) throw new Error('Ride not found');

  const confirmedSeats = await getConfirmedSeatsForRide(rideId);
  if (confirmedSeats >= ride.seats) {
    throw new Error('No seats available');
  }

  const { data: existing, error: existingError } = await supabase
    .from('bookings')
    .select('id')
    .eq('ride_id', rideId)
    .eq('passenger_id', passengerId)
    .neq('status', 'cancelled');

  if (existingError) throw new Error(existingError.message);
  if ((existing ?? []).length > 0) {
    throw new Error('You already have a booking for this ride');
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({ ride_id: rideId, passenger_id: passengerId, seats, status: 'pending' })
    .select()
    .single();

  if (error) throw new Error(error.message);

  const booking = rowToBooking(data);

  // Notify the driver and the passenger (best-effort — never block the booking).
  try {
    const passenger = await getProfile(passengerId);
    const passengerName = passengerDisplayName(passenger, passengerId);
    const route = `${ride.fromShort} → ${ride.toShort}`;

    await createNotification(
      ride.postedByUserId,
      'new_booking',
      'New booking request',
      `${passengerName} requested ${seats} seat${seats === 1 ? '' : 's'} on your ${route} ride`,
      ride.id,
      booking.id
    );
    await createNotification(
      passengerId,
      'booking_pending',
      'Booking requested',
      `Your request for ${route} is pending driver confirmation`,
      ride.id,
      booking.id
    );
  } catch {
    // Ignore notification failures.
  }

  return booking;
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

export type BookingWithRide = Booking & { ride: Ride | null };

export async function listMyBookingsWithRides(passengerId: string): Promise<BookingWithRide[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      rides (*)
    `
    )
    .eq('passenger_id', passengerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data?.length) return [];

  let results = data.map((row: Record<string, unknown>) => {
    const embedded = row.rides;
    const rideRow = Array.isArray(embedded) ? embedded[0] : embedded;
    const ride =
      rideRow && typeof rideRow === 'object'
        ? rideFromRow(rideRow as Record<string, unknown>)
        : null;

    return { ...rowToBooking(row), ride };
  });

  if (results.some(b => !b.ride)) {
    const missingIds = [...new Set(results.filter(b => !b.ride).map(b => b.rideId))];
    const rides = await Promise.all(missingIds.map(id => getRide(id)));
    const rideById = Object.fromEntries(missingIds.map((id, i) => [id, rides[i]])) as Record<
      string,
      Ride | null
    >;
    results = results.map(b => ({ ...b, ride: b.ride ?? rideById[b.rideId] ?? null }));
  }

  return results;
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

export type BookingWithPassenger = Booking & { passengerProfile: UserProfile | null };

function profileFromJoinRow(raw: unknown): UserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (!row.id || typeof row.created_at !== 'string') return null;
  return profileFromRow({
    id: String(row.id),
    phone: (row.phone as string | null) ?? null,
    full_name: (row.full_name as string | null) ?? null,
    avatar_url: (row.avatar_url as string | null) ?? null,
    created_at: row.created_at,
  });
}

/** Bookings for a ride with passenger profiles (join + batch fallback). */
export async function listBookingsForRideWithPassengers(
  rideId: string
): Promise<BookingWithPassenger[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      *,
      profiles (
        id,
        full_name,
        phone,
        avatar_url,
        created_at
      )
    `
    )
    .eq('ride_id', rideId)
    .order('created_at', { ascending: true });

  if (!error && data) {
    return data.map((row: Record<string, unknown>) => {
      const embedded = row.profiles;
      const profile =
        Array.isArray(embedded) ? profileFromJoinRow(embedded[0]) : profileFromJoinRow(embedded);
      return { ...rowToBooking(row), passengerProfile: profile };
    });
  }

  const bookings = await listBookingsForRide(rideId);
  const profiles = await getProfiles(bookings.map(b => b.passengerId));
  return bookings.map(b => ({
    ...b,
    passengerProfile: profiles.get(b.passengerId) ?? null,
  }));
}

/**
 * Returns a map of rideId → number of non-cancelled bookings. Used to gate
 * driver-side actions like editing a ride.
 */
export async function countActiveBookingsForRides(rideIds: string[]): Promise<Record<string, number>> {
  if (rideIds.length === 0) return {};
  const { data, error } = await supabase
    .from('bookings')
    .select('ride_id')
    .in('ride_id', rideIds)
    .neq('status', 'cancelled');
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as { ride_id: string }[]) {
    counts[row.ride_id] = (counts[row.ride_id] ?? 0) + 1;
  }
  return counts;
}

/**
 * Aligns passenger bookings with ride lifecycle (after ride row is updated).
 * started: confirmed → started. completed: confirmed|started → completed.
 */
export async function syncBookingsForRideStatus(
  rideId: string,
  rideStatus: 'started' | 'completed'
): Promise<string | null> {
  if (rideStatus === 'started') {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'started' })
      .eq('ride_id', rideId)
      .eq('status', 'confirmed');
    return error?.message ?? null;
  }

  const { error } = await supabase
    .from('bookings')
    .update({ status: 'completed' })
    .eq('ride_id', rideId)
    .in('status', ['confirmed', 'started']);
  return error?.message ?? null;
}

export async function updateBookingStatus(
  bookingId: string,
  status: Booking['status'],
  cancelledBy?: 'driver' | 'passenger'
): Promise<string | null> {
  const { error } = await supabase
    .from('bookings')
    .update({ status })
    .eq('id', bookingId);
  if (error) return error.message;

  // Notify the affected party (best-effort — never block the status change).
  try {
    if (status === 'confirmed') {
      const booking = await getBooking(bookingId);
      const ride = booking ? await getRide(booking.rideId) : null;
      if (booking && ride) {
        const route = `${ride.fromShort} → ${ride.toShort}`;
        await createNotification(
          booking.passengerId,
          'booking_confirmed',
          'Booking confirmed! 🎉',
          `Your seat on ${route} is confirmed. Departing ${formatDepartDate(ride.departAtISO)} at ${formatDepartTime(ride.departAtISO)}`,
          ride.id,
          booking.id
        );
      }
    } else if (status === 'cancelled' && cancelledBy) {
      const booking = await getBooking(bookingId);
      const ride = booking ? await getRide(booking.rideId) : null;
      if (booking && ride) {
        const route = `${ride.fromShort} → ${ride.toShort}`;
        if (cancelledBy === 'driver') {
          // Driver declined/cancelled this booking — notify the passenger.
          await createNotification(
            booking.passengerId,
            'booking_cancelled',
            'Booking declined',
            `Your booking for ${route} was cancelled by the driver`,
            ride.id,
            booking.id
          );
        } else {
          // Passenger cancelled — notify the driver.
          const passenger = await getProfile(booking.passengerId);
          const passengerName = passengerDisplayName(passenger, booking.passengerId);
          await createNotification(
            ride.postedByUserId,
            'booking_cancelled',
            'Booking cancelled',
            `${passengerName} cancelled their booking on your ${route} ride`,
            ride.id,
            booking.id
          );
        }
      }
    }
  } catch {
    // Ignore notification failures.
  }

  return null;
}

export async function cancelBooking(bookingId: string): Promise<string | null> {
  return updateBookingStatus(bookingId, 'cancelled', 'passenger');
}

/** Driver-declines a booking: cancels it and notifies the passenger. */
export async function declineBooking(bookingId: string, rideId: string): Promise<string | null> {
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .eq('id', bookingId);
  if (error) return error.message;

  // Notify the passenger their request was declined (best-effort).
  try {
    const booking = await getBooking(bookingId);
    if (booking) {
      await createNotification(
        booking.passengerId,
        'booking_declined',
        'Booking declined',
        'Your booking request was not accepted by the driver. Try another ride on WeShare.',
        rideId,
        bookingId
      );
    }
  } catch {
    // Ignore notification failures.
  }

  return null;
}

export type DriverBookingCounts = { pending: number; confirmed: number };

/** Pending / confirmed bookings across all rides posted by this driver. */
export async function getDriverBookingCounts(driverId: string): Promise<DriverBookingCounts> {
  const { data: rides, error: ridesError } = await supabase
    .from('rides')
    .select('id')
    .eq('posted_by', driverId);

  if (ridesError) throw new Error(ridesError.message);

  const rideIds = (rides ?? []).map((r: { id: string }) => r.id);
  if (rideIds.length === 0) return { pending: 0, confirmed: 0 };

  const { data, error } = await supabase
    .from('bookings')
    .select('status')
    .in('ride_id', rideIds)
    .in('status', ['pending', 'confirmed']);

  if (error) throw new Error(error.message);

  let pending = 0;
  let confirmed = 0;
  for (const row of data ?? []) {
    if (row.status === 'pending') pending += 1;
    else if (row.status === 'confirmed') confirmed += 1;
  }
  return { pending, confirmed };
}