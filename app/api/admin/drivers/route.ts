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

// GET - List all drivers with optional search (name, phone)
export async function GET(request: NextRequest) {
  try {
    const check = await requireSuperAdmin(request)
    if ('error' in check) return check.error

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.trim() || ''

    const where = q
      ? {
          role: 'DRIVER' as const,
          OR: [
            { name: { contains: q, mode: 'insensitive' as const } },
            { phone: { contains: q, mode: 'insensitive' as const } },
          ],
        }
      : { role: 'DRIVER' as const }

    const drivers = await prisma.user.findMany({
      where,
      select: {
        id: true,
        phone: true,
        name: true,
        driverVerified: true,
        licensePlate: true,
        createdAt: true,
        _count: {
          select: { tripsAsDriver: true, verificationSubmissions: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(drivers)
  } catch (error) {
    console.error('List drivers error:', error)
    return NextResponse.json({ error: 'Failed to list drivers' }, { status: 500 })
  }
}
