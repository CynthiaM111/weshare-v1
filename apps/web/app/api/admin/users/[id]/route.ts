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

// PATCH - Remove admin privileges (demote ADMIN to PASSENGER)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const check = await requireSuperAdmin(request)
    if ('error' in check) return check.error

    const { id } = await params
    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, name: true },
    })

    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (target.role === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove privileges from a super admin.' },
        { status: 403 }
      )
    }
    if (target.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'User is not an admin.' },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: 'PASSENGER' },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      user: updated,
      message: `Admin privileges removed from ${target.name}. They are now a passenger.`,
    })
  } catch (error) {
    console.error('Demote admin error:', error)
    return NextResponse.json({ error: 'Failed to remove admin privileges' }, { status: 500 })
  }
}
