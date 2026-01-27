import { NextRequest, NextResponse } from 'next/server'
import { sendBookingConfirmationEmail, sendPaymentReceiptEmail, sendTripReminderEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    switch (type) {
      case 'booking_confirmation':
        await sendBookingConfirmationEmail(
          data.email,
          data.driverName,
          data.tripDetails
        )
        break
      case 'payment_receipt':
        await sendPaymentReceiptEmail(
          data.email,
          data.amount,
          data.transactionId
        )
        break
      case 'trip_reminder':
        await sendTripReminderEmail(
          data.email,
          data.tripDetails
        )
        break
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending notification:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

