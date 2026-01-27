import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const busTripSchema = z.object({
  departCity: z.string().min(1),
  destinationCity: z.string().min(1),
  date: z.string(),
  time: z.string().min(1),
  totalSeats: z.number().int().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')
    
    // If ID is provided, return single bus trip
    if (id) {
      const busTrip = await prisma.busTrip.findUnique({
        where: { id },
        include: {
          agency: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          ticketBookings: {
            select: {
              id: true,
              seats: true,
              status: true,
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
      
      return NextResponse.json([busTrip])
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

    const trips = await prisma.busTrip.findMany({
      where,
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        ticketBookings: {
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
    console.error('Error fetching bus trips:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = busTripSchema.parse(body)
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is an agency
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user || user.role !== 'AGENCY') {
      return NextResponse.json(
        { error: 'Only agencies can post bus trips' },
        { status: 403 }
      )
    }

    // Validate: trips must be posted at least 2 days before departure
    const tripDate = new Date(validatedData.date)
    const today = new Date()
    const daysUntilTrip = Math.ceil((tripDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysUntilTrip < 2) {
      return NextResponse.json(
        { error: 'Bus trips must be posted at least 2 days before departure' },
        { status: 400 }
      )
    }

    const busTrip = await prisma.busTrip.create({
      data: {
        ...validatedData,
        date: tripDate,
        agencyId: userId,
        availableSeats: validatedData.totalSeats,
      },
      include: {
        agency: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
      },
    })

    return NextResponse.json(busTrip, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error creating bus trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

