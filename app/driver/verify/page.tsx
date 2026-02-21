'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

const STEPS = [
  { id: 'personal', title: 'Personal Info', icon: '👤' },
  { id: 'nationalId', title: 'National ID', icon: '🪪' },
  { id: 'license', title: "Driver's License", icon: '📜' },
  { id: 'vehicle', title: 'Vehicle Info', icon: '🚗' },
  { id: 'yellowCard', title: 'Yellow Card', icon: '📄' },
  { id: 'insurance', title: 'Insurance', icon: '🛡️' },
  { id: 'vehiclePhotos', title: 'Vehicle Photos', icon: '📷' },
  { id: 'review', title: 'Review & Submit', icon: '✓' },
]

const FILE_ACCEPT = {
  image: 'image/jpeg,image/png,image/webp',
  doc: 'image/jpeg,image/png,image/webp,application/pdf',
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

function maskNationalId(id: string) {
  if (!id || id.length < 4) return '****'
  return '*'.repeat(id.length - 4) + id.slice(-4)
}

export default function DriverVerifyPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [submissionId, setSubmissionId] = useState<string | null>(null)
  const [submission, setSubmission] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    dateOfBirth: '',
    nationalIdNumber: '',
    plateNumber: '',
    vehicleMake: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleSeats: 4,
    licenseExpiry: '',
    insuranceExpiry: '',
  })
  const [files, setFiles] = useState<Record<string, File>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
        if (!userStr) {
          toast.error('Please login first')
          router.push('/login?redirect=/driver/verify')
          return
        }
        const user = JSON.parse(userStr)
        if (!user?.id) {
          localStorage.removeItem('user')
          router.push('/login?redirect=/driver/verify')
          return
        }
        setUserId(user.id)

        const [statusRes, submissionsRes] = await Promise.all([
          fetch('/api/verification/status', { headers: { 'x-user-id': user.id } }),
          fetch('/api/verification/submissions', { headers: { 'x-user-id': user.id } }),
        ])
        const statusData = await statusRes.json()
        const submissions = await submissionsRes.json()

        if (statusData.isApproved) {
          toast.success('You are already verified!')
          router.push('/trips/new')
          return
        }

        const draft = submissions.find((s: any) => s.status === 'DRAFT')
        const pending = submissions.find((s: any) =>
          ['SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED'].includes(s.status)
        )

        if (pending) {
          setSubmission(pending)
        } else if (draft) {
          setSubmissionId(draft.id)
          setSubmission(draft)
          setFormData({
            fullName: draft.fullName || '',
            phone: draft.phone || '',
            dateOfBirth: draft.dateOfBirth ? draft.dateOfBirth.split('T')[0] : '',
            nationalIdNumber: draft.nationalIdNumber || '',
            plateNumber: draft.plateNumber || '',
            vehicleMake: draft.vehicleMake || '',
            vehicleModel: draft.vehicleModel || '',
            vehicleColor: draft.vehicleColor || '',
            vehicleSeats: draft.vehicleSeats || 4,
            licenseExpiry: draft.licenseExpiry ? draft.licenseExpiry.split('T')[0] : '',
            insuranceExpiry: draft.insuranceExpiry ? draft.insuranceExpiry.split('T')[0] : '',
          })
        }
        setCheckingAuth(false)
      } catch (e) {
        setCheckingAuth(false)
      }
    }
    checkAuth()
  }, [router])

  const createDraft = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await fetch('/api/verification/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ action: 'create_draft' }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 404) {
          localStorage.removeItem('user')
          window.dispatchEvent(new CustomEvent('userLogout'))
          toast.error('Session expired. Please sign in again.')
          router.push('/login?redirect=/driver/verify')
          return
        }
        throw new Error(data.error || 'Failed')
      }
      setSubmissionId(data.id)
      setSubmission(data)
      // Pre-fill name and phone from logged-in user
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (userStr) {
        try {
          const u = JSON.parse(userStr)
          setFormData((prev) => ({ ...prev, fullName: u.name || '', phone: u.phone || '' }))
        } catch (_) {}
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create draft')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (field: string, file: File | null) => {
    if (!file) {
      setFiles((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File must be under 5MB')
      return
    }
    setFiles((prev) => ({ ...prev, [field]: file }))
  }

  const uploadFile = async (field: string, file: File): Promise<boolean> => {
    if (!userId || !submissionId) return false
    const formData = new FormData()
    formData.append('documentType', field)
    formData.append('submissionId', submissionId)
    formData.append('file', file)
    const res = await fetch('/api/verification/upload', {
      method: 'POST',
      headers: { 'x-user-id': userId },
      body: formData,
    })
    if (!res.ok) {
      const data = await res.json()
      toast.error(data.error || 'Upload failed')
      return false
    }
    return true
  }

  const saveStep = async (stepId: string, data: Record<string, unknown>) => {
    if (!userId || !submissionId) return false
    const res = await fetch('/api/verification/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
      body: JSON.stringify({
        action: 'save_step',
        submissionId,
        step: stepId,
        ...data,
      }),
    })
    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error || 'Save failed')
      return false
    }
    const updated = await res.json()
    setSubmission(updated)
    return true
  }

  const handleNext = async () => {
    setErrors({})
    const current = STEPS[step]
    if (current.id === 'personal') {
      const { fullName, phone, dateOfBirth, nationalIdNumber } = formData
      if (!fullName?.trim()) { setErrors({ fullName: 'Required' }); return }
      if (!phone?.trim()) { setErrors({ phone: 'Required' }); return }
      if (!dateOfBirth) { setErrors({ dateOfBirth: 'Required' }); return }
      if (!/^\d{14,16}$/.test(nationalIdNumber || '')) {
        setErrors({ nationalIdNumber: 'Must be 14-16 digits' })
        return
      }
      if (submissionId) {
        setLoading(true)
        const ok = await saveStep('personal', {
          fullName: formData.fullName,
          phone: formData.phone,
          dateOfBirth: formData.dateOfBirth,
          nationalIdNumber: formData.nationalIdNumber,
        })
        setLoading(false)
        if (!ok) return
      }
    }
    if (current.id === 'vehicle') {
      const { plateNumber, vehicleMake, vehicleModel, vehicleColor, vehicleSeats } = formData
      if (!plateNumber?.trim()) { setErrors({ plateNumber: 'Required' }); return }
      if (!vehicleMake?.trim()) { setErrors({ vehicleMake: 'Required' }); return }
      if (!vehicleModel?.trim()) { setErrors({ vehicleModel: 'Required' }); return }
      if (!vehicleColor?.trim()) { setErrors({ vehicleColor: 'Required' }); return }
      if (submissionId) {
        setLoading(true)
        const ok = await saveStep('vehicle', {
          plateNumber,
          vehicleMake,
          vehicleModel,
          vehicleColor,
          vehicleSeats: Number(vehicleSeats),
        })
        setLoading(false)
        if (!ok) return
      }
    }
    if (['nationalId', 'license', 'yellowCard', 'insurance', 'vehiclePhotos'].includes(current.id)) {
      const fieldMap: Record<string, string[]> = {
        nationalId: ['nationalIdFront', 'nationalIdBack'],
        license: ['licenseFront', 'licenseBack'],
        yellowCard: ['yellowCard'],
        insurance: ['insurance'],
        vehiclePhotos: ['vehiclePhotoFront', 'vehiclePhotoRear'],
      }
      const dbFieldMap: Record<string, string> = {
        yellowCard: 'yellowCardPath',
        insurance: 'insurancePath',
      }
      const fields = fieldMap[current.id] || []
      for (const f of fields) {
        const file = files[f]
        const dbField = dbFieldMap[f] || f
        const hasInSubmission = submission?.[dbField]
        if (!file && !hasInSubmission) {
          setErrors({ [f]: 'Required' })
          return
        }
        if (file && submissionId) {
          setLoading(true)
          const uploadType = f === 'yellowCard' ? 'yellowCard' : f === 'insurance' ? 'insurance' : f
          const ok = await uploadFile(uploadType, file)
          setLoading(false)
          if (!ok) return
          setFiles((prev) => {
            const next = { ...prev }
            delete next[f]
            return next
          })
        }
      }
    }
    if (current.id === 'review') {
      setLoading(true)
      try {
        const res = await fetch('/api/verification/submissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-user-id': userId! },
          body: JSON.stringify({ action: 'submit', submissionId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Submit failed')
        toast.success('Submission sent! We will review shortly.')
        router.push('/trips')
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Submit failed')
      } finally {
        setLoading(false)
      }
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const handleBack = () => setStep((s) => Math.max(0, s - 1))

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-lg font-medium text-gray-900">Loading...</div>
      </div>
    )
  }

  if (submission?.status && ['SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED'].includes(submission.status)) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Verification Status</h1>
            <p className="text-gray-700 mb-4">
              Your submission is <span className="font-semibold">{submission.status.replace('_', ' ')}</span>.
            </p>
            {submission.rejectionReason && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-amber-800">Feedback:</p>
                <p className="text-amber-900">{submission.rejectionReason}</p>
              </div>
            )}
            {submission.status === 'CHANGES_REQUESTED' && (
              <button
                onClick={createDraft}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold disabled:opacity-50"
              >
                Resubmit
              </button>
            )}
            <Link href="/trips" className="block mt-4 text-blue-600 hover:underline font-medium">
              ← Back to Trips
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!submissionId && !loading) {
    return (
      <div className="min-h-screen bg-gray-100 py-8 px-4">
        <div className="max-w-xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Driver Verification</h1>
          <p className="text-gray-700 mb-6">
            Submit your documents to get verified and start posting trips.
          </p>
          <button
            onClick={createDraft}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold"
          >
            {loading ? 'Creating...' : 'Start Verification'}
          </button>
        </div>
      </div>
    )
  }

  const current = STEPS[step]
  const docUrl = (path: string) =>
    path && userId
      ? `/api/verification/documents?path=${encodeURIComponent(path)}`
      : null

  return (
    <div className="min-h-screen bg-gray-100 py-6 sm:py-8 px-4 pb-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 sm:mb-6">
          <Link href="/trips" className="text-blue-600 hover:underline text-sm font-medium">
            ← Back to Trips
          </Link>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Driver Verification</h1>
        <p className="text-gray-700 mb-4 sm:mb-6 text-sm sm:text-base">Step {step + 1} of {STEPS.length}: {current.title}</p>

        <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setStep(i)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium ${
                i === step ? 'bg-blue-600 text-white' : i < step ? 'bg-blue-200 text-blue-900' : 'bg-gray-300 text-gray-700'
              }`}
            >
              {s.icon}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 border border-gray-200">
          {current.id === 'personal' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Full Name</label>
                <input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500"
                  placeholder="Jean Baptiste"
                />
                {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Phone</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
                {errors.phone && <p className="text-red-600 text-sm mt-1">{errors.phone}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
                {errors.dateOfBirth && <p className="text-red-600 text-sm mt-1">{errors.dateOfBirth}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">National ID Number (14-16 digits)</label>
                <input
                  value={formData.nationalIdNumber}
                  onChange={(e) => setFormData({ ...formData, nationalIdNumber: e.target.value.replace(/\D/g, '') })}
                  maxLength={16}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
                {errors.nationalIdNumber && <p className="text-red-600 text-sm mt-1">{errors.nationalIdNumber}</p>}
              </div>
            </div>
          )}

          {current.id === 'nationalId' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">National ID Front</label>
                <input
                  type="file"
                  accept={FILE_ACCEPT.image}
                  onChange={(e) => handleFileChange('nationalIdFront', e.target.files?.[0] || null)}
                  className="w-full text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
                />
                {submission?.nationalIdFront && (
                  <p className="text-green-600 text-sm mt-1">✓ Uploaded</p>
                )}
                {errors.nationalIdFront && <p className="text-red-600 text-sm">{errors.nationalIdFront}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">National ID Back</label>
                <input
                  type="file"
                  accept={FILE_ACCEPT.image}
                  onChange={(e) => handleFileChange('nationalIdBack', e.target.files?.[0] || null)}
                  className="w-full text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
                />
                {submission?.nationalIdBack && <p className="text-green-600 text-sm mt-1">✓ Uploaded</p>}
                {errors.nationalIdBack && <p className="text-red-600 text-sm">{errors.nationalIdBack}</p>}
              </div>
            </div>
          )}

          {current.id === 'license' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">License Front</label>
                <input
                  type="file"
                  accept={FILE_ACCEPT.image}
                  onChange={(e) => handleFileChange('licenseFront', e.target.files?.[0] || null)}
                  className="w-full text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
                />
                {submission?.licenseFront && <p className="text-green-600 text-sm mt-1">✓ Uploaded</p>}
                {errors.licenseFront && <p className="text-red-600 text-sm">{errors.licenseFront}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">License Back</label>
                <input
                  type="file"
                  accept={FILE_ACCEPT.image}
                  onChange={(e) => handleFileChange('licenseBack', e.target.files?.[0] || null)}
                  className="w-full text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
                />
                {submission?.licenseBack && <p className="text-green-600 text-sm mt-1">✓ Uploaded</p>}
                {errors.licenseBack && <p className="text-red-600 text-sm">{errors.licenseBack}</p>}
              </div>
            </div>
          )}

          {current.id === 'vehicle' && (
            <div className="space-y-4">
              {['plateNumber', 'vehicleMake', 'vehicleModel', 'vehicleColor'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-semibold text-gray-900 mb-1">
                    {field.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                  </label>
                  <input
                    value={(formData as any)[field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                  />
                  {errors[field] && <p className="text-red-600 text-sm">{errors[field]}</p>}
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Seats</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.vehicleSeats}
                  onChange={(e) => setFormData({ ...formData, vehicleSeats: parseInt(e.target.value) || 4 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900"
                />
              </div>
            </div>
          )}

          {current.id === 'yellowCard' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Vehicle Yellow Card (image/PDF)</label>
              <input
                type="file"
                accept={FILE_ACCEPT.doc}
                onChange={(e) => handleFileChange('yellowCard', e.target.files?.[0] || null)}
                className="w-full text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
              />
              {submission?.yellowCardPath && <p className="text-green-600 text-sm mt-1">✓ Uploaded</p>}
              {errors.yellowCard && <p className="text-red-600 text-sm">{errors.yellowCard}</p>}
            </div>
          )}

          {current.id === 'insurance' && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">Insurance Proof (image/PDF)</label>
              <input
                type="file"
                accept={FILE_ACCEPT.doc}
                onChange={(e) => handleFileChange('insurance', e.target.files?.[0] || null)}
                className="w-full text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
              />
              {submission?.insurancePath && <p className="text-green-600 text-sm mt-1">✓ Uploaded</p>}
              {errors.insurance && <p className="text-red-600 text-sm">{errors.insurance}</p>}
            </div>
          )}

          {current.id === 'vehiclePhotos' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Vehicle Front</label>
                <input
                  type="file"
                  accept={FILE_ACCEPT.image}
                  onChange={(e) => handleFileChange('vehiclePhotoFront', e.target.files?.[0] || null)}
                  className="w-full text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
                />
                {submission?.vehiclePhotoFront && <p className="text-green-600 text-sm mt-1">✓ Uploaded</p>}
                {errors.vehiclePhotoFront && <p className="text-red-600 text-sm">{errors.vehiclePhotoFront}</p>}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">Vehicle Rear (plate visible)</label>
                <input
                  type="file"
                  accept={FILE_ACCEPT.image}
                  onChange={(e) => handleFileChange('vehiclePhotoRear', e.target.files?.[0] || null)}
                  className="w-full text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-medium"
                />
                {submission?.vehiclePhotoRear && <p className="text-green-600 text-sm mt-1">✓ Uploaded</p>}
                {errors.vehiclePhotoRear && <p className="text-red-600 text-sm">{errors.vehiclePhotoRear}</p>}
              </div>
            </div>
          )}

          {current.id === 'review' && (
            <div className="space-y-3 text-sm text-gray-900">
              <p><strong>Name:</strong> {formData.fullName}</p>
              <p><strong>Phone:</strong> {formData.phone}</p>
              <p><strong>DOB:</strong> {formData.dateOfBirth}</p>
              <p><strong>National ID:</strong> {maskNationalId(formData.nationalIdNumber)}</p>
              <p><strong>Vehicle:</strong> {formData.vehicleMake} {formData.vehicleModel} ({formData.vehicleColor})</p>
              <p><strong>Plate:</strong> {formData.plateNumber}</p>
              <p><strong>Documents:</strong> National ID, License, Yellow Card, Insurance, Vehicle Photos</p>
            </div>
          )}

          <div className="flex gap-4 mt-8">
            <button
              onClick={handleBack}
              disabled={step === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : current.id === 'review' ? 'Submit' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
