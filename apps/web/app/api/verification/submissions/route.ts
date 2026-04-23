import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const personalInfoSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  dateOfBirth: z.string(),
  nationalIdNumber: z.string().regex(/^\d{14,16}$/),
})

const vehicleInfoSchema = z.object({
  plateNumber: z.string().min(5),
  vehicleMake: z.string().min(2),
  vehicleModel: z.string().min(2),
  vehicleColor: z.string().min(2),
  vehicleSeats: z.number().int().min(1).max(20),
})

const expirySchema = z.object({
  licenseExpiry: z.string().optional(),
  insuranceExpiry: z.string().optional(),
})

// POST - Create new draft or submit
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, submissionId, ...data } = body

    if (action === 'create_draft') {
      // Verify user exists (fixes foreign key error if session is stale)
      const user = await prisma.user.findUnique({
        where: { id: userId },
      })
      if (!user) {
        return NextResponse.json(
          { error: 'User not found. Please log out and sign in again.' },
          { status: 404 }
        )
      }

      // Create new draft submission (new version if resubmitting)
      const latest = await prisma.driverVerificationSubmission.findFirst({
        where: { userId },
        orderBy: { version: 'desc' },
      })
      const version = latest ? latest.version + 1 : 1

      const submission = await prisma.driverVerificationSubmission.create({
        data: {
          userId,
          version,
          status: 'DRAFT',
        },
      })
      return NextResponse.json(submission)
    }

    if (action === 'save_step') {
      const subId = submissionId || body.submissionId
      if (!subId) {
        return NextResponse.json({ error: 'submissionId required' }, { status: 400 })
      }

      const submission = await prisma.driverVerificationSubmission.findFirst({
        where: { id: subId, userId },
      })
      if (!submission || submission.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
      }

      const step = body.step
      let updateData: Record<string, unknown> = {}

      if (step === 'personal') {
        const parsed = personalInfoSchema.parse(data)
        updateData = {
          fullName: parsed.fullName,
          phone: parsed.phone,
          dateOfBirth: new Date(parsed.dateOfBirth),
          nationalIdNumber: parsed.nationalIdNumber,
        }
      } else if (step === 'vehicle') {
        const parsed = vehicleInfoSchema.parse(data)
        updateData = {
          plateNumber: parsed.plateNumber,
          vehicleMake: parsed.vehicleMake,
          vehicleModel: parsed.vehicleModel,
          vehicleColor: parsed.vehicleColor,
          vehicleSeats: parsed.vehicleSeats,
        }
      } else if (step === 'expiry') {
        const parsed = expirySchema.parse(data)
        updateData = {
          licenseExpiry: parsed.licenseExpiry ? new Date(parsed.licenseExpiry) : null,
          insuranceExpiry: parsed.insuranceExpiry ? new Date(parsed.insuranceExpiry) : null,
        }
      }

      const updated = await prisma.driverVerificationSubmission.update({
        where: { id: subId },
        data: updateData,
      })
      return NextResponse.json(updated)
    }

    if (action === 'submit') {
      const subId = submissionId || body.submissionId
      if (!subId) {
        return NextResponse.json({ error: 'submissionId required' }, { status: 400 })
      }

      const submission = await prisma.driverVerificationSubmission.findFirst({
        where: { id: subId, userId },
      })
      if (!submission || submission.status !== 'DRAFT') {
        return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
      }

      // Validate all required fields and documents
      const required = [
        'fullName', 'phone', 'dateOfBirth', 'nationalIdNumber',
        'nationalIdFront', 'nationalIdBack', 'licenseFront', 'licenseBack',
        'plateNumber', 'vehicleMake', 'vehicleModel', 'vehicleColor', 'vehicleSeats',
        'yellowCardPath', 'insurancePath', 'vehiclePhotoFront', 'vehiclePhotoRear',
      ]
      const missing = required.filter((f) => {
        const val = (submission as any)[f]
        return val === null || val === undefined || val === ''
      })
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Missing required fields: ${missing.join(', ')}` },
          { status: 400 }
        )
      }

      const [updated] = await prisma.$transaction([
        prisma.driverVerificationSubmission.update({
          where: { id: subId },
          data: {
            status: 'SUBMITTED',
            submittedAt: new Date(),
          },
        }),
        prisma.verificationAuditLog.create({
          data: {
            submissionId: subId,
            adminId: userId, // driver self-submit
            action: 'SUBMITTED',
          },
        }),
      ])
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Verification submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Get current user's submission(s)
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const status = searchParams.get('status')

    if (id) {
      const submission = await prisma.driverVerificationSubmission.findFirst({
        where: { id, userId },
        include: { audits: { orderBy: { createdAt: 'desc' } } },
      })
      if (!submission) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(submission)
    }

    const where: any = { userId }
    if (status) where.status = status

    const submissions = await prisma.driverVerificationSubmission.findMany({
      where,
      orderBy: { version: 'desc' },
    })
    return NextResponse.json(submissions)
  } catch (error) {
    console.error('Verification fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
