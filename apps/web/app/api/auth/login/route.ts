import { NextRequest, NextResponse } from 'next/server'
import { getUserByPhone, validateRwandanPhone, normalizePhoneNumber } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const loginSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phone } = loginSchema.parse(body)

    const normalizedPhone = normalizePhoneNumber(phone)

    if (!validateRwandanPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid Rwandan phone number' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await getUserByPhone(normalizedPhone)

    if (!user) {
      return NextResponse.json(
        { error: 'Account not found. Please sign up first.' },
        { status: 404 }
      )
    }

    // Auto-verify Rwandan numbers
    if (!user.phoneVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      })
    }

    // Fetch verification status (raw SQL for driverVerified to avoid caching)
    const driverRows = await prisma.$queryRaw<{ driverVerified: boolean }[]>`
      SELECT "driverVerified" FROM "User" WHERE id = ${user.id}
    `
    let isVerified = !!driverRows[0]?.driverVerified
    if (user.role === 'DRIVER') {
      const latest = await prisma.driverVerificationSubmission.findFirst({
        where: { userId: user.id },
        orderBy: { version: 'desc' },
        select: { status: true },
      })
      isVerified = isVerified || latest?.status === 'APPROVED'
    } else if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      isVerified = true
    }

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        phoneVerified: true,
        profileImageUrl: user.profileImageUrl ?? null,
        isVerified: !!isVerified,
      },
      message: 'In the future, an OTP will be sent to this phone number for verification',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

