import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { processMobileMoneyPayment, PaymentMethod } from '@/lib/mobile-money'
import { z } from 'zod'

const paymentSchema = z.object({
  bookingId: z.string().min(1),
  method: z.enum(['MTN_MOBILE_MONEY', 'AIRTEL_MONEY']),
  phone: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = paymentSchema.parse(body)
    const userId = request.headers.get('x-user-id')

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get booking
    const booking = await prisma.booking.findUnique({
      where: { id: validatedData.bookingId },
      include: {
        trip: true,
        passenger: true,
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Verify user owns the booking
    if (booking.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if booking is confirmed
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Only confirmed bookings can be paid' },
        { status: 400 }
      )
    }

    // Check if already paid
    const existingPayment = await prisma.payment.findFirst({
      where: {
        bookingId: validatedData.bookingId,
        status: 'COMPLETED',
      },
    })

    if (existingPayment) {
      return NextResponse.json(
        { error: 'Booking already paid' },
        { status: 400 }
      )
    }

    const amount = booking.trip.price * booking.seats

    // Process payment
    const paymentResult = await processMobileMoneyPayment({
      phone: validatedData.phone,
      amount,
      method: validatedData.method as PaymentMethod,
      reference: `BOOKING-${booking.id}`,
    })

    if (!paymentResult.success) {
      return NextResponse.json(
        { error: paymentResult.message },
        { status: 400 }
      )
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        bookingId: validatedData.bookingId,
        userId,
        amount,
        method: validatedData.method as any,
        status: paymentResult.success ? 'COMPLETED' : 'PENDING',
        transactionId: paymentResult.transactionId,
      },
      include: {
        booking: {
          include: {
            trip: true,
          },
        },
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error('Error processing payment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

