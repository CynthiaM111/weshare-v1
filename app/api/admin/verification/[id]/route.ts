import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

async function requireAdmin(request: NextRequest) {
  const userId = request.headers.get('x-user-id')
  if (!userId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
  })
  if (!user || user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { adminId: userId }
}

const reviewSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'CHANGES_REQUESTED']),
  reason: z.string().min(1).optional(),
})

// GET - Get single submission detail
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const submission = await prisma.driverVerificationSubmission.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        audits: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json(submission)
  } catch (error) {
    console.error('Admin verification detail error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Approve / Reject / Request changes
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireAdmin(request)
    if ('error' in auth) return auth.error

    const body = await request.json()
    const { action, reason } = reviewSchema.parse(body)

    const submission = await prisma.driverVerificationSubmission.findUnique({
      where: { id: params.id },
    })

    if (!submission) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (!['SUBMITTED', 'IN_REVIEW', 'CHANGES_REQUESTED'].includes(submission.status)) {
      return NextResponse.json(
        { error: 'Submission is not in a reviewable state' },
        { status: 400 }
      )
    }

    const statusMap = {
      APPROVE: 'APPROVED' as const,
      REJECT: 'REJECTED' as const,
      CHANGES_REQUESTED: 'CHANGES_REQUESTED' as const,
    }
    const auditActionMap = {
      APPROVE: 'APPROVED' as const,
      REJECT: 'REJECTED' as const,
      CHANGES_REQUESTED: 'CHANGES_REQUESTED' as const,
    }
    const newStatus = statusMap[action]

    if ((action === 'REJECT' || action === 'CHANGES_REQUESTED') && !reason?.trim()) {
      return NextResponse.json(
        { error: 'Reason is required for Reject and Request changes' },
        { status: 400 }
      )
    }

    const [updated, _] = await prisma.$transaction([
      prisma.driverVerificationSubmission.update({
        where: { id: params.id },
        data: {
          status: newStatus,
          reviewedBy: auth.adminId,
          reviewedAt: new Date(),
          rejectionReason: reason || null,
        },
      }),
      prisma.verificationAuditLog.create({
        data: {
          submissionId: params.id,
          adminId: auth.adminId,
          action: auditActionMap[action],
          reason: reason || null,
        },
      }),
    ])

    // If APPROVED, update User.driverVerified for backward compat
    if (action === 'APPROVE') {
      await prisma.user.update({
        where: { id: submission.userId },
        data: {
          driverVerified: true,
          nationalId: submission.nationalIdNumber ?? undefined,
          drivingLicenseNumber: submission.licenseFront ? 'verified' : undefined,
          licensePlate: submission.plateNumber ?? undefined,
        },
      })
    }

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Admin verification review error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
