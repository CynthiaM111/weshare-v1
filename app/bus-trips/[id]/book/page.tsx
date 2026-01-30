'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

interface BusTrip {
  id: string
  departCity: string
  destinationCity: string
  date: string
  time: string
  totalSeats: number
  availableSeats: number
  agency: {
    id: string
    name: string
    phone: string
  }
}

export default function BookBusTicketPage() {
  const router = useRouter()
  const params = useParams()
  const busTripId = params.id as string
  const [busTrip, setBusTrip] = useState<BusTrip | null>(null)
  const [seats, setSeats] = useState(1)
  const [loading, setLoading] = useState(true)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    fetchBusTrip()
  }, [busTripId])

  const fetchBusTrip = async () => {
    try {
      const response = await fetch(`/api/bus-trips?id=${busTripId}`)
      const data = await response.json()
      if (data.length > 0) {
        setBusTrip(data[0])
      }
    } catch (error) {
      console.error('Error fetching bus trip:', error)
      toast.error('Failed to load bus trip')
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      toast.error('Please login first')
      router.push(`/login?redirect=/bus-trips/${busTripId}/book`)
      return
    }

    const user = JSON.parse(userStr)
    setBooking(true)

    try {
      const response = await fetch('/api/ticket-bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify({
          busTripId,
          seats,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to book ticket')
      }

      toast.success('Ticket booked successfully!')
      router.push('/bookings?success=true')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to book ticket')
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!busTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Bus trip not found</h2>
          <Link href="/bus-trips" className="text-blue-600 hover:underline">
            Back to Bus Trips
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">Book Bus Ticket</h1>
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 border border-gray-200">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            {busTrip.departCity} → {busTrip.destinationCity}
          </h2>
          <div className="space-y-2">
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Date:</span> {new Date(busTrip.date).toLocaleDateString()}</p>
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Time:</span> {busTrip.time}</p>
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Agency:</span> {busTrip.agency.name}</p>
            <p className="text-gray-800"><span className="font-semibold text-gray-900">Available Seats:</span> {busTrip.availableSeats} / {busTrip.totalSeats}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Booking Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Number of Seats</label>
              <input
                type="number"
                value={seats}
                onChange={(e) => setSeats(parseInt(e.target.value))}
                min="1"
                max={busTrip.availableSeats}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-sm text-gray-700 mt-1">
                Maximum {busTrip.availableSeats} seat(s) available
              </p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleBook}
                disabled={booking || busTrip.availableSeats === 0 || seats > busTrip.availableSeats}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {booking ? 'Booking...' : 'Confirm Booking'}
              </button>
              <Link
                href="/bus-trips"
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 text-center"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

