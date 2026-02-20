'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { VerifiedBadge } from '@/components/VerifiedBadge'

interface Trip {
  id: string
  departCity: string
  departLocation: string
  destinationCity: string
  destinationLocation: string
  date: string
  time: string
  availableSeats: number
  price: number
  carModel: string
  driver: {
    id: string
    name: string
    phone: string
    driverVerified?: boolean
  }
  bookings: Array<{
    id: string
    seats: number
    status: string
  }>
}

export default function BookTripPage() {
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string
  const [trip, setTrip] = useState<Trip | null>(null)
  const [seats, setSeats] = useState(1)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)
  const [userBookings, setUserBookings] = useState<any[]>([])

  useEffect(() => {
    fetchTrip()
    fetchUserBookings()
  }, [tripId])

  const fetchTrip = async () => {
    try {
      const response = await fetch(`/api/trips?id=${tripId}`)
      const data = await response.json()
      if (data.length > 0) {
        setTrip(data[0])
      }
    } catch (error) {
      console.error('Error fetching trip:', error)
      toast.error('Failed to load trip')
    } finally {
      setLoading(false)
    }
  }

  const fetchUserBookings = async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) return

    const user = JSON.parse(userStr)
    try {
      const response = await fetch('/api/bookings', {
        headers: {
          'x-user-id': user.id,
        },
      })
      if (response.ok) {
        const data = await response.json()
        setUserBookings(data)
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error)
    }
  }

  const handleBook = async () => {
    // Check if user is logged in
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      toast.error('Please login first')
      router.push(`/login?redirect=/trips/${tripId}/book`)
      return
    }

    const user = JSON.parse(userStr)
    setBooking(true)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          tripId,
          seats,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create booking')
      }

      toast.success('Booking created! Waiting for driver confirmation.')
      router.push('/bookings?success=true')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Trip not found</h2>
          <Link href="/trips" className="text-blue-600 hover:underline">
            Back to Trips
          </Link>
        </div>
      </div>
    )
  }

  const bookedSeats = trip.bookings
    .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
    .reduce((sum, b) => sum + b.seats, 0)
  const remainingSeats = trip.availableSeats - bookedSeats

  // Check if trip has passed - handle date properly
  // trip.date comes as ISO string from API (e.g., "2024-01-15T00:00:00.000Z")
  // Extract just the date part (YYYY-MM-DD)
  let dateStr: string
  if (typeof trip.date === 'string') {
    dateStr = trip.date.split('T')[0]
  } else {
    // If it's a Date object (shouldn't happen from API, but handle it)
    dateStr = new Date(trip.date).toISOString().split('T')[0]
  }
  
  // Combine date and time, ensuring proper format
  // trip.time should be in HH:MM format (e.g., "14:30")
  const tripDateTimeStr = `${dateStr}T${trip.time}:00`
  const tripDateTime = new Date(tripDateTimeStr)
  
  // Check if date is valid
  const isValidDate = !isNaN(tripDateTime.getTime())
  
  const now = new Date()
  // Only check hasPassed and canBook if date is valid
  // If date is invalid, allow booking (backend will validate)
  const hasPassed = isValidDate ? tripDateTime <= now : false
  const hoursUntilTrip = isValidDate ? (tripDateTime.getTime() - now.getTime()) / (1000 * 60 * 60) : Infinity
  const canBook = isValidDate ? hoursUntilTrip >= 1 : true

  // Check if user already has a booking for this trip (only if user is logged in)
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
  const isLoggedIn = !!userStr
  const currentUserId = userStr ? JSON.parse(userStr).id : null
  
  // Check if user is the driver of this trip
  const isOwnTrip = currentUserId && trip.driver.id === currentUserId
  
  const hasExistingBooking = isLoggedIn && userBookings.some(
    (b) => b.trip?.id === tripId && (b.status === 'PENDING' || b.status === 'CONFIRMED')
  )

  // Check if user has conflicting booking (same date/time) - only if logged in
  const hasConflictingBooking = isLoggedIn && userBookings.some(
    (b) => {
      if (!b.trip || (b.status !== 'PENDING' && b.status !== 'CONFIRMED')) return false
      const bookingDateStr = typeof b.trip.date === 'string' 
        ? b.trip.date.split('T')[0] 
        : new Date(b.trip.date).toISOString().split('T')[0]
      const tripDateStr = dateStr
      return bookingDateStr === tripDateStr && 
             b.trip.time === trip.time &&
             b.trip.id !== tripId
    }
  )

  // Only disable if:
  // - Currently booking
  // - No seats available
  // - Invalid seat selection
  // - Trip has passed (for everyone)
  // - Can't book (less than 1 hour - for everyone)
  // - User is the driver (own trip)
  // - User has existing/conflicting booking (only if logged in)
  const isDisabled = booking || 
                     remainingSeats === 0 || 
                     seats > remainingSeats || 
                     seats < 1 ||
                     hasPassed || 
                     !canBook ||
                     isOwnTrip ||
                     (isLoggedIn && (hasExistingBooking || hasConflictingBooking))

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Book Trip</h1>
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            {trip.departCity} → {trip.destinationCity}
          </h2>
          <div className="space-y-2">
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Route:</span> {trip.departLocation} → {trip.destinationLocation}</p>
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Date:</span> {new Date(trip.date).toLocaleDateString()}</p>
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Time:</span> {trip.time}</p>
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Car:</span> {trip.carModel}</p>
            <p className="text-gray-800 flex items-center gap-1.5">
              <span className="font-semibold text-gray-900">Driver:</span>
              {trip.driver.name}
              {trip.driver.driverVerified && <VerifiedBadge />}
            </p>
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Available Seats:</span> {remainingSeats}</p>
            <p className="text-xl font-bold text-blue-700">
              Price: RWF {trip.price.toLocaleString()} per seat
            </p>
            {hasPassed && (
              <p className="text-red-600 font-semibold mt-2">⚠️ This trip has already passed</p>
            )}
            {!hasPassed && !canBook && (
              <p className="text-red-600 font-semibold mt-2">⚠️ Bookings must be made at least 1 hour before departure</p>
            )}
            {remainingSeats === 0 && (
              <p className="text-red-600 font-semibold mt-2">⚠️ This trip is fully booked</p>
            )}
            {isOwnTrip && (
              <p className="text-purple-600 font-semibold mt-2">⚠️ This is your own trip. You cannot book it.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Booking Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Number of Seats</label>
              <input
                type="number"
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value))}
                min="1"
                max={remainingSeats}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-sm text-gray-700 mt-1">
                Maximum {remainingSeats} seat(s) available
              </p>
            </div>
            {(hasExistingBooking || hasConflictingBooking) && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                {hasExistingBooking && (
                  <p className="text-yellow-800 font-semibold mb-2">
                    ⚠️ You already have a booking for this trip
                  </p>
                )}
                {hasConflictingBooking && (
                  <p className="text-yellow-800 font-semibold">
                    ⚠️ You already have a booking for another trip at the same date and time
                  </p>
                )}
              </div>
            )}
            <div className="border-t border-gray-300 pt-4">
              <div className="flex justify-between mb-2 text-gray-800">
                <span className="font-medium">Price per seat:</span>
                <span className="font-semibold">RWF {trip.price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-gray-900">
                <span>Total:</span>
                <span className="text-blue-700">RWF {(trip.price * seats).toLocaleString()}</span>
              </div>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleBook}
                disabled={isDisabled}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>
              <Link
                href="/trips"
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

