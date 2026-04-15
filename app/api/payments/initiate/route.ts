import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

const initiateSchema = z.object({
  bookingId: z.string().min(1),
})

/**
 * Payment initiation - DISABLED.
 * Users pay the driver directly (hand or send to driver's MoMo).
 * See My Bookings for driver name, phone, and amount.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    initiateSchema.parse(body)
    const userId = request.headers.get('x-user-id')
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error:
          'Online payment is disabled. Pay the driver directly: go to My Bookings to see the driver’s name, phone number, and amount to send via mobile money.',
      },
      { status: 503 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to initiate payment' }, { status: 500 })
  }
}
