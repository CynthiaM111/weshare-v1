import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user || user.role !== 'SUPER_ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden. Super admin only.' }, { status: 403 }) }
  }
  return { superAdminId: userId }
}

// GET - Dashboard statistics for super admin
export async function GET(request: NextRequest) {
  try {
    const check = await requireSuperAdmin(request)
    if ('error' in check) return check.error

    const [
      driversCount,
      passengersCount,
      agenciesCount,
      adminsCount,
      tripsCount,
      bookingsCount,
      completedBookingsCount,
      paymentsCount,
      totalRevenue,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'DRIVER' } }),
      prisma.user.count({ where: { role: 'PASSENGER' } }),
      prisma.user.count({ where: { role: 'AGENCY' } }),
      prisma.user.count({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } } }),
      prisma.trip.count(),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.count({ where: { status: 'COMPLETED' } }),
      prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ])

    return NextResponse.json({
      drivers: driversCount,
      passengers: passengersCount,
      agencies: agenciesCount,
      admins: adminsCount,
      trips: tripsCount,
      bookings: bookingsCount,
      completedBookings: completedBookingsCount,
      payments: paymentsCount,
      totalRevenue: totalRevenue._sum.amount ?? 0,
    })
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 })
  }
}
