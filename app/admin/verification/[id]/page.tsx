'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

function maskNationalId(id: string | null) {
  if (!id || id.length < 4) return '****'
  return '*'.repeat(id.length - 4) + id.slice(-4)
}

function DocViewer({ path, label, userId }: { path: string | null; label: string; userId: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [isPdf, setIsPdf] = useState(false)
  const urlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!path || !userId) return
    fetch(`/api/verification/documents?path=${encodeURIComponent(path)}`, {
      headers: { 'x-user-id': userId },
    })
      .then((r) => {
        if (!r.ok) return null
        return r.blob()
      })
      .then((blob) => {
        if (blob) {
          const isPdfFile = blob.type?.includes('pdf') ?? path.toLowerCase().endsWith('.pdf')
          setIsPdf(isPdfFile)
          const url = URL.createObjectURL(blob)
          urlRef.current = url
          setObjectUrl(url)
        }
      })
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current)
        urlRef.current = null
      }
    }
  }, [path, userId])

  if (!path) return null
  return (
    <div>
      <p className="text-sm font-semibold text-gray-900 mb-1">{label}</p>
      {objectUrl ? (
        isPdf ? (
          <a
            href={objectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            View PDF
          </a>
        ) : (
          <a href={objectUrl} target="_blank" rel="noopener noreferrer" className="block">
            <img src={objectUrl} alt={label} className="max-w-xs max-h-48 object-contain border rounded-lg border-gray-300" />
          </a>
        )
      ) : (
        <div className="max-w-xs h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600 font-medium">Loading...</div>
      )}
    </div>
  )
}

export default function AdminVerificationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const [submission, setSubmission] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [reason, setReason] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/admin/verification/' + id)
      return
    }
    const user = JSON.parse(userStr)
    if (user?.role !== 'ADMIN') {
      router.push('/')
      return
    }
    setUserId(user.id)
  }, [router, id])

  useEffect(() => {
    if (!userId) return
    fetch(`/api/admin/verification/${id}`, {
      headers: { 'x-user-id': userId },
    })
      .then((r) => r.json())
      .then(setSubmission)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId, id])

  const handleReview = async (action: 'APPROVE' | 'REJECT' | 'CHANGES_REQUESTED') => {
    if (!userId) return
    if ((action === 'REJECT' || action === 'CHANGES_REQUESTED') && !reason.trim()) {
      toast.error('Reason is required for Reject and Request changes')
      return
    }
    setActionLoading(true)
    try {
      const res = await fetch(`/api/admin/verification/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ action, reason: reason.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Submission ${action === 'APPROVE' ? 'approved' : action === 'REJECT' ? 'rejected' : 'changes requested'}`)
      setSubmission(data)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (loading || !submission) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        {loading ? (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        ) : (
          <div className="text-gray-600">Not found</div>
        )}
      </div>
    )
  }

  const canReview = ['SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED'].includes(submission.status)

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/admin/verification" className="text-blue-600 hover:underline mb-6 inline-block font-medium">
          ← Back to Queue
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Verification Submission</h1>

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                submission.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                submission.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                'bg-blue-100 text-blue-800'
              }`}>
                {submission.status}
              </span>
              <p className="text-gray-500 mt-2">Version {submission.version}</p>
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4">Personal Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-gray-900">
            <p><strong>Name:</strong> {submission.fullName || '-'}</p>
            <p><strong>Phone:</strong> {submission.phone || '-'}</p>
            <p><strong>DOB:</strong> {submission.dateOfBirth ? new Date(submission.dateOfBirth).toLocaleDateString() : '-'}</p>
            <p><strong>National ID:</strong> {maskNationalId(submission.nationalIdNumber)}</p>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4">National ID</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            <DocViewer path={submission.nationalIdFront} label="Front" userId={userId} />
            <DocViewer path={submission.nationalIdBack} label="Back" userId={userId} />
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4">Driver&apos;s License</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            <DocViewer path={submission.licenseFront} label="Front" userId={userId} />
            <DocViewer path={submission.licenseBack} label="Back" userId={userId} />
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4">Vehicle Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 text-gray-900">
            <p><strong>Plate:</strong> {submission.plateNumber || '-'}</p>
            <p><strong>Make:</strong> {submission.vehicleMake || '-'}</p>
            <p><strong>Model:</strong> {submission.vehicleModel || '-'}</p>
            <p><strong>Color:</strong> {submission.vehicleColor || '-'}</p>
            <p><strong>Seats:</strong> {submission.vehicleSeats ?? '-'}</p>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4">Yellow Card & Insurance</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            <DocViewer path={submission.yellowCardPath} label="Yellow Card" userId={userId} />
            <DocViewer path={submission.insurancePath} label="Insurance" userId={userId} />
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-4">Vehicle Photos</h2>
          <div className="flex flex-wrap gap-4 mb-6">
            <DocViewer path={submission.vehiclePhotoFront} label="Front" userId={userId} />
            <DocViewer path={submission.vehiclePhotoRear} label="Rear" userId={userId} />
            <DocViewer path={submission.vehiclePhotoSide} label="Side" userId={userId} />
          </div>

          {submission.rejectionReason && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="font-semibold text-amber-800">Previous feedback:</p>
              <p className="text-amber-900">{submission.rejectionReason}</p>
            </div>
          )}

          {submission.audits?.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Audit Trail</h2>
              <div className="space-y-2">
                {submission.audits.map((a: any) => (
                  <div key={a.id} className="text-sm text-gray-800 border-l-2 border-gray-300 pl-4">
                    <span className="font-semibold text-gray-900">{a.action}</span> – {new Date(a.createdAt).toLocaleString()}
                    {a.reason && <p className="text-gray-700 mt-1">{a.reason}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {canReview && (
            <div className="border-t border-gray-200 pt-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Reason (required for Reject / Request changes)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Provide feedback..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 min-h-[100px] bg-white text-gray-900 placeholder:text-gray-500"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => handleReview('APPROVE')}
                  disabled={actionLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReview('CHANGES_REQUESTED')}
                  disabled={actionLoading || !reason.trim()}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 disabled:opacity-50"
                >
                  Request Changes
                </button>
                <button
                  onClick={() => handleReview('REJECT')}
                  disabled={actionLoading || !reason.trim()}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
