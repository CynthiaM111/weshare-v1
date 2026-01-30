'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isSignUp, setIsSignUp] = useState(false)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (userStr) {
      const redirect = searchParams.get('redirect')
      if (redirect) {
        router.push(redirect)
      } else {
        router.push('/')
      }
    }
  }, [router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login'
      const body = isSignUp ? { phone, name } : { phone }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || (isSignUp ? 'Sign up failed' : 'Login failed'))
      }

      // Show non-blocking alert about future OTP
      if (data.message) {
        toast.info(data.message, {
          duration: Infinity,
          dismissible: true,
          closeButton: true,
        })
      }

      // Store user in session/localStorage (simplified - in production use proper session management)
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(data.user))
        // Trigger custom event to update navigation (storage event only works across tabs)
        window.dispatchEvent(new CustomEvent('userLogin'))
      }

      toast.success(isSignUp ? 'Account created successfully!' : 'Logged in successfully!')

      // Check for redirect parameter first
      const redirect = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('redirect') : null

      if (redirect) {
        router.push(redirect)
      } else {
        // Redirect based on role
        if (data.user.role === 'DRIVER') {
          router.push('/driver')
        } else if (data.user.role === 'AGENCY') {
          router.push('/agency')
        } else {
          router.push('/trips')
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (isSignUp ? 'Sign up failed' : 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <div className="flex justify-center mb-6">
          <div className="bg-gray-100 rounded-lg p-1 inline-flex">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setName('')
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${!isSignUp
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${isSignUp
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-6 text-gray-900">
          {isSignUp ? 'Create Account' : 'Login to WeShare'}
        </h1>
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
          {isSignUp && (
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
                required={isSignUp}
                minLength={2}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder:text-gray-500"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading
              ? isSignUp
                ? 'Creating account...'
                : 'Logging in...'
              : isSignUp
                ? 'Sign Up'
                : 'Login'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-700 mt-4">
          {isSignUp
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              if (!isSignUp) setName('')
            }}
            className="text-blue-600 hover:underline font-medium"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
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

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
