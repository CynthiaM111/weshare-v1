'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Submission {
  id: string
  userId: string
  version: number
  fullName: string | null
  phone: string | null
  plateNumber: string | null
  status: string
  submittedAt: string | null
  user: { id: string; name: string; phone: string }
}

export default function AdminVerificationPage() {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/admin/verification')
      return
    }
    const user = JSON.parse(userStr)
    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      router.push('/')
      return
    }
    setUserId(user.id)
  }, [router])

  useEffect(() => {
    if (!userId) return
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)
    fetch(`/api/admin/verification?${params}`, {
      headers: { 'x-user-id': userId },
    })
      .then((r) => r.json())
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId, statusFilter, search])

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Verification Queue</h1>
          <Link href="/" className="text-blue-600 hover:underline font-medium">← Back</Link>
        </div>

        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by name, phone, plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg flex-1 bg-white text-gray-900 placeholder:text-gray-500"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
          >
            <option value="">All statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="CHANGES_REQUESTED">Changes Requested</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-700 font-medium">Loading...</div>
        ) : (
          <div className="bg-white rounded-xl shadow overflow-hidden border border-gray-200">
            <table className="min-w-full">
              <thead className="bg-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Plate</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Submitted</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-t border-gray-200">
                    <td className="px-4 py-3 text-gray-900">{s.fullName || s.user?.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-900">{s.phone || s.user?.phone || '-'}</td>
                    <td className="px-4 py-3 text-gray-900">{s.plateNumber || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        s.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        s.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        s.status === 'SUBMITTED' || s.status === 'IN_REVIEW' ? 'bg-blue-100 text-blue-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/verification/${s.id}`}
                        className="text-blue-600 hover:underline font-medium text-blue-700"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {submissions.length === 0 && (
              <div className="px-4 py-12 text-center text-gray-600 font-medium">No submissions found</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
