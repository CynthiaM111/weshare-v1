import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const verificationSchema = z.object({
  nationalId: z
    .string()
    .trim()
    .min(1, 'National ID is required')
    .regex(/^\d{14,16}$/, 'National ID must be 14–16 digits only'),
  drivingLicenseNumber: z
    .string()
    .trim()
    .min(1, 'Driving license number is required')
    .min(5, 'Driving license must be at least 5 characters')
    .max(20, 'Driving license must be at most 20 characters')
    .regex(
      /^[A-Za-z0-9\-/]+$/,
      'Driving license can only contain letters, numbers, hyphens, and slashes'
    ),
  licensePlate: z
    .string()
    .trim()
    .min(1, 'License plate is required')
    .min(5, 'License plate must be at least 5 characters')
    .max(15, 'License plate must be at most 15 characters')
    .regex(
      /^[A-Za-z0-9\s]+$/,
      'License plate can only contain letters, numbers, and spaces (e.g. RAB 123 A)'
    ),
})

// GET - Check verification status
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await prisma.$queryRaw<Array<{
      driverVerified: boolean
      nationalId: string | null
      drivingLicenseNumber: string | null
      licensePlate: string | null
    }>>`
      SELECT "driverVerified", "nationalId", "drivingLicenseNumber", "licensePlate"
      FROM "User"
      WHERE id = ${userId}
    `

    const user = result[0]
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      driverVerified: user.driverVerified,
      nationalId: user.nationalId,
      drivingLicenseNumber: user.drivingLicenseNumber,
      licensePlate: user.licensePlate,
    })
  } catch (error) {
    console.error('Error fetching verification status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Submit verification
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const data = verificationSchema.parse(body)

    // Use trimmed values for storage
    const trimmedData = {
      nationalId: data.nationalId.trim(),
      drivingLicenseNumber: data.drivingLicenseNumber.trim(),
      licensePlate: data.licensePlate.trim().toUpperCase(),
    }

    // Check user exists
    const existingUser = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "User" WHERE id = ${userId}
    `
    if (!existingUser.length) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user with verification details using raw SQL to avoid Prisma client cache issues
    await prisma.$executeRaw`
      UPDATE "User"
      SET
        "nationalId" = ${trimmedData.nationalId},
        "drivingLicenseNumber" = ${trimmedData.drivingLicenseNumber},
        "licensePlate" = ${trimmedData.licensePlate},
        "driverVerified" = true
      WHERE id = ${userId}
    `

    return NextResponse.json({
      success: true,
      message: 'Driver verification submitted successfully. You can now post trips.',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }
    console.error('Error submitting verification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
