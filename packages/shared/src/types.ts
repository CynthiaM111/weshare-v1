export type UserRole =
  | 'DRIVER'
  | 'PASSENGER'
  | 'AGENCY'
  | 'ADMIN'
  | 'SUPER_ADMIN'

export interface SessionUser {
  id: string
  phone: string
  name: string
  role: UserRole
  phoneVerified: boolean
  profileImageUrl: string | null
  isVerified?: boolean
}

export interface AuthResponse {
  user: SessionUser
  message?: string
}

export interface TripDriver {
  id: string
  name: string
  phone: string
  driverVerified?: boolean
}

export interface TripBookingStub {
  id: string
  seats: number
  status: string
}

export interface Trip {
  id: string
  driverId: string
  departCity: string
  departLocation: string
  destinationCity: string
  destinationLocation: string
  date: string
  time: string
  availableSeats: number
  price: number
  carModel: string
  status: string
  driver: TripDriver
  bookings?: TripBookingStub[]
}

export interface BusAgency {
  id: string
  name: string
  phone: string
}

export interface BusTrip {
  id: string
  agencyId: string
  departCity: string
  destinationCity: string
  date: string
  time: string
  totalSeats: number
  availableSeats: number
  status: string
  agency: BusAgency
  ticketBookings?: Array<{ id: string; seats: number; status: string }>
}

export interface BookingTrip extends Trip {
  bookings?: TripBookingStub[]
}

export interface CarpoolBooking {
  id: string
  tripId: string
  userId: string
  seats: number
  status: string
  createdAt: string
  trip: BookingTrip
  payments?: Array<{ id: string }>
}

export interface ProfileResponse extends SessionUser {}

export type TripFilters = {
  departCity?: string
  destinationCity?: string
  date?: string
  status?: string
}

export type BusTripFilters = {
  departCity?: string
  destinationCity?: string
  date?: string
  status?: string
}
