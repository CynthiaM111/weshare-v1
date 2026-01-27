'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

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
  const [filters, setFilters] = useState({
    departCity: '',
    destinationCity: '',
    date: '',
  })

  useEffect(() => {
    fetchTrips()
  }, [])

  const fetchTrips = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.departCity) params.append('departCity', filters.departCity)
      if (filters.destinationCity) params.append('destinationCity', filters.destinationCity)
      if (filters.date) params.append('date', filters.date)
      params.append('status', 'ACTIVE')

      const response = await fetch(`/api/trips?${params.toString()}`)
      const data = await response.json()
      setTrips(data)
    } catch (error) {
      console.error('Error fetching trips:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleApplyFilters = () => {
    fetchTrips()
  }

  const handleBookTrip = (tripId: string) => {
    // Check if user is logged in
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/trips')
      return
    }
    router.push(`/trips/${tripId}/book`)
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Available Trips</h1>
          <Link
            href="/trips/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Post a Trip
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Depart City"
              value={filters.departCity}
              onChange={(e) => handleFilterChange('departCity', e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder:text-gray-500"
            />
            <input
              type="text"
              placeholder="Destination City"
              value={filters.destinationCity}
              onChange={(e) => handleFilterChange('destinationCity', e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none placeholder:text-gray-500"
            />
            <input
              type="date"
              value={filters.date}
              onChange={(e) => handleFilterChange('date', e.target.value)}
              className="px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none"
            />
            <button
              onClick={handleApplyFilters}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {/* Trips List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => {
            const bookedSeats = trip.bookings
              .filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED')
              .reduce((sum, b) => sum + b.seats, 0)
            const remainingSeats = trip.availableSeats - bookedSeats

            return (
              <div key={trip.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
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
                <button
                  onClick={() => handleBookTrip(trip.id)}
                  disabled={remainingSeats === 0}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {remainingSeats === 0 ? 'No Seats Available' : 'Book Trip'}
                </button>
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

