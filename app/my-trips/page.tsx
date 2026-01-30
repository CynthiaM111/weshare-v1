'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface Booking {
  id: string
  seats: number
  status: string
  createdAt: string
  updatedAt: string
  passenger: {
    id: string
    name: string
    phone: string
  }
}

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
  createdAt: string
  bookings: Booking[]
}

export default function MyTripsPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchMyTrips()
    fetchUnreadCounts()
    
    // Poll for unread messages every 5 seconds
    const interval = setInterval(() => {
      fetchUnreadCounts()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchMyTrips = async (isRefresh = false) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/my-trips')
      return
    }

    const user = JSON.parse(userStr)

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch('/api/trips/my-trips', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch trips')
      }

      const data = await response.json()
      setTrips(data)
    } catch (error) {
      console.error('Error fetching trips:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchUnreadCounts = async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) return

    const user = JSON.parse(userStr)

    try {
      const response = await fetch('/api/messages/unread', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (response.ok) {
        const counts = await response.json()
        setUnreadCounts(counts)
      }
    } catch (error) {
      console.error('Error fetching unread counts:', error)
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

      // Refresh trips and unread counts
      fetchMyTrips(true)
      fetchUnreadCounts()
    } catch (error) {
      console.error('Error confirming booking:', error)
    }
  }

  const handleDeleteTrip = async (tripId: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) return

    const user = JSON.parse(userStr)

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this trip? This action cannot be undone. Note: You can only delete trips with no confirmed bookings.')) {
      return
    }

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete trip')
      }

      toast.success('Trip deleted successfully!')
      fetchMyTrips(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete trip')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900">Loading your trips...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                fetchMyTrips(true)
                fetchUnreadCounts()
              }}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Refresh trips"
            >
              <svg
                className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link
              href="/"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium transition"
            >
              Home
            </Link>
            <Link
              href="/trips/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
            >
              Post New Trip
            </Link>
            <Link
              href="/trips"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
            >
              Browse All Trips
            </Link>
          </div>
        </div>

        {trips.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
            <p className="text-gray-800 mb-6 text-lg">You haven't posted any trips yet.</p>
            <Link
              href="/trips/new"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              Post Your First Trip
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {trips.map((trip) => {
              const confirmedBookings = trip.bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
              const pendingBookings = trip.bookings.filter(b => b.status === 'PENDING')
              const cancelledBookings = trip.bookings.filter(b => b.status === 'CANCELLED')
              const bookedSeats = confirmedBookings.reduce((sum, b) => sum + b.seats, 0)
              const remainingSeats = trip.availableSeats - bookedSeats

              return (
                <div key={trip.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {trip.departCity} → {trip.destinationCity}
                      </h3>
                      <p className="text-sm text-gray-700 font-medium">
                        {trip.departLocation} → {trip.destinationLocation}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          trip.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-800'
                            : trip.status === 'COMPLETED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {trip.status}
                      </span>
                      <Link
                        href={`/trips/${trip.id}/edit`}
                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDeleteTrip(trip.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Date</p>
                      <p className="font-semibold text-gray-900">
                        {new Date(trip.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Time</p>
                      <p className="font-semibold text-gray-900">{trip.time}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Car</p>
                      <p className="font-semibold text-gray-900">{trip.carModel}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-700 font-semibold">Price</p>
                      <p className="font-semibold text-blue-700">RWF {trip.price.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-300 pt-4 mb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Available Seats</p>
                        <p className="text-sm text-gray-900 font-bold">
                          {remainingSeats} / {trip.availableSeats}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Active Bookings</p>
                        <p className="text-sm text-gray-900 font-bold">
                          {pendingBookings.length + confirmedBookings.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Cancelled</p>
                        <p className="text-sm text-red-600 font-bold">
                          {cancelledBookings.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Total Bookings</p>
                        <p className="text-sm text-gray-900 font-bold">
                          {trip.bookings.length}
                        </p>
                      </div>
                    </div>
                  </div>

                  {pendingBookings.length > 0 && (
                    <div className="border-t border-gray-300 pt-4 mb-4">
                      <h4 className="font-bold text-gray-900 mb-3">Pending Bookings</h4>
                      <div className="space-y-2">
                        {pendingBookings.map((booking) => (
                          <div key={booking.id} className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-900">{booking.passenger.name}</p>
                                <p className="text-sm text-gray-700">{booking.passenger.phone}</p>
                                <p className="text-sm text-gray-700">Seats: {booking.seats}</p>
                              </div>
                              <button
                                onClick={() => handleConfirmBooking(booking.id)}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                              >
                                Confirm
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {confirmedBookings.length > 0 && (
                    <div className="border-t border-gray-300 pt-4 mb-4">
                      <h4 className="font-bold text-gray-900 mb-3">Confirmed Bookings</h4>
                      <div className="space-y-2">
                        {confirmedBookings.map((booking) => (
                          <div key={booking.id} className="bg-green-50 p-3 rounded-lg border border-green-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-900">{booking.passenger.name}</p>
                                <p className="text-sm text-gray-700">{booking.passenger.phone}</p>
                                <p className="text-sm text-gray-700">Seats: {booking.seats}</p>
                                <p className="text-xs text-gray-600">
                                  Status: <span className="font-semibold">{booking.status}</span>
                                </p>
                              </div>
                              <Link
                                href={`/messages/${booking.id}`}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium relative"
                              >
                                Message
                                {unreadCounts[booking.id] > 0 && (
                                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                    {unreadCounts[booking.id] > 9 ? '9+' : unreadCounts[booking.id]}
                                  </span>
                                )}
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {cancelledBookings.length > 0 && (
                    <div className="border-t border-gray-300 pt-4 mb-4">
                      <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <span>Cancelled Bookings</span>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                          {cancelledBookings.length}
                        </span>
                      </h4>
                      <div className="space-y-2">
                        {cancelledBookings.map((booking) => (
                          <div key={booking.id} className="bg-red-50 p-3 rounded-lg border border-red-200">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-semibold text-gray-900 line-through">{booking.passenger.name}</p>
                                <p className="text-sm text-gray-700">{booking.passenger.phone}</p>
                                <p className="text-sm text-gray-700">Seats: {booking.seats}</p>
                                <p className="text-xs text-red-600 font-semibold">
                                  Status: CANCELLED
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Cancelled: {new Date(booking.updatedAt).toLocaleDateString()} at {new Date(booking.updatedAt).toLocaleTimeString()}
                                </p>
                              </div>
                              <div className="px-3 py-1 bg-red-100 text-red-800 rounded-lg text-sm font-semibold">
                                Cancelled
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {trip.bookings.length === 0 && (
                    <div className="border-t border-gray-300 pt-4">
                      <p className="text-sm text-gray-600 text-center">No bookings yet for this trip.</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
