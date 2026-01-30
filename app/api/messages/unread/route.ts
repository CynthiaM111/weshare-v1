import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all bookings where the user is either the passenger or the driver
    const bookings = await prisma.booking.findMany({
      where: {
        OR: [
          { userId }, // User is the passenger
          {
            trip: {
              driverId: userId, // User is the driver
            },
          },
        ],
        status: 'CONFIRMED', // Only confirmed bookings can have messages
      },
      include: {
        trip: {
          select: {
            driverId: true,
          },
        },
      },
    })

    // Get unread message counts for each booking
    const unreadCounts: Record<string, number> = {}

    for (const booking of bookings) {
      const unreadCount = await prisma.message.count({
        where: {
          bookingId: booking.id,
          receiverId: userId,
          read: false,
        },
      })

      if (unreadCount > 0) {
        unreadCounts[booking.id] = unreadCount
      }
    }

    return NextResponse.json(unreadCounts)
  } catch (error) {
    console.error('Error fetching unread message counts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
