'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import LogoMark from '@/components/LogoMark'

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
        if (data.user.role === 'SUPER_ADMIN') {
          router.push('/admin/super')
        } else if (data.user.role === 'ADMIN') {
          router.push('/admin/verification')
        } else if (data.user.role === 'DRIVER') {
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
    <div className="ws-shell flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md ws-card-elevated p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="relative">
          <div className="text-center mb-6">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <LogoMark className="w-10 h-10" />
              <span className="text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-blue-700 transition">
                WeShare
              </span>
            </Link>
            <p className="mt-2 text-sm text-slate-600">
              Carpooling and bus tickets across Rwanda.
            </p>
          </div>
        <div className="flex justify-center mb-6">
          <div className="bg-white/80 backdrop-blur rounded-xl p-1 inline-flex border border-slate-200 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setName('')
              }}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${!isSignUp
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsSignUp(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition ${isSignUp
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Sign Up
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-center mb-6 text-slate-900">
          {isSignUp ? 'Create Account' : 'Login to WeShare'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-semibold text-slate-900 mb-1">
              Phone Number (MTN or Airtel Rwanda)
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+250788123456"
              required
              className="ws-input"
            />
            <p className="text-xs text-slate-600 mt-1">
              Format: +250XXXXXXXXX (MTN: 078/079, Airtel: 072/073)
            </p>
          </div>
          {isSignUp && (
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-slate-900 mb-1">
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
                className="ws-input"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full ws-btn-primary py-3"
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
        <p className="text-center text-sm text-slate-700 mt-5">
          {isSignUp
            ? 'Already have an account?'
            : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              if (!isSignUp) setName('')
            }}
            className="text-blue-700 hover:text-blue-800 font-semibold underline-offset-4 hover:underline"
          >
            {isSignUp ? 'Login' : 'Sign Up'}
          </button>
        </p>
        <div className="mt-4 text-center">
          <Link href="/" className="text-blue-700 hover:text-blue-800 text-sm font-semibold underline-offset-4 hover:underline">
            Back to Home
          </Link>
        </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="ws-shell flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
