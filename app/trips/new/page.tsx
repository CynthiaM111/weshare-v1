'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

export default function NewTripPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [verificationRequired, setVerificationRequired] = useState(false)
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
  })

  // Check authentication and driver verification on page load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (!userStr) {
          toast.error('Please login first')
          router.push('/login?redirect=/trips/new')
          return
        }
        const user = JSON.parse(userStr)
        if (!user || !user.id) {
          localStorage.removeItem('user')
          toast.error('Please login again')
          router.push('/login?redirect=/trips/new')
          return
        }
        // Check driver verification status
        const res = await fetch('/api/driver/verification', {
          headers: { 'x-user-id': user.id },
        })
        const data = await res.json()
        if (!data.driverVerified) {
          setVerificationRequired(true)
          setCheckingAuth(false)
          return
        }
        setCheckingAuth(false)
      } catch (error) {
        console.error('Error parsing user data:', error)
        localStorage.removeItem('user')
        toast.error('Please login again')
        router.push('/login?redirect=/trips/new')
      }
    }

    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if user is logged in
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      toast.error('Please login first')
      router.push('/login?redirect=/trips/new')
      return
    }

    const user = JSON.parse(userStr)
    setLoading(true)

    try {
      const response = await fetch('/api/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 403 && data.code === 'VERIFICATION_REQUIRED') {
          setVerificationRequired(true)
          toast.error(data.error || 'Driver verification required')
          return
        }
        throw new Error(data.error || 'Failed to create trip')
      }

      toast.success('Trip posted successfully!')
      router.push('/trips')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create trip')
    } finally {
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900">Loading...</div>
      </div>
    )
  }

  if (verificationRequired) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-gray-900 mb-2">Driver Verification Required</h2>
                <p className="text-gray-700 mb-4">
                  You need to verify your driver information before you can post carpooling trips. This helps keep our community safe.
                </p>
                <p className="text-gray-600 text-sm mb-4">
                  Please provide your National ID number, driving license number, and license plate to complete verification.
                </p>
                <Link
                  href="/driver/verify"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
                >
                  Get Verified
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
          <Link
            href="/trips"
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Available Trips
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Post a New Trip</h1>
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
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Posting...' : 'Post Trip'}
            </button>
            <Link
              href="/trips"
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

