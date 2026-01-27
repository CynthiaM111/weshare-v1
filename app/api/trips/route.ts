import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const tripSchema = z.object({
  departCity: z.string().min(1),
  departLocation: z.string().min(1),
  destinationCity: z.string().min(1),
  destinationLocation: z.string().min(1),
  date: z.string(),
  time: z.string().min(1),
  availableSeats: z.number().int().min(1).max(4),
  price: z.number().int().min(0),
  carModel: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    // If ID is provided, return single trip
    if (id) {
      const trip = await prisma.trip.findUnique({
        where: { id },
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
      
      if (!trip) {
        return NextResponse.json(
          { error: 'Trip not found' },
          { status: 404 }
        )
      }
      
      return NextResponse.json([trip])
    }

    const departCity = searchParams.get('departCity')
    const destinationCity = searchParams.get('destinationCity')
    const date = searchParams.get('date')
    const status = searchParams.get('status') || 'ACTIVE'

    const where: any = {
      status: status as any,
    }

    if (departCity) {
      where.departCity = departCity
    }

    if (destinationCity) {
      where.destinationCity = destinationCity
    }

    if (date) {
      const dateObj = new Date(date)
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0))
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999))
      where.date = {
        gte: startOfDay,
        lte: endOfDay,
      }
    }

    const trips = await prisma.trip.findMany({
      where,
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
      orderBy: {
        date: 'asc',
      },
    })

    return NextResponse.json(trips)
  } catch (error) {
    console.error('Error fetching trips:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = tripSchema.parse(body)

    // Get user from request headers (simplified - in production use proper auth)
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a driver
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.role !== 'DRIVER') {
      return NextResponse.json(
        { error: 'Only drivers can post trips' },
        { status: 403 }
      )
    }

    const trip = await prisma.trip.create({
      data: {
        ...validatedData,
        date: new Date(validatedData.date),
        driverId: userId,
      },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json(trip, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

