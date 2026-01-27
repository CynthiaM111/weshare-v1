import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const bookingSchema = z.object({
  tripId: z.string().min(1),
  seats: z.number().int().min(1).max(4),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = bookingSchema.parse(body)

    // Get user from request headers
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify trip exists and has available seats
    const trip = await prisma.trip.findUnique({
      where: { id: validatedData.tripId },
      include: {
        bookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'COMPLETED'],
            },
          },
        },
      },
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    if (trip.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Trip is not active' },
        { status: 400 }
      )
    }

    // Check if user is the driver
    if (trip.driverId === userId) {
      return NextResponse.json(
        { error: 'Drivers cannot book their own trips' },
        { status: 400 }
      )
    }

    // Calculate available seats
    const bookedSeats = trip.bookings.reduce((sum, b) => sum + b.seats, 0)
    const availableSeats = trip.availableSeats - bookedSeats

    if (validatedData.seats > availableSeats) {
      return NextResponse.json(
        { error: `Only ${availableSeats} seat(s) available` },
        { status: 400 }
      )
    }

    // Create booking
    const booking = await prisma.booking.create({
      data: {
        tripId: validatedData.tripId,
        userId,
        seats: validatedData.seats,
        status: 'PENDING',
      },
      include: {
        trip: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        passenger: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        trip: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

