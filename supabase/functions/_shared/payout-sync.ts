import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

/** Apply final PawaPay payout status to payments (idempotent). */
export async function syncPayoutStatus(
  supabase: SupabaseClient,
  payoutId: string,
  status: string
): Promise<void> {
  const { data: payment } = await supabase
    .from("payments")
    .select("id, driver_id, net_amount, escrow_status, payout_status")
    .eq("payout_id", payoutId)
    .single();

  if (!payment) return;

  if (status === "COMPLETED" && payment.escrow_status !== "released") {
    await supabase
      .from("payments")
      .update({
        payout_status: "completed",
        escrow_status: "released",
        released_at: new Date().toISOString(),
      })
      .eq("payout_id", payoutId);

    await supabase.rpc("insert_notification", {
      p_user_id: payment.driver_id,
      p_type: "payout_received",
      p_title: "Payout received 🎉",
      p_message: `RWF ${payment.net_amount.toLocaleString()} has been sent to your mobile money`,
      p_ride_id: null,
      p_booking_id: null,
    });
    return;
  }

  if (status === "FAILED" && payment.payout_status !== "failed") {
    await supabase
      .from("payments")
      .update({
        payout_status: "failed",
        escrow_status: "disputed",
      })
      .eq("payout_id", payoutId);

    await supabase.rpc("insert_notification", {
      p_user_id: payment.driver_id,
      p_type: "payout_failed",
      p_title: "Payout failed",
      p_message: "Your payout failed. WeShare will retry within 24 hours.",
      p_ride_id: null,
      p_booking_id: null,
    });
  }
}
