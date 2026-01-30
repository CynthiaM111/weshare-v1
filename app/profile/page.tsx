'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  phone: string
  name: string
  role: string
  phoneVerified: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/profile')
      return
    }

    const userData = JSON.parse(userStr)
    setUser(userData)
    setLoading(false)
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-900">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'DRIVER':
        return 'Driver'
      case 'PASSENGER':
        return 'Passenger'
      case 'AGENCY':
        return 'Travel Agency'
      default:
        return role
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">My Profile</h1>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 mb-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-700">{getRoleDisplay(user.role)}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-t border-gray-200 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Full Name
                  </label>
                  <p className="text-gray-800">{user.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Phone Number
                  </label>
                  <div className="flex items-center space-x-2">
                    <p className="text-gray-800">{user.phone}</p>
                    {user.phoneVerified && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Account Type
                  </label>
                  <p className="text-gray-800">{getRoleDisplay(user.role)}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    Account Status
                  </label>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded-full">
                    Active
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                href="/my-trips"
                className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-900 font-medium transition"
              >
                My Trips
              </Link>
              <Link
                href="/bookings"
                className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-900 font-medium transition"
              >
                My Bookings
              </Link>
              <Link
                href="/trips/new"
                className="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Post New Trip
              </Link>
              {user.role === 'DRIVER' && (
                <Link
                  href="/driver"
                  className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-900 font-medium transition"
                >
                  Driver Dashboard
                </Link>
              )}
              {user.role === 'AGENCY' && (
                <Link
                  href="/bus-trips"
                  className="block px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-900 font-medium transition"
                >
                  Manage Bus Trips
                </Link>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Account Information</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Phone Verified:</span>
                <span className={user.phoneVerified ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold'}>
                  {user.phoneVerified ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700 font-medium">Member Since:</span>
                <span className="text-gray-900">Active User</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
