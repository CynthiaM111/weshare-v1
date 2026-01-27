'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

  useEffect(() => {
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/bookings')
      return
    }

    const user = JSON.parse(userStr)

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
        <h1 className="text-3xl font-bold mb-6 text-gray-900">My Bookings</h1>
        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center border border-gray-200">
            <p className="text-gray-800 mb-4">You have no bookings yet.</p>
            <Link href="/trips" className="text-blue-600 hover:underline">
              Browse available trips
            </Link>
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
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">Driver:</span> {booking.trip.driver.name} ({booking.trip.driver.phone})
                  </p>
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold text-gray-900">Car:</span> {booking.trip.carModel}
                  </p>
                  {booking.status === 'CONFIRMED' && (
                    <Link
                      href={`/messages/${booking.id}`}
                      className="mt-2 inline-block text-blue-600 hover:underline text-sm font-medium"
                    >
                      Message Driver
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

