import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const ticketBookingSchema = z.object({
  busTripId: z.string().min(1),
  seats: z.number().int().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = ticketBookingSchema.parse(body)
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get bus trip
    const busTrip = await prisma.busTrip.findUnique({
      where: { id: validatedData.busTripId },
      include: {
        ticketBookings: {
          where: {
            status: {
              in: ['CONFIRMED', 'COMPLETED'],
            },
          },
        },
      },
    })

    if (!busTrip) {
      return NextResponse.json(
        { error: 'Bus trip not found' },
        { status: 404 }
      )
    }

    if (busTrip.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Bus trip is not active' },
        { status: 400 }
      )
    }

    // Validate: bookings must be made at most 2 hours before trip
    const tripDateTime = new Date(`${busTrip.date.toISOString().split('T')[0]}T${busTrip.time}`)
    const now = new Date()
    const hoursUntilTrip = (tripDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilTrip < 2) {
      return NextResponse.json(
        { error: 'Bookings must be made at least 2 hours before departure' },
        { status: 400 }
      )
    }

    // Calculate available seats
    const bookedSeats = busTrip.ticketBookings.reduce((sum, b) => sum + b.seats, 0)
    const availableSeats = busTrip.availableSeats - bookedSeats

    if (validatedData.seats > availableSeats) {
      return NextResponse.json(
        { error: `Only ${availableSeats} seat(s) available` },
        { status: 400 }
      )
    }

    // Create ticket booking
    const ticketBooking = await prisma.ticketBooking.create({
      data: {
        busTripId: validatedData.busTripId,
        userId,
        seats: validatedData.seats,
        status: 'CONFIRMED', // Auto-confirm bus ticket bookings
      },
      include: {
        busTrip: {
          include: {
            agency: {
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

    // Update available seats
    await prisma.busTrip.update({
      where: { id: validatedData.busTripId },
      data: {
        availableSeats: availableSeats - validatedData.seats,
      },
    })

    return NextResponse.json(ticketBooking, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating ticket booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bookingId = searchParams.get('id')
    const userId = request.headers.get('x-user-id')

    if (!userId || !bookingId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const ticketBooking = await prisma.ticketBooking.findUnique({
      where: { id: bookingId },
      include: {
        busTrip: true,
      },
    })

    if (!ticketBooking) {
      return NextResponse.json(
        { error: 'Ticket booking not found' },
        { status: 404 }
      )
    }

    if (ticketBooking.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check cancellation time limit (e.g., 24 hours before trip)
    const tripDateTime = new Date(`${ticketBooking.busTrip.date.toISOString().split('T')[0]}T${ticketBooking.busTrip.time}`)
    const now = new Date()
    const hoursUntilTrip = (tripDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilTrip < 24) {
      return NextResponse.json(
        { error: 'Cancellations must be made at least 24 hours before departure' },
        { status: 400 }
      )
    }

    // Update booking status to cancelled
    await prisma.ticketBooking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
      },
    })

    // Restore available seats
    await prisma.busTrip.update({
      where: { id: ticketBooking.busTripId },
      data: {
        availableSeats: {
          increment: ticketBooking.seats,
        },
      },
    })

    return NextResponse.json({ message: 'Ticket cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling ticket:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

