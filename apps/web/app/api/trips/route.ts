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
              driverVerified: true,
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

    const departCity = searchParams.get('departCity')?.trim()
    const destinationCity = searchParams.get('destinationCity')?.trim()
    const date = searchParams.get('date')?.trim()
    const status = searchParams.get('status') || 'ACTIVE'

    const where: any = {
      status: status as any,
    }

    // Case-insensitive city filtering using contains
    if (departCity) {
      where.departCity = {
        contains: departCity,
        mode: 'insensitive',
      }
    }

    if (destinationCity) {
      where.destinationCity = {
        contains: destinationCity,
        mode: 'insensitive',
      }
    }

    // Date filtering - handle properly
    if (date) {
      try {
        // Parse the date string (format: YYYY-MM-DD)
        const [year, month, day] = date.split('-').map(Number)
        if (year && month && day) {
          const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0))
          const endOfDay = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999))
          
          where.date = {
            gte: startOfDay,
            lte: endOfDay,
          }
        }
      } catch (error) {
        console.error('Error parsing date filter:', error)
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

    // Filter out past trips (trips where date and time have passed)
    const now = new Date()
    const activeTrips = trips.filter((trip) => {
      try {
        const dateStr = trip.date.toISOString().split('T')[0]
        const tripDateTime = new Date(`${dateStr}T${trip.time}:00`)
        return tripDateTime > now
      } catch (error) {
        // If we can't parse the date/time, exclude the trip to be safe
        return false
      }
    })

    // Enrich with driverVerified via raw SQL (avoids Prisma client cache issues)
    const driverIds = [...new Set(activeTrips.map((t) => t.driverId))]
    let driverVerifiedMap: Record<string, boolean> = {}
    if (driverIds.length > 0) {
      try {
        const placeholders = driverIds.map((_, i) => `$${i + 1}`).join(',')
        const result = await prisma.$queryRawUnsafe<Array<{ id: string; driverVerified: boolean }>>(
          `SELECT id, "driverVerified" FROM "User" WHERE id IN (${placeholders})`,
          ...driverIds
        )
        driverVerifiedMap = Object.fromEntries(result.map((r) => [r.id, r.driverVerified]))
      } catch (e) {
        console.error('Error fetching driver verification:', e)
      }
    }

    const enrichedTrips = activeTrips.map((trip) => ({
      ...trip,
      driver: {
        ...trip.driver,
        driverVerified: driverVerifiedMap[trip.driverId] ?? false,
      },
    }))

    return NextResponse.json(enrichedTrips)
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

    // Verify user exists and is driver-verified
    const [userResult, latestSubmission] = await Promise.all([
      prisma.$queryRaw<Array<{ driverVerified: boolean }>>`
        SELECT "driverVerified" FROM "User" WHERE id = ${userId}
      `,
      prisma.driverVerificationSubmission.findFirst({
        where: { userId },
        orderBy: { version: 'desc' },
        select: { status: true },
      }),
    ])
    const user = userResult[0]
    const isNewApproved = latestSubmission?.status === 'APPROVED'
    const isLegacyApproved = user?.driverVerified ?? false
    const isVerified = isNewApproved || isLegacyApproved

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!isVerified) {
      return NextResponse.json(
        {
          error: 'Driver verification required. Please complete verification before posting trips.',
          code: 'VERIFICATION_REQUIRED',
        },
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

