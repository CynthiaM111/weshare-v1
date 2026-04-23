'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  status: string
  bookings: Array<{
    id: string
    seats: number
    status: string
    passenger: {
      id: string
      name: string
      phone: string
    }
  }>
}

export default function DriverDashboard() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/driver')
      return
    }

    const user = JSON.parse(userStr)
    if (user.role !== 'DRIVER') {
      router.push('/trips')
      return
    }

    fetchTrips(user.id)
  }, [])

  const fetchTrips = async (driverId: string) => {
    try {
      // Fetch trips where user is the driver
      const response = await fetch('/api/trips')
      const allTrips = await response.json()
      const driverTrips = allTrips.filter((trip: Trip) => {
        // We need to check driverId - for now, fetch all and filter client-side
        // In production, add a driverId filter to the API
        return true // Placeholder
      })
      
      // Fetch bookings for each trip
      const tripsWithBookings = await Promise.all(
        driverTrips.map(async (trip: Trip) => {
          const bookingsResponse = await fetch('/api/bookings', {
            headers: {
              'x-user-id': driverId,
            },
          })
          // This is simplified - in production, add an endpoint to get bookings by trip
          return trip
        })
      )
      
      setTrips(tripsWithBookings)
    } catch (error) {
      console.error('Error fetching trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmBooking = async (bookingId: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) return

    const user = JSON.parse(userStr)

    try {
      const response = await fetch(`/api/bookings/${bookingId}/confirm`, {
        method: 'PATCH',
        headers: {
          'x-user-id': user.id,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to confirm booking')
      }

      // Refresh trips
      fetchTrips(user.id)
    } catch (error) {
      console.error('Error confirming booking:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Driver Dashboard</h1>
          <Link
            href="/trips/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Post New Trip
          </Link>
        </div>

        <div className="space-y-6">
          {trips.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <p className="text-gray-600 mb-4">You haven&apos;t posted any trips yet.</p>
              <Link href="/trips/new" className="text-blue-600 hover:underline">
                Post your first trip
              </Link>
            </div>
          ) : (
            trips.map((trip) => {
              const pendingBookings = trip.bookings.filter(b => b.status === 'PENDING')
              const confirmedBookings = trip.bookings.filter(b => b.status === 'CONFIRMED')

              return (
                <div key={trip.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {trip.departCity} → {trip.destinationCity}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {trip.departLocation} → {trip.destinationLocation}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        trip.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : trip.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {trip.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Date</p>
                      <p className="font-medium">{new Date(trip.date).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Time</p>
                      <p className="font-medium">{trip.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Car</p>
                      <p className="font-medium">{trip.carModel}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Price</p>
                      <p className="font-medium">RWF {trip.price.toLocaleString()}</p>
                    </div>
                  </div>

                  {pendingBookings.length > 0 && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold mb-2">Pending Bookings</h4>
                      {pendingBookings.map((booking) => (
                        <div key={booking.id} className="bg-yellow-50 p-3 rounded mb-2">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{booking.passenger.name}</p>
                              <p className="text-sm text-gray-600">{booking.passenger.phone}</p>
                              <p className="text-sm">Seats: {booking.seats}</p>
                            </div>
                            <button
                              onClick={() => handleConfirmBooking(booking.id)}
                              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {confirmedBookings.length > 0 && (
                    <div className="border-t pt-4 mt-4">
                      <h4 className="font-semibold mb-2">Confirmed Bookings</h4>
                      {confirmedBookings.map((booking) => (
                        <div key={booking.id} className="bg-green-50 p-3 rounded mb-2">
                          <p className="font-medium">{booking.passenger.name}</p>
                          <p className="text-sm text-gray-600">{booking.passenger.phone}</p>
                          <p className="text-sm">Seats: {booking.seats}</p>
                          <Link
                            href={`/messages/${booking.id}`}
                            className="text-blue-600 hover:underline text-sm mt-2 inline-block"
                          >
                            Message Passenger
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

