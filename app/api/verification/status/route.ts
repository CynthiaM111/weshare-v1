import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get current user's verification status (for enforcement checks)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, driverVerified: true },
    })

    // Admin users are always verified
    if (user?.role === 'ADMIN') {
      return NextResponse.json({
        status: 'APPROVED',
        isApproved: true,
        submissionId: null,
        rejectionReason: null,
      })
    }

    const latest = await prisma.driverVerificationSubmission.findFirst({
      where: { userId },
      orderBy: { version: 'desc' },
    })

    const isApproved = latest?.status === 'APPROVED'
    const isLegacyApproved = user?.driverVerified ?? false

    return NextResponse.json({
      status: latest?.status ?? null,
      isApproved: isApproved || isLegacyApproved,
      submissionId: latest?.id ?? null,
      rejectionReason: latest?.rejectionReason ?? null,
    })
  } catch (error) {
    console.error('Status fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
