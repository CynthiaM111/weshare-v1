'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Show non-blocking alert about future OTP
      if (data.message) {
        toast.info(data.message, {
          duration: 5000,
        })
      }

      // Store user in session/localStorage (simplified - in production use proper session management)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      toast.success('Logged in successfully!')

      // Redirect based on role
      if (data.user.role === 'DRIVER') {
        router.push('/driver')
      } else if (data.user.role === 'AGENCY') {
        router.push('/agency')
      } else {
        router.push('/trips')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">Login to WeShare</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-1">
              Phone Number (MTN or Airtel Rwanda)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250788123456"
              required
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
            />
            <p className="text-xs text-gray-600 mt-1">
              Format: +250XXXXXXXXX (MTN: 078/079, Airtel: 072/073)
            </p>
          </div>
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-1">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              minLength={2}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? 'Logging in...' : 'Login / Register'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-700 mt-4">
          Don't have an account? Just enter your phone number to create one.
        </p>
        <div className="mt-4 text-center">
          <Link href="/" className="text-blue-600 hover:underline text-sm">
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

