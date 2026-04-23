'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

/**
 * Payment return page - no longer used for Flutterwave.
 * Payments are done directly with the driver (MoMo). Redirect to bookings.
 */
export default function PaymentReturnPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/bookings')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <p className="text-gray-600 mb-4">Redirecting to My Bookings...</p>
        <Link
          href="/bookings"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
        >
          Go to My Bookings
        </Link>
      </div>
    </div>
  )
}
