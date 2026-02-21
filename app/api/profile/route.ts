import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET current user profile including verification status and profile image
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        phoneVerified: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use raw SQL for profileImageUrl and driverVerified (avoids Prisma client sync issues)
    const extraRows = await prisma.$queryRaw<{ profileImageUrl: string | null; driverVerified: boolean }[]>`
      SELECT "profileImageUrl", "driverVerified" FROM "User" WHERE id = ${userId}
    `
    const profileImageUrl = extraRows[0]?.profileImageUrl ?? null
    const driverVerified = extraRows[0]?.driverVerified ?? false

    // Check verification: driver (legacy + new flow), admin always verified
    let isVerified = !!driverVerified
    if (user.role === 'DRIVER') {
      const latest = await prisma.driverVerificationSubmission.findFirst({
        where: { userId },
        orderBy: { version: 'desc' },
        select: { status: true },
      })
      isVerified = isVerified || latest?.status === 'APPROVED'
    } else if (user.role === 'ADMIN') {
      isVerified = true
    }

    return NextResponse.json({
      ...user,
      profileImageUrl,
      isVerified: !!isVerified,
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
