'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

export default function EditTripPage() {
  const router = useRouter()
  const params = useParams()
  const tripId = params.id as string
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [fetchingTrip, setFetchingTrip] = useState(true)
  const [formData, setFormData] = useState({
    departCity: '',
    departLocation: '',
    destinationCity: '',
    destinationLocation: '',
    date: '',
    time: '',
    availableSeats: 1,
    price: 0,
    carModel: '',
    status: 'ACTIVE' as 'ACTIVE' | 'COMPLETED' | 'CANCELLED',
  })

  // Check authentication and fetch trip data
  useEffect(() => {
    const checkAuthAndFetchTrip = async () => {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (!userStr) {
          toast.error('Please login first')
          router.push(`/login?redirect=/trips/${tripId}/edit`)
          return
        }
        
        const user = JSON.parse(userStr)
        if (!user || !user.id) {
          localStorage.removeItem('user')
          toast.error('Please login again')
          router.push(`/login?redirect=/trips/${tripId}/edit`)
          return
        }

        setCheckingAuth(false)

        // Fetch trip data
        const response = await fetch(`/api/trips?id=${tripId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch trip')
        }

        const data = await response.json()
        if (data.length === 0) {
          toast.error('Trip not found')
          router.push('/my-trips')
          return
        }

        const trip = data[0]

        // Verify user is the owner
        if (trip.driver.id !== user.id) {
          toast.error('You can only edit your own trips')
          router.push('/my-trips')
          return
        }

        // Populate form with trip data
        const tripDate = new Date(trip.date)
        const dateStr = tripDate.toISOString().split('T')[0]
        
        setFormData({
          departCity: trip.departCity,
          departLocation: trip.departLocation,
          destinationCity: trip.destinationCity,
          destinationLocation: trip.destinationLocation,
          date: dateStr,
          time: trip.time,
          availableSeats: trip.availableSeats,
          price: trip.price,
          carModel: trip.carModel,
          status: trip.status,
        })

        setFetchingTrip(false)
      } catch (error) {
        console.error('Error:', error)
        toast.error('Failed to load trip')
        router.push('/my-trips')
      }
    }

    const timer = setTimeout(checkAuthAndFetchTrip, 100)
    return () => clearTimeout(timer)
  }, [router, tripId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      toast.error('Please login first')
      router.push(`/login?redirect=/trips/${tripId}/edit`)
      return
    }

    const user = JSON.parse(userStr)
    setLoading(true)

    try {
      const response = await fetch(`/api/trips/${tripId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update trip')
      }

      toast.success('Trip updated successfully!')
      router.push('/my-trips')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update trip')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth || fetchingTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Edit Trip</h1>
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6 space-y-4 border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Depart City</label>
              <input
                type="text"
                value={formData.departCity}
                onChange={(e) => setFormData({ ...formData, departCity: e.target.value })}
                placeholder="Kigali"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Depart Location</label>
              <input
                type="text"
                value={formData.departLocation}
                onChange={(e) => setFormData({ ...formData, departLocation: e.target.value })}
                placeholder="Kigali-Sonatube"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Destination City</label>
              <input
                type="text"
                value={formData.destinationCity}
                onChange={(e) => setFormData({ ...formData, destinationCity: e.target.value })}
                placeholder="Musanze"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Destination Location</label>
              <input
                type="text"
                value={formData.destinationLocation}
                onChange={(e) => setFormData({ ...formData, destinationLocation: e.target.value })}
                placeholder="Musanze-Gare"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Time</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Available Seats</label>
              <input
                type="number"
                value={formData.availableSeats}
                onChange={(e) => setFormData({ ...formData, availableSeats: parseInt(e.target.value) })}
                min="1"
                max="4"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Price (RWF)</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) })}
                min="0"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Car Model</label>
              <input
                type="text"
                value={formData.carModel}
                onChange={(e) => setFormData({ ...formData, carModel: e.target.value })}
                placeholder="Toyota Corolla"
                required
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'COMPLETED' | 'CANCELLED' })}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Trip'}
            </button>
            <Link
              href="/my-trips"
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
