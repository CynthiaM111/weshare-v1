import type { User, UserRole, TripStatus, BookingStatus, PaymentStatus, PaymentMethod } from '@prisma/client'

export type { User, UserRole, TripStatus, BookingStatus, PaymentStatus, PaymentMethod }

export interface AuthResponse {
  user: User
  message?: string
}

export interface TripCreateInput {
  departCity: string
  departLocation: string
  destinationCity: string
  destinationLocation: string
  date: string
  time: string
  availableSeats: number
  price: number
  carModel: string
}

export interface BookingCreateInput {
  tripId: string
  seats: number
}

export interface BusTripCreateInput {
  departCity: string
  destinationCity: string
  date: string
  time: string
  totalSeats: number
}

