import { NextRequest, NextResponse } from 'next/server'
import { findOrCreateUser, validateRwandanPhone, normalizePhoneNumber, getUserByPhone } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const signupSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

export async function POST(request: NextRequest) {
  // Debug: Check environment variables
  console.log('DB URL:', process.env.DATABASE_URL ? 'present' : 'missing');
  console.log('NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? 'present' : 'missing');
  
  try {
    const body = await request.json()
    const { phone, name } = signupSchema.parse(body)

    const normalizedPhone = normalizePhoneNumber(phone)

    if (!validateRwandanPhone(normalizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid Rwandan phone number' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await getUserByPhone(normalizedPhone)
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this phone number already exists. Please login instead.' },
        { status: 409 }
      )
    }

    // Create new user
    const user = await findOrCreateUser(normalizedPhone, name)

    // Auto-verify Rwandan numbers
    if (!user.phoneVerified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      })
    }

    return NextResponse.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        phoneVerified: true,
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

    console.error('Signup error:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined },
      { status: 500 }
    )
  }
}
