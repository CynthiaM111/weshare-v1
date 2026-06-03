import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    await supabase.rpc("insert_notification", {
      p_user_id: payment.driver_id,
      p_type: "payment_received",
      p_title: "Paid booking request 💰",
      p_message: "A passenger paid for their seat. Open the ride to confirm or decline.",
      p_ride_id: payment.ride_id,
      p_booking_id: payment.booking_id,
    });

    await supabase.rpc("insert_notification", {
      p_user_id: payment.passenger_id,
      p_type: "booking_pending",
      p_title: "Payment received ✅",
      p_message: "Your payment was received. Waiting for the driver to confirm your booking.",
      p_ride_id: payment.ride_id,
      p_booking_id: payment.booking_id,
    });
    return;
  }

  if (status === "FAILED" && payment.deposit_status !== "failed") {
    await supabase.from("payments").update({ deposit_status: "failed" }).eq("deposit_id", depositId);
    await supabase.from("bookings").update({ status: "cancelled" }).eq("id", payment.booking_id);

    await supabase.rpc("insert_notification", {
      p_user_id: payment.passenger_id,
      p_type: "payment_failed",
      p_title: "Payment failed",
      p_message: "Your payment could not be processed. Please try again.",
      p_ride_id: null,
      p_booking_id: payment.booking_id,
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
