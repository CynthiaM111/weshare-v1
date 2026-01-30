import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const tripUpdateSchema = z.object({
  departCity: z.string().min(1).optional(),
  departLocation: z.string().min(1).optional(),
  destinationCity: z.string().min(1).optional(),
  destinationLocation: z.string().min(1).optional(),
  date: z.string().optional(),
  time: z.string().min(1).optional(),
  availableSeats: z.number().int().min(1).max(4).optional(),
  price: z.number().int().min(0).optional(),
  carModel: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripId = params.id
    const body = await request.json()
    const validatedData = tripUpdateSchema.parse(body)

    // Get user from request headers
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify trip exists and user is the owner
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    if (trip.driverId !== userId) {
      return NextResponse.json(
        { error: 'You can only edit your own trips' },
        { status: 403 }
      )
    }

    // Check if trip has confirmed bookings - if so, restrict what can be edited
    const confirmedBookings = await prisma.booking.findMany({
      where: {
        tripId,
        status: {
          in: ['CONFIRMED', 'COMPLETED'],
        },
      },
    })

    // If there are confirmed bookings, only allow editing certain fields
    if (confirmedBookings.length > 0) {
      // Only allow editing status, date, and time if there are confirmed bookings
      const allowedFields = ['status', 'date', 'time']
      const restrictedFields = Object.keys(validatedData).filter(
        key => !allowedFields.includes(key)
      )
      
      if (restrictedFields.length > 0) {
        return NextResponse.json(
          { error: 'Cannot edit trip details when there are confirmed bookings. You can only change status, date, or time.' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = { ...validatedData }
    if (validatedData.date) {
      updateData.date = new Date(validatedData.date)
    }

    const updatedTrip = await prisma.trip.update({
      where: { id: tripId },
      data: updateData,
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        bookings: {
          select: {
            id: true,
            seats: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(updatedTrip)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error updating trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tripId = params.id

    // Get user from request headers
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify trip exists and user is the owner
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
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

    if (trip.driverId !== userId) {
      return NextResponse.json(
        { error: 'You can only delete your own trips' },
        { status: 403 }
      )
    }

    // Check if trip has confirmed or completed bookings
    if (trip.bookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete trip with confirmed or completed bookings. Please cancel the trip instead.' },
        { status: 400 }
      )
    }

    // Delete the trip (cascade will handle related bookings and messages)
    await prisma.trip.delete({
      where: { id: tripId },
    })

    return NextResponse.json({ message: 'Trip deleted successfully' })
  } catch (error) {
    console.error('Error deleting trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
