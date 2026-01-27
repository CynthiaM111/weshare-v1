import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get booking with trip
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Verify user is the driver
    if (booking.trip.driverId !== userId) {
      return NextResponse.json(
        { error: 'Only the driver can confirm bookings' },
        { status: 403 }
      )
    }

    // Check if trip has enough seats
    const confirmedBookings = await prisma.booking.findMany({
      where: {
        tripId: booking.tripId,
        status: {
          in: ['CONFIRMED', 'COMPLETED'],
        },
      },
    })

    const bookedSeats = confirmedBookings.reduce((sum, b) => sum + b.seats, 0)
    const availableSeats = booking.trip.availableSeats - bookedSeats

    if (booking.seats > availableSeats) {
      return NextResponse.json(
        { error: 'Not enough seats available' },
        { status: 400 }
      )
    }

    // Confirm booking
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CONFIRMED',
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

    return NextResponse.json(updatedBooking)
  } catch (error) {
    console.error('Error confirming booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

