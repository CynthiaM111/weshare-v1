import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parseDepositCallback, syncDepositStatus } from "../_shared/deposit-sync.ts";
import { syncPayoutStatus } from "../_shared/payout-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  const url = new URL(req.url);
  const path = url.pathname;

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { depositId, status } = parseDepositCallback(body);
    const payoutId = (body.payoutId as string) ?? ((body.data as Record<string, unknown>)?.payoutId as string);
    const refundId = (body.refundId as string) ?? ((body.data as Record<string, unknown>)?.refundId as string);

    const isDepositPath = path.endsWith("/deposit");
    const isPayoutPath = path.endsWith("/payout");
    const isRefundPath = path.endsWith("/refund");

    if (depositId && (isDepositPath || (!isPayoutPath && !isRefundPath && !payoutId))) {
      if (status === "IN_RECONCILIATION") {
        return new Response("ok", { status: 200, headers: corsHeaders });
      }

      if (status === "COMPLETED" || status === "FAILED") {
        await syncDepositStatus(supabase, depositId, status);
      }
    }

    if (payoutId && (isPayoutPath || path.includes("payout"))) {
      const payoutStatus = (body.data as Record<string, unknown>)?.status ?? body.status;

      if (payoutStatus === "COMPLETED" || payoutStatus === "FAILED") {
        await syncPayoutStatus(supabase, payoutId, payoutStatus as string);
      }
    }

    if (refundId && (isRefundPath || path.includes("refund"))) {
      const refundStatus = (body.data as Record<string, unknown>)?.status ?? body.status;

      const { data: payment } = await supabase
        .from("payments")
        .select("id, passenger_id, gross_amount")
        .eq("deposit_id", refundId)
        .single();

      if (!payment) return new Response("ok", { status: 200, headers: corsHeaders });

      if (refundStatus === "COMPLETED") {
        await supabase.from("payments").update({ escrow_status: "refunded" }).eq("deposit_id", refundId);

        await supabase.rpc("insert_notification", {
          p_user_id: payment.passenger_id,
          p_type: "refund_sent",
          p_title: "Refund sent 💸",
          p_message: `Your refund of RWF ${payment.gross_amount.toLocaleString()} has been sent to your mobile money`,
          p_ride_id: null,
          p_booking_id: null,
        });
      }
    }

    return new Response("ok", { status: 200, headers: corsHeaders });
  } catch {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }
});
