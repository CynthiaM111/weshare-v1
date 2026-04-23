import { NextRequest, NextResponse } from 'next/server'

/**
 * Payment process (e.g. MoMo) - DISABLED.
 * Users pay the driver directly. See My Bookings for driver contact and amount.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        'Online payment is disabled. Pay the driver directly: in My Bookings you will see the driver’s name, phone number, and the amount to hand or send via mobile money.',
    },
    { status: 503 }
  )
}

/* COMMENTED OUT - original process flow:
import { prisma } from '@/lib/prisma'
import { processMobileMoneyPayment, PaymentMethod } from '@/lib/mobile-money'
import { z } from 'zod'
...
const payment = await prisma.payment.create({ ... })
return NextResponse.json(payment, { status: 201 })
*/
