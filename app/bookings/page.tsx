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
      driverVerified?: boolean
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-lg font-semibold text-gray-900">Loading bookings...</div>
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
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">My Bookings</h1>
              <p className="text-gray-600">View and manage your trip bookings</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  fetchBookings(true)
                  fetchUnreadCounts()
                }}
                disabled={refreshing}
                className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm hover:shadow-md"
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
                href="/trips"
                className="px-4 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:text-blue-600 text-sm font-semibold transition-all shadow-sm hover:shadow-md"
              >
                Browse Trips
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {bookings.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-800 mb-6 text-lg font-semibold">You have no bookings yet.</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/trips"
                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Browse Carpooling Trips
              </Link>
              <Link
                href="/bus-trips"
                className="px-5 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:border-green-500 hover:text-green-600 text-sm font-semibold transition-all shadow-sm hover:shadow-md"
              >
                Book Bus Tickets
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {bookings.map((booking) => {
              // Check if booking can be cancelled
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
                <div key={booking.id} className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300">
                  {/* Booking Header */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">
                          {booking.trip.departCity} → {booking.trip.destinationCity}
                        </h3>
                        <p className="text-sm text-gray-600 font-medium">
                          {booking.trip.departLocation} → {booking.trip.destinationLocation}
                        </p>
                      </div>
                      <span
                        className={`px-4 py-1.5 rounded-full text-xs font-bold ${
                          booking.status === 'CONFIRMED'
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
                  </div>

                  {/* Booking Details */}
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
                            {new Date(booking.trip.date).toLocaleDateString()}
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
                          <p className="text-sm font-bold text-gray-900">{booking.trip.time}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Seats</p>
                          <p className="text-sm font-bold text-gray-900">{booking.seats}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Total Price</p>
                          <p className="text-sm font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                            RWF {(booking.trip.price * booking.seats).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Driver & Car Info */}
                    <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-xl p-4 mb-6 border border-blue-100">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Driver</p>
                          <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          {booking.trip.driver.name}
                          {booking.trip.driver.driverVerified && (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600" title="Verified driver">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                              Verified
                            </span>
                          )}
                        </p>
                          <p className="text-xs text-gray-600">{booking.trip.driver.phone}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium mb-1">Car</p>
                          <p className="text-sm font-bold text-gray-900">{booking.trip.carModel}</p>
                        </div>
                      </div>
                    </div>
                  
                    {/* Actions Section */}
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between pt-4 border-t border-gray-200">
                      {booking.status === 'CONFIRMED' && (
                        <Link
                          href={`/messages/${booking.id}`}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg relative"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Message Driver
                          {unreadCounts[booking.id] > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                              {unreadCounts[booking.id] > 9 ? '9+' : unreadCounts[booking.id]}
                            </span>
                          )}
                        </Link>
                      )}
                      
                      {(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          disabled={!canCancel}
                          className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-red-300 text-red-700 rounded-xl hover:bg-red-50 hover:border-red-400 disabled:bg-gray-50 disabled:border-gray-300 disabled:text-gray-400 disabled:cursor-not-allowed text-sm font-semibold transition-all shadow-sm hover:shadow-md disabled:shadow-none"
                          title={!canCancel ? 'Cancellations must be made at least 1 hour before departure' : 'Cancel this booking'}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Cancel Booking
                        </button>
                      )}
                    </div>
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

