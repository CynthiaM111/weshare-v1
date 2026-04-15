'use client'

import { useEffect, useState, useCallback } from 'react'
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

interface Driver {
  id: string
  phone: string
  name: string
  driverVerified: boolean
  licensePlate: string | null
  createdAt: string
  _count: { tripsAsDriver: number; verificationSubmissions: number }
}

interface Stats {
  drivers: number
  passengers: number
  agencies: number
  admins: number
  trips: number
  bookings: number
  completedBookings: number
  payments: number
  totalRevenue: number
}

type Tab = 'overview' | 'drivers' | 'admins'

export default function SuperAdminPage() {
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [driversLoading, setDriversLoading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [demotingId, setDemotingId] = useState<string | null>(null)
  const [driverSearch, setDriverSearch] = useState('')
  const [driverSearchDebounced, setDriverSearchDebounced] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('overview')

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

  const headers = () => (userId ? { 'x-user-id': userId } : {})

  useEffect(() => {
    if (!userId) return
    Promise.all([
      fetch('/api/admin/users', { headers: headers() }).then((r) => r.json()),
      fetch('/api/admin/stats', { headers: headers() }).then((r) => r.json()),
    ])
      .then(([adminsData, statsData]) => {
        setAdmins(Array.isArray(adminsData) ? adminsData : [])
        if (statsData?.drivers !== undefined) setStats(statsData)
        else setStats(null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [userId])

  const fetchDrivers = useCallback(
    (q: string) => {
      if (!userId) return
      setDriversLoading(true)
      const url = q ? `/api/admin/drivers?q=${encodeURIComponent(q)}` : '/api/admin/drivers'
      fetch(url, { headers: headers() })
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? setDrivers(data) : setDrivers([])))
        .catch(() => setDrivers([]))
        .finally(() => setDriversLoading(false))
    },
    [userId]
  )

  useEffect(() => {
    if (!userId || activeTab !== 'drivers') return
    fetchDrivers(driverSearchDebounced)
  }, [userId, activeTab, driverSearchDebounced, fetchDrivers])

  useEffect(() => {
    const t = setTimeout(() => setDriverSearchDebounced(driverSearch), 300)
    return () => clearTimeout(t)
  }, [driverSearch])

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
      if (stats) setStats({ ...stats, admins: stats.admins + 1 })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveAdmin = async (admin: AdminUser) => {
    if (admin.role === 'SUPER_ADMIN') return
    if (!userId) return
    if (!confirm(`Remove admin privileges from ${admin.name}? They will become a regular passenger.`)) return
    setDemotingId(admin.id)
    try {
      const res = await fetch(`/api/admin/users/${admin.id}`, {
        method: 'PATCH',
        headers: { 'x-user-id': userId },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove admin')
      toast.success(data.message || 'Admin privileges removed')
      setAdmins((prev) => prev.filter((a) => a.id !== admin.id))
      if (stats) setStats({ ...stats, admins: stats.admins - 1 })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove admin')
    } finally {
      setDemotingId(null)
    }
  }

  const formatDate = (s: string) => {
    try {
      return new Date(s).toLocaleDateString(undefined, { dateStyle: 'medium' })
    } catch {
      return s
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-RW', {
      style: 'currency',
      currency: 'RWF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600" />
      </div>
    )
  }

  const tabClass = (tab: Tab) =>
    `px-4 py-2 rounded-lg text-sm font-medium transition ${
      activeTab === tab
        ? 'bg-amber-600 text-white'
        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
    }`

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Super Admin Dashboard</h1>
          <Link
            href="/admin/verification"
            className="text-amber-600 hover:text-amber-700 font-medium shrink-0"
          >
            ← Driver Verifications
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <button type="button" onClick={() => setActiveTab('overview')} className={tabClass('overview')}>
            Overview
          </button>
          <button type="button" onClick={() => setActiveTab('drivers')} className={tabClass('drivers')}>
            Drivers
          </button>
          <button type="button" onClick={() => setActiveTab('admins')} className={tabClass('admins')}>
            Admins
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <section className="bg-white rounded-xl shadow border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Platform statistics</h2>
              {loading && !stats ? (
                <div className="py-8 text-center text-gray-500">Loading stats...</div>
              ) : stats ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-2xl font-bold text-amber-800">{stats.drivers}</p>
                    <p className="text-sm text-amber-700">Drivers</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-2xl font-bold text-blue-800">{stats.passengers}</p>
                    <p className="text-sm text-blue-700">Passengers</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                    <p className="text-2xl font-bold text-emerald-800">{stats.agencies}</p>
                    <p className="text-sm text-emerald-700">Agencies</p>
                  </div>
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
                    <p className="text-2xl font-bold text-violet-800">{stats.admins}</p>
                    <p className="text-sm text-violet-700">Admins</p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-2xl font-bold text-gray-800">{stats.trips}</p>
                    <p className="text-sm text-gray-600">Trips</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <p className="text-2xl font-bold text-slate-800">{stats.bookings}</p>
                    <p className="text-sm text-slate-600">Bookings</p>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <p className="text-2xl font-bold text-teal-800">{stats.completedBookings}</p>
                    <p className="text-sm text-teal-600">Completed</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 col-span-2 sm:col-span-1">
                    <p className="text-xl font-bold text-green-800">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-sm text-green-700">Total revenue</p>
                  </div>
                </div>
              ) : (
                <div className="py-4 text-gray-500">Could not load statistics.</div>
              )}
            </section>
          </div>
        )}

        {activeTab === 'drivers' && (
          <section className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
              <h2 className="text-lg font-semibold text-gray-900">All drivers</h2>
              <div className="flex-1 min-w-0">
                <input
                  type="search"
                  placeholder="Search by name or phone..."
                  value={driverSearch}
                  onChange={(e) => setDriverSearch(e.target.value)}
                  className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                />
              </div>
              {stats !== null && (
                <span className="text-sm text-gray-500">{stats.drivers} driver{stats.drivers !== 1 ? 's' : ''}</span>
              )}
            </div>
            {driversLoading ? (
              <div className="py-12 text-center text-gray-500">Loading drivers...</div>
            ) : drivers.length === 0 ? (
              <div className="py-12 text-center text-gray-500 px-4">
                {driverSearchDebounced ? 'No drivers match your search.' : 'No drivers yet.'}
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {drivers.map((d) => (
                  <li key={d.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{d.name}</p>
                      <p className="text-sm text-gray-600 truncate">{d.phone}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          d.driverVerified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {d.driverVerified ? 'Verified' : 'Not verified'}
                      </span>
                      {d.licensePlate && (
                        <span className="text-gray-600">Plate: {d.licensePlate}</span>
                      )}
                      <span className="text-gray-500">{d._count.tripsAsDriver} trips</span>
                      <span className="text-gray-400">{formatDate(d.createdAt)}</span>
                    </div>
                    <Link
                      href="/admin/verification"
                      className="text-amber-600 hover:text-amber-700 text-sm font-medium shrink-0"
                    >
                      Verifications →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {activeTab === 'admins' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow border border-gray-200 p-4 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create new admin</h2>
              <p className="text-sm text-gray-600 mb-4">
                Admins you create can log in directly at /login with their phone number — no signup required.
              </p>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                  <input
                    type="text"
                    placeholder="Admin name"
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
                  {submitting ? 'Creating...' : 'Create admin'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-900 px-4 sm:px-6 py-4 border-b border-gray-200">
                Admin users
              </h2>
              {loading ? (
                <div className="py-12 text-center text-gray-500">Loading...</div>
              ) : admins.length === 0 ? (
                <div className="py-12 text-center text-gray-500 px-4">No admins yet. Create one above.</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {admins.map((a) => (
                    <li key={a.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{a.name}</p>
                        <p className="text-sm text-gray-600 truncate">{a.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold w-fit ${
                            a.role === 'SUPER_ADMIN'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {a.role === 'SUPER_ADMIN' ? 'Super admin' : 'Admin'}
                        </span>
                        {a.role === 'ADMIN' && (
                          <button
                            type="button"
                            onClick={() => handleRemoveAdmin(a)}
                            disabled={demotingId === a.id}
                            className="px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 rounded border border-red-200 disabled:opacity-50"
                          >
                            {demotingId === a.id ? 'Removing...' : 'Remove admin'}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
