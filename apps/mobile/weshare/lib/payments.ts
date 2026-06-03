import { supabase } from '@/lib/supabase';

export type MobileNetwork = 'MTN_MOMO_RWA' | 'AIRTEL_RWA';

export type PaymentStatus =
  | 'COMPLETED'
  | 'FAILED'
  | 'INITIATED'
  | 'PENDING'
  | 'ACCEPTED'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'REJECTED'
  | 'IN_RECONCILIATION'
  | 'FOUND'
  | 'NOT_FOUND'
  | 'UNKNOWN';

export type Payment = {
  id: string;
  bookingId: string;
  rideId: string;
  passengerId: string;
  driverId: string;
  depositId: string | null;
  payoutId: string | null;
  grossAmount: number;
  serviceFee: number;
  netAmount: number;
  currency: string;
  passengerPhone: string;
  driverPhone: string | null;
  network: string;
  escrowStatus: string;
  depositStatus: string;
  payoutStatus: string;
  gpsVerified: boolean;
  driverEndLat: number | null;
  driverEndLng: number | null;
  distanceKm: number | null;
  refundEligibleAt: string | null;
  releasedAt: string | null;
  createdAt: string;
};

export function rowToPayment(row: any): Payment {
  return {
    id: row.id,
    bookingId: row.booking_id,
    rideId: row.ride_id,
    passengerId: row.passenger_id,
    driverId: row.driver_id,
    depositId: row.deposit_id ?? null,
    payoutId: row.payout_id ?? null,
    grossAmount: row.gross_amount,
    serviceFee: row.service_fee,
    netAmount: row.net_amount,
    currency: row.currency,
    passengerPhone: row.passenger_phone,
    driverPhone: row.driver_phone ?? null,
    network: row.network,
    escrowStatus: row.escrow_status,
    depositStatus: row.deposit_status,
    payoutStatus: row.payout_status,
    gpsVerified: row.gps_verified ?? false,
    driverEndLat: row.driver_end_lat ?? null,
    driverEndLng: row.driver_end_lng ?? null,
    distanceKm: row.distance_km ?? null,
    refundEligibleAt: row.refund_eligible_at ?? null,
    releasedAt: row.released_at ?? null,
    createdAt: row.created_at,
  };
}

/**
 * Detects the mobile-money network from a Rwandan phone number.
 * Strips a +250 or 250 prefix, then inspects the first three digits.
 */
export function detectNetwork(phone: string): MobileNetwork {
  let local = phone.trim();
  if (local.startsWith('+250')) local = local.slice(4);
  else if (local.startsWith('250')) local = local.slice(3);

  const prefix = local.slice(0, 3);
  if (prefix === '078' || prefix === '079') return 'MTN_MOMO_RWA';
  if (prefix === '073' || prefix === '072') return 'AIRTEL_RWA';
  return 'MTN_MOMO_RWA';
}

/** Great-circle distance between two coordinates in kilometers (R = 6371). */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Starts the escrow deposit via the pawapay-deposit Edge Function. */
export async function initiatePayment(
  bookingId: string,
  rideId: string,
  passengerId: string,
  driverId: string,
  grossAmount: number,
  passengerPhone: string,
  network: string
): Promise<{ depositId: string }> {
  const { data, error } = await supabase.functions.invoke('pawapay-deposit', {
    body: {
      bookingId,
      rideId,
      passengerId,
      driverId,
      amount: grossAmount,
      phone: passengerPhone,
      network,
    },
  });
  if (error) throw error;
  return { depositId: (data as { depositId: string }).depositId };
}

/** Polls the pawapay-check-status Edge Function for a deposit's status. */
export async function checkPaymentStatus(
  depositId: string
): Promise<{ status: PaymentStatus }> {
  const { data, error } = await supabase.functions.invoke('pawapay-check-status', {
    body: { depositId },
  });
  if (error) throw error;
  return { status: (data as { status: PaymentStatus }).status };
}

/** Returns the payment record for a booking, or null if none exists. */
export async function getPaymentForBooking(bookingId: string): Promise<Payment | null> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('booking_id', bookingId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToPayment(data);
}

async function edgeFunctionErrorMessage(
  data: unknown,
  error: { message?: string; context?: { json?: () => Promise<unknown> } } | null
): Promise<string> {
  const body = data as { error?: string } | null;
  if (body?.error) return body.error;
  if (error?.context?.json) {
    try {
      const parsed = (await error.context.json()) as { error?: string };
      if (parsed?.error) return parsed.error;
    } catch {
      /* ignore */
    }
  }
  return error?.message ?? 'Edge function request failed';
}

/** Polls PawaPay and syncs payout + escrow in DB (like deposit check-status). */
export async function checkPayoutStatus(
  payoutId: string
): Promise<{ status: string; escrowStatus: string | null }> {
  const { data, error } = await supabase.functions.invoke('pawapay-check-payout-status', {
    body: { payoutId },
  });
  const body = data as { status?: string; escrowStatus?: string; error?: string } | null;
  if (body?.error) throw new Error(body.error);
  if (error) throw new Error(await edgeFunctionErrorMessage(data, error));
  return {
    status: body?.status ?? 'UNKNOWN',
    escrowStatus: body?.escrowStatus ?? null,
  };
}

export async function getPaymentById(paymentId: string): Promise<Payment | null> {
  const { data, error } = await supabase.from('payments').select('*').eq('id', paymentId).maybeSingle();
  if (error || !data) return null;
  return rowToPayment(data);
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** After payout init, poll until escrow is released or payout fails. */
export async function pollPayoutUntilSettled(
  paymentId: string,
  payoutId: string,
  timeoutMs = 90_000
): Promise<Payment | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const payment = await getPaymentById(paymentId);
    if (payment?.escrowStatus === 'released') return payment;
    if (payment?.payoutStatus === 'failed') {
      throw new Error('Driver payout failed');
    }
    await checkPayoutStatus(payoutId);
    const refreshed = await getPaymentById(paymentId);
    if (refreshed?.escrowStatus === 'released') return refreshed;
    if (refreshed?.payoutStatus === 'failed') throw new Error('Driver payout failed');
    await sleep(5000);
  }
  return getPaymentById(paymentId);
}

/** Releases escrow to the driver via the pawapay-payout Edge Function. */
export async function initiateDriverPayout(
  paymentId: string,
  driverPhone: string,
  network: string,
  netAmount: number
): Promise<{ payoutId: string; escrowStatus: string | null }> {
  const { data, error } = await supabase.functions.invoke('pawapay-payout', {
    body: { paymentId, driverPhone, network, netAmount },
  });
  const body = data as { payoutId?: string; escrowStatus?: string; error?: string } | null;
  if (body?.error) throw new Error(body.error);
  if (error) throw new Error(await edgeFunctionErrorMessage(data, error));
  if (!body?.payoutId) throw new Error('Payout failed — no payout id returned');

  const settled = await pollPayoutUntilSettled(paymentId, body.payoutId);
  return { payoutId: body.payoutId, escrowStatus: settled?.escrowStatus ?? body.escrowStatus ?? null };
}

/**
 * Verifies the driver ended the ride near the destination, then either releases
 * the escrow payout (within 5 km) or flags the payment as disputed.
 */
export async function verifyGpsAndPayout(
  rideId: string,
  paymentId: string,
  driverEndLat: number,
  driverEndLng: number,
  driverPhone: string,
  network: string
): Promise<{ verified: boolean; distanceKm: number }> {
  const { data: ride, error: rideError } = await supabase
    .from('rides')
    .select('to_lat, to_lng')
    .eq('id', rideId)
    .single();

  if (rideError || !ride) throw rideError ?? new Error('Ride not found');

  const distanceKm = haversineDistance(
    driverEndLat,
    driverEndLng,
    ride.to_lat,
    ride.to_lng
  );

  await supabase
    .from('payments')
    .update({
      driver_end_lat: driverEndLat,
      driver_end_lng: driverEndLng,
      distance_km: distanceKm,
    })
    .eq('id', paymentId);

  if (distanceKm <= 5.0) {
    await supabase.from('payments').update({ gps_verified: true }).eq('id', paymentId);

    const { data: payment } = await supabase
      .from('payments')
      .select('net_amount, driver_phone, deposit_id, deposit_status')
      .eq('id', paymentId)
      .single();

    if (payment?.deposit_status !== 'completed' && payment?.deposit_id) {
      await checkPaymentStatus(payment.deposit_id);
    }

    const payoutPhone = payment?.driver_phone ?? driverPhone;
    const digits = payoutPhone.replace(/\D/g, '');
    const payoutNetwork = detectNetwork(digits.startsWith('250') ? `+${digits}` : `+250${digits}`);

    await initiateDriverPayout(
      paymentId,
      payoutPhone,
      payoutNetwork,
      payment?.net_amount ?? 0
    );
    return { verified: true, distanceKm };
  }

  await supabase
    .from('payments')
    .update({ escrow_status: 'disputed' })
    .eq('id', paymentId);
  return { verified: false, distanceKm };
}
