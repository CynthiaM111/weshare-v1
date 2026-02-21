'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

interface User {
  id: string
  phone: string
  name: string
  role: string
  phoneVerified: boolean
  profileImageUrl?: string | null
  isVerified?: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const loadProfile = async () => {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (!userStr) {
        router.push('/login?redirect=/profile')
        return
      }

      const userData = JSON.parse(userStr)
      setUser(userData)

      try {
        const res = await fetch('/api/profile', {
          headers: { 'x-user-id': userData.id },
        })
        if (res.ok) {
          const profile = await res.json()
          setUser((prev) => prev ? { ...prev, ...profile } : null)
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify({ ...userData, ...profile }))
          }
        }
      } catch (_) {}
      setLoading(false)
    }
    loadProfile()
  }, [router])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please use JPEG, PNG, or WebP')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/profile/image', {
        method: 'POST',
        headers: { 'x-user-id': user.id },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      const profileImageUrl = data.profileImageUrl
      setUser((prev) => prev ? { ...prev, profileImageUrl } : null)
      if (typeof window !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem('user') || '{}')
        localStorage.setItem('user', JSON.stringify({ ...stored, profileImageUrl }))
        window.dispatchEvent(new CustomEvent('userLogin'))
      }
      toast.success('Profile picture updated!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

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
            <div className="relative group">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-600 shrink-0">
                {user.profileImageUrl ? (
                  <img src={`/api/profile/image/${user.id}`} alt="" className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity text-white"
                title="Update profile picture"
              >
                {uploading ? (
                  <span className="text-xs font-medium">Uploading...</span>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
              <p className="text-gray-700">{getRoleDisplay(user.role)}</p>
              <p className={`text-sm font-medium mt-1 ${user.isVerified ? 'text-emerald-600' : 'text-gray-500'}`}>
                {user.isVerified ? 'Verified' : 'Not verified'}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium mt-1"
                title="Update profile picture"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                {uploading ? 'Uploading...' : 'Update profile picture'}
              </button>
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
