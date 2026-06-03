import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { parsePawapayEntityStatus } from "../_shared/pawapay-parse.ts";
import { syncPayoutStatus } from "../_shared/payout-sync.ts";

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

    let PAWAPAY_TOKEN = (Deno.env.get("PAWAPAY_API_TOKEN") ?? "").trim();
    if (PAWAPAY_TOKEN.toLowerCase().startsWith("bearer ")) {
      PAWAPAY_TOKEN = PAWAPAY_TOKEN.slice(7).trim();
    }
    const PAWAPAY_URL = (Deno.env.get("PAWAPAY_BASE_URL") ?? "").trim().replace(/\/$/, "");

    const res = await fetch(`${PAWAPAY_URL}/v2/payouts/${payoutId}`, {
      headers: {
        Authorization: `Bearer ${PAWAPAY_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();
    const payoutStatus = parsePawapayEntityStatus(data as Record<string, unknown>);

    if (payoutStatus === "COMPLETED" || payoutStatus === "FAILED") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await syncPayoutStatus(supabase, payoutId, payoutStatus);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: payment } = await supabase
      .from("payments")
      .select("escrow_status, payout_status")
      .eq("payout_id", payoutId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        status: payoutStatus,
        escrowStatus: payment?.escrow_status ?? null,
        payoutStatusDb: payment?.payout_status ?? null,
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
