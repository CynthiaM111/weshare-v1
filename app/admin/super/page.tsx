'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

interface AdminUser {
  id: string
  phone: string
  name: string
  role: string
  createdAt: string
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null
    if (!userStr) {
      router.push('/login?redirect=/admin/super')
      return
    }
    const user = JSON.parse(userStr)
    if (user?.role !== 'SUPER_ADMIN') {
      router.push('/')
      return
    }
    setUserId(user.id)
  }, [router])

  useEffect(() => {
    if (!userId) return
    fetch('/api/admin/users', { headers: { 'x-user-id': userId } })
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setAdmins(data) : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ phone: phone.trim(), name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create admin')
      toast.success(data.message || 'Admin created successfully')
      setPhone('')
      setName('')
      setAdmins((prev) => [data.user, ...prev])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setSubmitting(false)
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Manage Admins</h1>
          <Link
            href="/admin/verification"
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            ← Driver Verifications
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Admin</h2>
          <p className="text-sm text-gray-600 mb-4">
            Admins you create can log in directly at /login with their phone number — no signup required.
          </p>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="+250788123456 or 0788123456"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Admin Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition"
            >
              {submitting ? 'Creating...' : 'Create Admin'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b border-gray-200">
            Admin Users
          </h2>
          {loading ? (
            <div className="py-12 text-center text-gray-500">Loading...</div>
          ) : admins.length === 0 ? (
            <div className="py-12 text-center text-gray-500">No admins yet. Create one above.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {admins.map((a) => (
                <li key={a.id} className="px-6 py-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{a.name}</p>
                    <p className="text-sm text-gray-600">{a.phone}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      a.role === 'SUPER_ADMIN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {a.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
