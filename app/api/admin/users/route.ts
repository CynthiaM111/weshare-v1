import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { normalizePhoneNumber, validateRwandanPhone } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const createAdminSchema = z.object({
  phone: z.string().min(1, 'Phone is required'),
  name: z.string().min(1, 'Name is required').max(100),
})

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

// GET - List all admins (ADMIN and SUPER_ADMIN)
export async function GET(request: NextRequest) {
  try {
    const check = await requireSuperAdmin(request)
    if ('error' in check) return check.error

    const admins = await prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      select: {
        id: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(admins)
  } catch (error) {
    console.error('List admins error:', error)
    return NextResponse.json({ error: 'Failed to list admins' }, { status: 500 })
  }
}

// POST - Create new admin (no signup needed - they login directly)
export async function POST(request: NextRequest) {
  try {
    const check = await requireSuperAdmin(request)
    if ('error' in check) return check.error

    const body = await request.json()
    const { phone, name } = createAdminSchema.parse(body)

    const normalizedPhone = normalizePhoneNumber(phone)
    if (!validateRwandanPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid Rwandan phone number. Use format +250XXXXXXXXX or 078XXXXXXXX' },
        { status: 400 }
      )
    }

    const existing = await prisma.user.findUnique({
      where: { phone: normalizedPhone },
    })
    if (existing) {
      if (existing.role === 'ADMIN' || existing.role === 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'This phone is already an admin.' },
          { status: 400 }
        )
      }
      // Update existing user to admin
      const updated = await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN' },
      })
      return NextResponse.json({
        user: {
          id: updated.id,
          phone: updated.phone,
          name: updated.name,
          role: updated.role,
          createdAt: updated.createdAt,
        },
        message: 'Existing user promoted to admin. They can now log in with this phone.',
      })
    }

    const admin = await prisma.user.create({
      data: {
        phone: normalizedPhone,
        name: name.trim(),
        role: 'ADMIN',
        phoneVerified: true,
      },
    })

    return NextResponse.json({
      user: {
        id: admin.id,
        phone: admin.phone,
        name: admin.name,
        role: admin.role,
        createdAt: admin.createdAt,
      },
      message: 'Admin created. They can log in at /login with this phone number — no signup required.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors.map((e) => e.message).join(', ') },
        { status: 400 }
      )
    }
    console.error('Create admin error:', error)
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
  }
}
