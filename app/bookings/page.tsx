'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

interface Booking {
  id: string
  seats: number
  status: string
  createdAt: string
  trip: {
    id: string
    departCity: string
    departLocation: string
    destinationCity: string
    destinationLocation: string
    date: string
    time: string
    price: number
    carModel: string
    driver: {
      id: string
      name: string
      phone: string
    }
  }
}

export default function BookingsPage() {
  const router = useRouter()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    fetchBookings()
    fetchUnreadCounts()
    
    // Poll for unread messages every 5 seconds
    const interval = setInterval(() => {
      fetchUnreadCounts()
    }, 5000)
    
    // Check if coming from a successful booking
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('success') === 'true') {
        toast.success('Booking created successfully!', {
          duration: 3000,
        })
        // Remove the query parameter from URL
        router.replace('/bookings', { scroll: false })
      }
    }
    
    return () => clearInterval(interval)
  }, [router])

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

  const fetchBookings = async (isRefresh = false) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/bookings')
      return
    }

    const user = JSON.parse(userStr)

    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const response = await fetch('/api/bookings', {
        headers: {
          'x-user-id': user.id,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }

      const data = await response.json()
      setBookings(data)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) return

    const user = JSON.parse(userStr)

    // Confirm cancellation
    if (!confirm('Are you sure you want to cancel this booking? Cancellations must be made at least 1 hour before departure.')) {
      return
    }

    try {
      const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'PATCH',
        headers: {
          'x-user-id': user.id,
        },
      })

      // Check if response is JSON
      const contentType = response.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text()
        console.error('Non-JSON response:', text)
        throw new Error('Invalid response from server. Please try again.')
      }

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking')
      }

      toast.success('Booking cancelled successfully!')
      fetchBookings(true)
      fetchUnreadCounts()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel booking')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900">Loading bookings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                fetchBookings(true)
                fetchUnreadCounts()
              }}
              disabled={refreshing}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Refresh bookings"
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
              href="/trips"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
            >
              Browse Trips
            </Link>
            <Link
              href="/bus-trips"
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
            >
              Bus Tickets
            </Link>
          </div>
        </div>
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
            <p className="text-gray-800 mb-6 text-lg">You have no bookings yet.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium transition"
              >
                Go Home
              </Link>
              <Link
                href="/trips"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
              >
                Browse Carpooling Trips
              </Link>
              <Link
                href="/bus-trips"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition"
              >
                Book Bus Tickets
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {booking.trip.departCity} → {booking.trip.destinationCity}
                    </h3>
                    <p className="text-sm text-gray-700 font-medium">
                      {booking.trip.departLocation} → {booking.trip.destinationLocation}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-semibold ${booking.status === 'CONFIRMED'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'COMPLETED'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.status === 'CANCELLED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                  >
                    {booking.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-700 font-semibold">Date</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(booking.trip.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 font-semibold">Time</p>
                    <p className="font-semibold text-gray-900">{booking.trip.time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 font-semibold">Seats</p>
                    <p className="font-semibold text-gray-900">{booking.seats}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 font-semibold">Total Price</p>
                    <p className="font-bold text-blue-700">
                      RWF {(booking.trip.price * booking.seats).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="border-t border-gray-300 pt-4">
                  <div className="mb-4 space-y-2">
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold text-gray-900">Driver:</span> {booking.trip.driver.name} ({booking.trip.driver.phone})
                    </p>
                    <p className="text-sm text-gray-800">
                      <span className="font-semibold text-gray-900">Car:</span> {booking.trip.carModel}
                    </p>
                  </div>
                  
                  {/* Actions Section */}
                  <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-3">
                      {booking.status === 'CONFIRMED' && (
                        <Link
                          href={`/messages/${booking.id}`}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition shadow-sm hover:shadow-md"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Message Driver
                          {unreadCounts[booking.id] > 0 && (
                            <span className="ml-1 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                              {unreadCounts[booking.id] > 9 ? '9+' : unreadCounts[booking.id]}
                            </span>
                          )}
                        </Link>
                      )}
                    </div>
                    
                    {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (() => {
                      // Check if booking can be cancelled (at least 1 hour before departure)
                      let tripDateTime: Date
                      try {
                        const dateStr = typeof booking.trip.date === 'string' 
                          ? booking.trip.date.split('T')[0] 
                          : new Date(booking.trip.date).toISOString().split('T')[0]
                        tripDateTime = new Date(`${dateStr}T${booking.trip.time}:00`)
                      } catch (error) {
                        tripDateTime = new Date()
                      }
                      
                      const now = new Date()
                      const hoursUntilTrip = (tripDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
                      const canCancel = !isNaN(tripDateTime.getTime()) && hoursUntilTrip >= 1 && tripDateTime > now
                      
                      return (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={!canCancel}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-red-300 text-red-700 rounded-lg hover:bg-red-50 hover:border-red-400 disabled:bg-gray-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-medium transition shadow-sm hover:shadow disabled:shadow-none"
                          title={!canCancel ? 'Cancellations must be made at least 1 hour before departure' : 'Cancel this booking'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel Booking
                        </button>
                      )
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

