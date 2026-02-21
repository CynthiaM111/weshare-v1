'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import VerifiedBadge from '@/components/VerifiedBadge'

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
  driver?: { id: string; name: string; phone: string; driverVerified?: boolean }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-900">Loading your trips...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">My Trips</h1>
              <p className="text-gray-600">Manage your posted trips and bookings</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  fetchMyTrips(true)
                  fetchUnreadCounts()
                }}
                disabled={refreshing}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
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
                href="/trips/new"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Post New Trip
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {trips.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <p className="text-gray-800 mb-6 text-lg font-semibold">You haven&apos;t posted any trips yet.</p>
            <Link
              href="/trips/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
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
                <div key={trip.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Trip Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          {trip.departCity} → {trip.destinationCity}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium">
                          {trip.departLocation} → {trip.destinationLocation}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            trip.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800'
                              : trip.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {trip.status}
                        </span>
                        {trip.driver?.driverVerified && <VerifiedBadge />}
                        <Link
                          href={`/trips/${trip.id}/edit`}
                          className="px-4 py-1.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteTrip(trip.id)}
                          className="px-4 py-1.5 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Trip Details */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Date</p>
                          <p className="text-sm font-bold text-gray-900">
                            {new Date(trip.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Time</p>
                          <p className="text-sm font-bold text-gray-900">{trip.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Car</p>
                          <p className="text-sm font-bold text-gray-900">{trip.carModel}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Price</p>
                          <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">RWF {trip.price.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Stats Section */}
                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl p-4 mb-6 border border-blue-100">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Available Seats</p>
                          <p className="text-lg font-bold text-gray-900">
                            {remainingSeats} <span className="text-sm text-gray-500 font-normal">/ {trip.availableSeats}</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Active Bookings</p>
                          <p className="text-lg font-bold text-gray-900">
                            {pendingBookings.length + confirmedBookings.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Cancelled</p>
                          <p className="text-lg font-bold text-red-600">
                            {cancelledBookings.length}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Total Bookings</p>
                          <p className="text-lg font-bold text-gray-900">
                            {trip.bookings.length}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bookings Sections */}
                    {pendingBookings.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          Pending Bookings ({pendingBookings.length})
                        </h4>
                        <div className="space-y-3">
                          {pendingBookings.map((booking) => (
                            <div key={booking.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900">{booking.passenger.name}</p>
                                  <p className="text-sm text-gray-600 mt-1">{booking.passenger.phone}</p>
                                  <p className="text-sm text-gray-700 mt-1">Seats: <span className="font-semibold">{booking.seats}</span></p>
                                </div>
                                <button
                                  onClick={() => handleConfirmBooking(booking.id)}
                                  className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg"
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
                      <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          Confirmed Bookings ({confirmedBookings.length})
                        </h4>
                        <div className="space-y-3">
                          {confirmedBookings.map((booking) => (
                            <div key={booking.id} className="bg-green-50 p-4 rounded-xl border border-green-200">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900">{booking.passenger.name}</p>
                                  <p className="text-sm text-gray-600 mt-1">{booking.passenger.phone}</p>
                                  <p className="text-sm text-gray-700 mt-1">Seats: <span className="font-semibold">{booking.seats}</span></p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Status: <span className="font-semibold text-green-700">{booking.status}</span>
                                  </p>
                                </div>
                                <Link
                                  href={`/messages/${booking.id}`}
                                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg relative"
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
                      <div className="mb-6">
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          Cancelled Bookings
                          <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                            {cancelledBookings.length}
                          </span>
                        </h4>
                        <div className="space-y-3">
                          {cancelledBookings.map((booking) => (
                            <div key={booking.id} className="bg-red-50 p-4 rounded-xl border border-red-200">
                              <div className="flex justify-between items-center">
                                <div className="flex-1">
                                  <p className="font-bold text-gray-900 line-through">{booking.passenger.name}</p>
                                  <p className="text-sm text-gray-600 mt-1">{booking.passenger.phone}</p>
                                  <p className="text-sm text-gray-700 mt-1">Seats: <span className="font-semibold">{booking.seats}</span></p>
                                  <p className="text-xs text-red-600 font-semibold mt-1">
                                    CANCELLED
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {new Date(booking.updatedAt).toLocaleDateString()} at {new Date(booking.updatedAt).toLocaleTimeString()}
                                  </p>
                                </div>
                                <div className="px-4 py-2 bg-red-100 text-red-800 rounded-xl text-sm font-semibold">
                                  Cancelled
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {trip.bookings.length === 0 && (
                      <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-200">
                        <p className="text-sm text-gray-600">No bookings yet for this trip.</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
