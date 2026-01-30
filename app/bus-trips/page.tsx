'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface BusTrip {
  id: string
  departCity: string
  destinationCity: string
  date: string
  time: string
  totalSeats: number
  availableSeats: number
  status: string
  agency: {
    id: string
    name: string
    phone: string
  }
  ticketBookings: Array<{
    id: string
    seats: number
    status: string
  }>
}

export default function BusTripsPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<BusTrip[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [filters, setFilters] = useState({
    departCity: '',
    destinationCity: '',
    date: '',
  })

  const fetchTrips = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.departCity) params.append('departCity', filters.departCity)
      if (filters.destinationCity) params.append('destinationCity', filters.destinationCity)
      if (filters.date) params.append('date', filters.date)
      params.append('status', 'ACTIVE')

      const response = await fetch(`/api/bus-trips?${params.toString()}`)
      const data = await response.json()
      setTrips(data)
    } catch (error) {
      console.error('Error fetching bus trips:', error)
      toast.error('Failed to load bus trips')
    } finally {
      setLoading(false)
    }
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
    setLoading(true)
    fetchTrips()
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

  const handleBookTicket = (tripId: string) => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push(`/login?redirect=/bus-trips`)
      return
    }
    router.push(`/bus-trips/${tripId}/book`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Bus Trips</h1>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Search Bus Trips</h2>
            {hasSearched && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 font-semibold transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-all"
            >
              Search
            </button>
          </div>
        </div>

        {/* Trips List */}
        {!hasSearched ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-gray-900 text-xl font-bold mb-2">Search for Bus Trips</p>
            <p className="text-gray-600 text-base mb-4">Enter at least one search criteria to find available bus trips</p>
            <p className="text-gray-500 text-sm">Fill in depart city, destination city, or select a date above</p>
          </div>
        ) : loading ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <p className="text-gray-600 text-lg font-medium">Loading bus trips...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <p className="text-gray-600 text-lg font-medium">No bus trips found</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your filters or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2 text-gray-900">
                  {trip.departCity} → {trip.destinationCity}
                </h3>
                <p className="text-sm text-gray-700 font-medium">Agency: {trip.agency.name}</p>
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
                  <span className="font-semibold text-gray-900">Available Seats:</span> {trip.availableSeats} / {trip.totalSeats}
                </p>
              </div>
              <button
                onClick={() => handleBookTicket(trip.id)}
                disabled={trip.availableSeats === 0}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {trip.availableSeats === 0 ? 'Sold Out' : 'Book Ticket'}
              </button>
            </div>
          ))}
          </div>
        )}
      </div>
    </div>
  )
}

