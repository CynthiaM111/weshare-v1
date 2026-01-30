'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

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
  }
  bookings: Array<{
    id: string
    seats: number
    status: string
  }>
}

export default function TripsPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    departCity: '',
    destinationCity: '',
    date: '',
  })

  useEffect(() => {
    fetchTrips()
    // Get current user ID
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
    fetchTripsWithFilters(filters)
  }

  const handleClearFilters = () => {
    const clearedFilters = {
      departCity: '',
      destinationCity: '',
      date: '',
    }
    setFilters(clearedFilters)
    // Fetch trips without filters
    fetchTripsWithFilters(clearedFilters)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading trips...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h1 className="text-3xl font-bold text-gray-900">Available Trips</h1>
          <div className="flex gap-2">
            <button
              onClick={() => fetchTrips(true)}
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
              href="/my-trips"
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-medium transition"
            >
              My Trips
            </Link>
            <Link
              href="/trips/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition"
            >
              Post a Trip
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Filter Trips</h2>
            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear Filters
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Depart City</label>
              <input
                type="text"
                placeholder="e.g., Kigali"
                value={filters.departCity}
                onChange={(e) => handleFilterChange('departCity', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Destination City</label>
              <input
                type="text"
                placeholder="e.g., Musanze"
                value={filters.destinationCity}
                onChange={(e) => handleFilterChange('destinationCity', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Date</label>
              <input
                type="date"
                value={filters.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleApplyFilters}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
          {hasActiveFilters && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Active filters: 
                {filters.departCity && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Depart: {filters.departCity}</span>}
                {filters.destinationCity && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Destination: {filters.destinationCity}</span>}
                {filters.date && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">Date: {new Date(filters.date).toLocaleDateString()}</span>}
              </p>
            </div>
          )}
        </div>

        {/* Trips List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            const bookedSeats = trip.bookings
              .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
              .reduce((sum, b) => sum + b.seats, 0)
            const remainingSeats = trip.availableSeats - bookedSeats
            const isOwnTrip = currentUserId && trip.driver.id === currentUserId

            return (
              <div key={trip.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200 relative">
                {isOwnTrip && (
                  <span className="absolute top-4 right-4 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full border border-purple-300">
                    Your Trip
                  </span>
                )}
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-2 text-gray-900">
                    {trip.departCity} → {trip.destinationCity}
                  </h3>
                  <p className="text-sm text-gray-700 font-medium">
                    {trip.departLocation} → {trip.destinationLocation}
                  </p>
                </div>
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">Date:</span>{' '}
                    {new Date(trip.date).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">Time:</span> {trip.time}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">Car:</span> {trip.carModel}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">Seats:</span> {remainingSeats} available
                  </p>
                  <p className="text-xl font-bold text-blue-700">
                    RWF {trip.price.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">Driver:</span> {trip.driver.name}
                  </p>
                </div>
                <div className="flex gap-2">
                  {isOwnTrip ? (
                    <>
                      <Link
                        href={`/trips/${trip.id}/edit`}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-center text-sm font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={(e) => handleDeleteTrip(trip.id, e)}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleBookTrip(trip.id)}
                      disabled={remainingSeats === 0}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      title={remainingSeats === 0 ? "No seats available" : "Book this trip"}
                    >
                      {remainingSeats === 0 ? 'No Seats Available' : 'Book Trip'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {trips.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">No trips found. Try adjusting your filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}

