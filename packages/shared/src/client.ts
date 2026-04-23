import type {
  AuthResponse,
  BusTrip,
  BusTripFilters,
  CarpoolBooking,
  ProfileResponse,
  SessionUser,
  Trip,
  TripFilters,
} from './types'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text()
  const data = (text ? JSON.parse(text) : {}) as { error?: string }
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : res.statusText || 'Request failed'
    throw new Error(msg)
  }
  return data as T
}

function withUserId(userId: string | null): HeadersInit {
  const headers: Record<string, string> = { ...JSON_HEADERS }
  if (userId) headers['x-user-id'] = userId
  return headers
}

function buildQuery(params: Record<string, string | undefined>): string {
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, v)
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export function createWeShareClient(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, '')

  return {
    baseUrl: base,

    async login(phone: string): Promise<AuthResponse> {
      const res = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ phone }),
      })
      return parseJson<AuthResponse>(res)
    },

    async signup(phone: string, name: string): Promise<AuthResponse> {
      const res = await fetch(`${base}/api/auth/signup`, {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ phone, name }),
      })
      return parseJson<AuthResponse>(res)
    },

    async getProfile(userId: string): Promise<ProfileResponse> {
      const res = await fetch(`${base}/api/profile`, {
        headers: withUserId(userId),
      })
      return parseJson<ProfileResponse>(res)
    },

    async getTrips(filters: TripFilters = {}): Promise<Trip[]> {
      const q = buildQuery({
        departCity: filters.departCity,
        destinationCity: filters.destinationCity,
        date: filters.date,
        status: filters.status ?? 'ACTIVE',
      })
      const res = await fetch(`${base}/api/trips${q}`)
      return parseJson<Trip[]>(res)
    },

    async getTripById(id: string): Promise<Trip | null> {
      const res = await fetch(`${base}/api/trips?id=${encodeURIComponent(id)}`)
      const data = await parseJson<Trip[]>(res)
      return data[0] ?? null
    },

    async getBusTrips(filters: BusTripFilters = {}): Promise<BusTrip[]> {
      const q = buildQuery({
        departCity: filters.departCity,
        destinationCity: filters.destinationCity,
        date: filters.date,
        status: filters.status ?? 'ACTIVE',
      })
      const res = await fetch(`${base}/api/bus-trips${q}`)
      return parseJson<BusTrip[]>(res)
    },

    async getBusTripById(id: string): Promise<BusTrip | null> {
      const res = await fetch(`${base}/api/bus-trips?id=${encodeURIComponent(id)}`)
      const data = await parseJson<BusTrip[]>(res)
      return data[0] ?? null
    },

    async getBookings(userId: string): Promise<CarpoolBooking[]> {
      const res = await fetch(`${base}/api/bookings`, {
        headers: withUserId(userId),
      })
      return parseJson<CarpoolBooking[]>(res)
    },

    async createBooking(
      userId: string,
      body: { tripId: string; seats: number }
    ): Promise<CarpoolBooking> {
      const res = await fetch(`${base}/api/bookings`, {
        method: 'POST',
        headers: withUserId(userId),
        body: JSON.stringify(body),
      })
      return parseJson<CarpoolBooking>(res)
    },

    async createTicketBooking(
      userId: string,
      body: { busTripId: string; seats: number }
    ): Promise<unknown> {
      const res = await fetch(`${base}/api/ticket-bookings`, {
        method: 'POST',
        headers: withUserId(userId),
        body: JSON.stringify(body),
      })
      return parseJson(res)
    },

    async getMyTrips(userId: string): Promise<Trip[]> {
      const res = await fetch(`${base}/api/trips/my-trips`, {
        headers: withUserId(userId),
      })
      return parseJson<Trip[]>(res)
    },
  }
}

export type WeShareClient = ReturnType<typeof createWeShareClient>

/** Narrow API user to session shape (same fields returned by login). */
export function toSessionUser(u: ProfileResponse): SessionUser {
  return {
    id: u.id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    phoneVerified: u.phoneVerified,
    profileImageUrl: u.profileImageUrl ?? null,
    isVerified: u.isVerified,
  }
}
