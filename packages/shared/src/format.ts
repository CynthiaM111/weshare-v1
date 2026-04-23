/** Format ISO date string for display (local calendar date). */
export function formatTripDate(isoDate: string): string {
  try {
    const d = new Date(isoDate)
    if (Number.isNaN(d.getTime())) return isoDate
    return d.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return isoDate
  }
}

export function formatPriceRwf(amount: number): string {
  return `${amount.toLocaleString()} RWF`
}

export function bookedSeatsOnTrip(trip: { bookings?: Array<{ seats: number; status: string }> }): number {
  const bookings = trip.bookings ?? []
  return bookings
    .filter((b) => ['PENDING', 'CONFIRMED', 'COMPLETED'].includes(b.status))
    .reduce((sum, b) => sum + b.seats, 0)
}

export function seatsRemaining(trip: { availableSeats: number; bookings?: Array<{ seats: number; status: string }> }): number {
  return trip.availableSeats - bookedSeatsOnTrip(trip)
}
