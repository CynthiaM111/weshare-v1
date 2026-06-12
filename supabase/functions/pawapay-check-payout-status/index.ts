import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPawapayConfig } from "../_shared/pawapay-config.ts";
import { parsePawapayEntityStatus } from "../_shared/pawapay-parse.ts";
import { syncPayoutStatus } from "../_shared/payout-sync.ts";
import { shouldMockMoMoPayment } from "../_shared/internal-test-phones.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { payoutId } = await req.json();
    if (!payoutId) {
      return new Response(
        JSON.stringify({ error: "payoutId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payment } = await supabase
      .from("payments")
      .select("driver_phone, escrow_status, payout_status")
      .eq("payout_id", payoutId)
      .maybeSingle();

    if (payment?.driver_phone && shouldMockMoMoPayment(payment.driver_phone)) {
      if (payment.payout_status !== "completed") {
        await syncPayoutStatus(supabase, payoutId, "COMPLETED");
      }
      const { data: updated } = await supabase
        .from("payments")
        .select("escrow_status, payout_status")
        .eq("payout_id", payoutId)
        .maybeSingle();
      return new Response(
        JSON.stringify({
          status: "COMPLETED",
          escrowStatus: updated?.escrow_status ?? payment.escrow_status,
          payoutStatusDb: updated?.payout_status ?? payment.payout_status,
          mocked: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { baseUrl: PAWAPAY_URL, token: PAWAPAY_TOKEN } = getPawapayConfig();

    const res = await fetch(`${PAWAPAY_URL}/v2/payouts/${payoutId}`, {
      headers: {
        Authorization: `Bearer ${PAWAPAY_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    const payoutStatus = parsePawapayEntityStatus(data as Record<string, unknown>);

    if (payoutStatus === "COMPLETED" || payoutStatus === "FAILED") {
      await syncPayoutStatus(supabase, payoutId, payoutStatus);
    }

    const { data: paymentAfter } = await supabase
      .from("payments")
      .select("escrow_status, payout_status")
      .eq("payout_id", payoutId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        status: payoutStatus,
        escrowStatus: paymentAfter?.escrow_status ?? null,
        payoutStatusDb: paymentAfter?.payout_status ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
