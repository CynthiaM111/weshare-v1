'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import VerifiedBadge from '@/components/VerifiedBadge'

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

function TripsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    departCity: '',
    destinationCity: '',
    date: '',
  })

  // Sync filters from URL when searchParams change (e.g. coming from home page)
  useEffect(() => {
    const depart = searchParams.get('departCity') || ''
    const dest = searchParams.get('destinationCity') || ''
    const date = searchParams.get('date') || ''
    setFilters({ departCity: depart, destinationCity: dest, date })
    if (depart || dest || date) {
      setHasSearched(true)
      fetchTripsWithFilters({ departCity: depart, destinationCity: dest, date })
    }
  }, [searchParams.toString()])

  useEffect(() => {
    // Get current user ID only
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUserId(user.id)
      } catch (error) {
        console.error('Error parsing user data:', error)
      }
    }
  }, [])

  const fetchTrips = async (isRefresh = false) => {
    fetchTripsWithFilters(filters, isRefresh)
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleApplyFilters = () => {
    // Require at least one filter
    if (!filters.departCity && !filters.destinationCity && !filters.date) {
      toast.error('Please provide at least one search criteria (depart city, destination city, or date)')
      return
    }
    setHasSearched(true)
    fetchTripsWithFilters(filters)
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      departCity: '',
      destinationCity: '',
      date: '',
    }
    setFilters(clearedFilters)
    setTrips([])
    setHasSearched(false)
  }

  const fetchTripsWithFilters = async (filterValues: typeof filters, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    try {
      const params = new URLSearchParams()
      if (filterValues.departCity) params.append('departCity', filterValues.departCity)
      if (filterValues.destinationCity) params.append('destinationCity', filterValues.destinationCity)
      if (filterValues.date) params.append('date', filterValues.date)
      params.append('status', 'ACTIVE')

      const response = await fetch(`/api/trips?${params.toString()}`)
      const data = await response.json()
      setTrips(data)
    } catch (error) {
      console.error('Error fetching trips:', error)
      toast.error('Failed to load trips')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const hasActiveFilters = filters.departCity || filters.destinationCity || filters.date

  const handleBookTrip = (tripId: string) => {
    // Check if user is logged in
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/trips')
      return
    }
    router.push(`/trips/${tripId}/book`)
  }

  const handleDeleteTrip = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation() // Prevent any parent click handlers

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      toast.error('Please login first')
      return
    }

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
      fetchTrips(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete trip')
    }
  }


  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Available Trips</h1>
              <p className="text-gray-600">Find your perfect ride or share your journey</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button
                onClick={() => fetchTrips(true)}
                disabled={refreshing}
                className="p-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm hover:shadow-md"
                title="Refresh trips"
                aria-label="Refresh trips"
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
              </button>
              <Link
                href="/my-trips"
                className="px-4 py-2.5 bg-white text-gray-700 border-2 border-gray-300 rounded-xl hover:border-blue-500 hover:text-blue-600 text-sm font-semibold transition-all shadow-sm hover:shadow-md"
              >
                My Trips
              </Link>
              <Link
                href="/trips/new"
                className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Post a Trip
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters Top Bar */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-extrabold text-gray-900">Filter trips</h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-extrabold tracking-wide text-slate-700 mb-2">Depart</label>
              <input
                type="text"
                placeholder="Kigali"
                value={filters.departCity}
                onChange={(e) => handleFilterChange('departCity', e.target.value)}
                className="ws-input py-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold tracking-wide text-slate-700 mb-2">Destination</label>
              <input
                type="text"
                placeholder="Musanze"
                value={filters.destinationCity}
                onChange={(e) => handleFilterChange('destinationCity', e.target.value)}
                className="ws-input py-2.5"
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold tracking-wide text-slate-700 mb-2">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="ws-input py-2.5"
              />
            </div>
            <button
              onClick={handleApplyFilters}
              className="ws-btn-primary py-2.5"
            >
              Apply
            </button>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.departCity && (
                <span className="ws-badge-neutral text-xs">
                  {filters.departCity}
                </span>
              )}
              {filters.destinationCity && (
                <span className="ws-badge-neutral text-xs">
                  {filters.destinationCity}
                </span>
              )}
              {filters.date && (
                <span className="ws-badge-neutral text-xs">
                  {new Date(filters.date).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Trips Grid */}
        <div className="flex-1">
            {!hasSearched ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-gray-900 text-xl font-bold mb-2">Search for Trips</p>
                <p className="text-gray-600 text-base mb-4">Enter at least one search criteria to find available trips</p>
                <p className="text-gray-500 text-sm">Fill in depart city, destination city, or select a date above</p>
              </div>
            ) : loading ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg font-medium">Loading trips...</p>
              </div>
            ) : trips.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <p className="text-gray-600 text-lg font-medium">No trips found</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or check back later</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {trips.map((trip) => {
                  const bookedSeats = trip.bookings
                    .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
                    .reduce((sum, b) => sum + b.seats, 0)
                  const remainingSeats = trip.availableSeats - bookedSeats
                  const isOwnTrip = currentUserId && trip.driver.id === currentUserId

                  return (
                    <div key={trip.id} className={`group bg-white rounded-2xl shadow-md hover:shadow-lg overflow-hidden transition-all duration-300 hover:-translate-y-0.5 ${isOwnTrip ? 'border border-gray-200' : 'border border-gray-200'}`}>
                      {/* Card Header */}
                      <div className="relative border-b border-gray-200 p-5">
                        {isOwnTrip && (
                          <span className="absolute top-4 right-4 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded-full border border-purple-200">
                            Your Trip
                          </span>
                        )}
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 mb-1">
                            {trip.departCity} → {trip.destinationCity}
                          </h3>
                          <p className="text-gray-600 text-sm">
                            {trip.departLocation} → {trip.destinationLocation}
                          </p>
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-5">
                        {/* Trip Details - Horizontal Layout */}
                        <div className="flex flex-wrap gap-x-6 gap-y-3 mb-5 text-sm">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-500">Date:</span>
                            <span className="font-semibold text-gray-900">{new Date(trip.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-gray-500">Time:</span>
                            <span className="font-semibold text-gray-900">{trip.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-gray-500">Seats:</span>
                            <span className="font-semibold text-gray-900">{remainingSeats} available</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            <span className="text-gray-500">Car:</span>
                            <span className="font-semibold text-gray-900">{trip.carModel}</span>
                          </div>
                        </div>

                        {/* Price and Driver Section */}
                        <div className="flex items-center justify-between mb-5 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Price per seat</p>
                            <p className="text-xl font-bold text-blue-600">
                              RWF {trip.price.toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500 mb-1">Driver</p>
                            <p className="text-sm font-semibold text-gray-900 flex items-center justify-end gap-1.5">
                              {trip.driver.name}
                              {trip.driver.driverVerified && <VerifiedBadge />}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          {isOwnTrip ? (
                            <>
                              <Link
                                href={`/trips/${trip.id}/edit`}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-center text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Edit
                              </Link>
                              <button
                                onClick={(e) => handleDeleteTrip(trip.id, e)}
                                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 text-sm font-semibold transition-all shadow-sm hover:shadow-md"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleBookTrip(trip.id)}
                              disabled={remainingSeats === 0}
                              className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed font-semibold transition-all shadow-sm hover:shadow-md"
                              title={remainingSeats === 0 ? "No seats available" : "Book this trip"}
                            >
                              {remainingSeats === 0 ? 'No Seats Available' : 'Book Trip'}
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
    </div>
  )
}

export default function TripsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    }>
      <TripsPageContent />
    </Suspense>
  )
}