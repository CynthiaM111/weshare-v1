import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Handle params - Next.js 14.2.0 uses synchronous params
    const bookingId = params.id
    
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify booking exists and user is the owner
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

    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: 'You can only cancel your own bookings' },
        { status: 403 }
      )
    }

    // Check if booking can be cancelled
    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      )
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed booking' },
        { status: 400 }
      )
    }

    // Check cancellation time limit (at least 1 hour before departure)
    const tripDateTime = new Date(`${booking.trip.date.toISOString().split('T')[0]}T${booking.trip.time}`)
    const now = new Date()
    const hoursUntilTrip = (tripDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)

    if (hoursUntilTrip < 1) {
      return NextResponse.json(
        { error: 'Cancellations must be made at least 1 hour before departure' },
        { status: 400 }
      )
    }

    // Check if trip has already passed
    if (tripDateTime <= now) {
      return NextResponse.json(
        { error: 'Cannot cancel a booking for a trip that has already passed' },
        { status: 400 }
      )
    }

    // Update booking status to cancelled
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
      },
    })

    return NextResponse.json({ message: 'Booking cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
