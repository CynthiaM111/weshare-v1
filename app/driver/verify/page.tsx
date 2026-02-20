'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

// Validation helpers (must match API schema)
function validateNationalId(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'National ID is required'
  if (!/^\d+$/.test(trimmed)) return 'National ID must contain digits only'
  if (trimmed.length < 14 || trimmed.length > 16) return 'National ID must be 14–16 digits'
  return null
}

function validateDrivingLicense(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'Driving license number is required'
  if (trimmed.length < 5) return 'Driving license must be at least 5 characters'
  if (trimmed.length > 20) return 'Driving license must be at most 20 characters'
  if (!/^[A-Za-z0-9\-/]+$/.test(trimmed)) {
    return 'Only letters, numbers, hyphens, and slashes allowed'
  }
  return null
}

function validateLicensePlate(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return 'License plate is required'
  if (trimmed.length < 5) return 'License plate must be at least 5 characters'
  if (trimmed.length > 15) return 'License plate must be at most 15 characters'
  if (!/^[A-Za-z0-9\s]+$/.test(trimmed)) {
    return 'Only letters, numbers, and spaces allowed (e.g. RAB 123 A)'
  }
  return null
}

export default function DriverVerifyPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [formData, setFormData] = useState({
    nationalId: '',
    drivingLicenseNumber: '',
    licensePlate: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const checkAuth = () => {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (!userStr) {
          toast.error('Please login first')
          router.push('/login?redirect=/driver/verify')
          return
        }
        const user = JSON.parse(userStr)
        if (!user || !user.id) {
          localStorage.removeItem('user')
          toast.error('Please login again')
          router.push('/login?redirect=/driver/verify')
          return
        }
        // Check if already verified
        fetch(`/api/driver/verification`, {
          headers: { 'x-user-id': user.id },
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.driverVerified) {
              toast.success('You are already verified!')
              router.push('/trips/new')
              return
            }
            setCheckingAuth(false)
          })
          .catch(() => setCheckingAuth(false))
      } catch (error) {
        console.error('Error:', error)
        setCheckingAuth(false)
      }
    }
    const timer = setTimeout(checkAuth, 100)
    return () => clearTimeout(timer)
  }, [router])

  const validateField = (name: string, value: string) => {
    switch (name) {
      case 'nationalId':
        return validateNationalId(value)
      case 'drivingLicenseNumber':
        return validateDrivingLicense(value)
      case 'licensePlate':
        return validateLicensePlate(value)
      default:
        return null
    }
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    setErrors((prev) => (error ? { ...prev, [name]: error } : { ...prev, [name]: '' }))
  }

  const handleChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing (if field was touched)
    if (touched[name]) {
      const error = validateField(name, value)
      setErrors((prev) => (error ? { ...prev, [name]: error } : { ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all fields
    const nationalIdError = validateNationalId(formData.nationalId)
    const drivingLicenseError = validateDrivingLicense(formData.drivingLicenseNumber)
    const licensePlateError = validateLicensePlate(formData.licensePlate)

    const newErrors: Record<string, string> = {}
    if (nationalIdError) newErrors.nationalId = nationalIdError
    if (drivingLicenseError) newErrors.drivingLicenseNumber = drivingLicenseError
    if (licensePlateError) newErrors.licensePlate = licensePlateError

    setErrors(newErrors)
    setTouched({ nationalId: true, drivingLicenseNumber: true, licensePlate: true })

    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the errors before submitting')
      return
    }

    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      toast.error('Please login first')
      router.push('/login?redirect=/driver/verify')
      return
    }

    const user = JSON.parse(userStr)
    setLoading(true)

    try {
      const response = await fetch('/api/driver/verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit verification')
      }

      toast.success('Verification submitted successfully! You can now post trips.')
      router.push('/trips/new')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit verification')
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            href="/trips/new"
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Post Trip
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2 text-gray-900">Driver Verification</h1>
        <p className="text-gray-600 mb-6">
          To post carpooling trips, we need to verify your driver information. Please provide the following details.
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg shadow-md p-6 space-y-5 border border-gray-200"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              National ID Number
            </label>
            <input
              type="text"
              name="nationalId"
              inputMode="numeric"
              autoComplete="off"
              value={formData.nationalId}
              onChange={(e) => handleChange('nationalId', e.target.value.replace(/\D/g, ''))}
              onBlur={handleBlur}
              placeholder="14–16 digits only, e.g. 1234567890123456"
              maxLength={16}
              className={`w-full px-4 py-2 border-2 rounded-lg text-gray-900 bg-white focus:ring-2 focus:outline-none placeholder:text-gray-500 ${
                errors.nationalId
                  ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {errors.nationalId && (
              <p className="mt-1 text-sm text-red-600">{errors.nationalId}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Rwanda national ID: 14–16 digits</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Driving License Number
            </label>
            <input
              type="text"
              name="drivingLicenseNumber"
              autoComplete="off"
              value={formData.drivingLicenseNumber}
              onChange={(e) => handleChange('drivingLicenseNumber', e.target.value)}
              onBlur={handleBlur}
              placeholder="e.g. DL-123456 or ABC/2024/001"
              maxLength={20}
              className={`w-full px-4 py-2 border-2 rounded-lg text-gray-900 bg-white focus:ring-2 focus:outline-none placeholder:text-gray-500 ${
                errors.drivingLicenseNumber
                  ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {errors.drivingLicenseNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.drivingLicenseNumber}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Letters, numbers, hyphens, slashes (5–20 chars)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              License Plate
            </label>
            <input
              type="text"
              name="licensePlate"
              autoComplete="off"
              value={formData.licensePlate}
              onChange={(e) => handleChange('licensePlate', e.target.value.toUpperCase())}
              onBlur={handleBlur}
              placeholder="e.g. RAB 123 A"
              maxLength={15}
              className={`w-full px-4 py-2 border-2 rounded-lg text-gray-900 bg-white focus:ring-2 focus:outline-none placeholder:text-gray-500 ${
                errors.licensePlate
                  ? 'border-red-500 focus:ring-red-200 focus:border-red-500'
                  : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
              }`}
            />
            {errors.licensePlate && (
              <p className="mt-1 text-sm text-red-600">{errors.licensePlate}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">Rwanda format: letters, numbers, spaces (e.g. RAB 123 A)</p>
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
            >
              {loading ? 'Submitting...' : 'Submit Verification'}
            </button>
            <Link
              href="/trips"
              className="flex-1 bg-gray-200 text-gray-800 py-2.5 rounded-lg hover:bg-gray-300 text-center font-semibold flex items-center justify-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
