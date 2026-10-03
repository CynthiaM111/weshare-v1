import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyUser } from "./notify.ts";

/** Apply final PawaPay deposit status to payments + bookings (idempotent). */
export async function syncDepositStatus(
  supabase: SupabaseClient,
  depositId: string,
  status: string
): Promise<void> {
  const { data: payment } = await supabase
    .from("payments")
    .select("id, booking_id, ride_id, passenger_id, driver_id, deposit_status")
    .eq("deposit_id", depositId)
    .single();

  if (!payment) return;

  // Payment collected — booking stays pending until the driver confirms.
  if (status === "COMPLETED" && payment.deposit_status !== "completed") {
    await supabase.from("payments").update({ deposit_status: "completed" }).eq("deposit_id", depositId);

    await notifyUser(supabase, {
      userId: payment.driver_id,
      type: "payment_received",
      title: "Paid booking request 💰",
      message: "A passenger paid for their seat. Open the ride to confirm or decline.",
      rideId: payment.ride_id,
      bookingId: payment.booking_id,
    });

    await notifyUser(supabase, {
      userId: payment.passenger_id,
      type: "booking_pending",
      title: "Payment received ✅",
      message: "Your payment was received. Waiting for the driver to confirm your booking.",
      rideId: payment.ride_id,
      bookingId: payment.booking_id,
    });
    return;
  }

  if (status === "FAILED" && payment.deposit_status !== "failed") {
    await supabase.from("payments").update({ deposit_status: "failed" }).eq("deposit_id", depositId);
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", payment.booking_id);

    await notifyUser(supabase, {
      userId: payment.passenger_id,
      type: "payment_failed",
      title: "Payment failed",
      message: "Your payment could not be processed. Please try again.",
      bookingId: payment.booking_id,
    });
  }
}

export function parseDepositCallback(body: Record<string, unknown>): {
  depositId?: string;
  status?: string;
} {
  const data = body.data as Record<string, unknown> | undefined;
  return {
    depositId: (body.depositId as string) ?? (data?.depositId as string),
    status: (data?.status as string) ?? (body.status as string),
  };
}
