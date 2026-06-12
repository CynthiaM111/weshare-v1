import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncDepositStatus } from "../_shared/deposit-sync.ts";
import { getPawapayConfig } from "../_shared/pawapay-config.ts";
import { parsePawapayEntityStatus } from "../_shared/pawapay-parse.ts";
import { shouldMockMoMoPayment } from "../_shared/internal-test-phones.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { depositId } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: payment } = await supabase
      .from("payments")
      .select("passenger_phone, deposit_status")
      .eq("deposit_id", depositId)
      .maybeSingle();

    if (payment && shouldMockMoMoPayment(payment.passenger_phone)) {
      if (payment.deposit_status !== "completed") {
        await syncDepositStatus(supabase, depositId, "COMPLETED");
      }
      return new Response(
        JSON.stringify({ status: "COMPLETED", mocked: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { baseUrl: PAWAPAY_URL, token: PAWAPAY_TOKEN } = getPawapayConfig();

    const res = await fetch(`${PAWAPAY_URL}/v2/deposits/${depositId}`, {
      headers: {
        "Authorization": `Bearer ${PAWAPAY_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    const depositStatus = parsePawapayEntityStatus(data as Record<string, unknown>);

    if (depositStatus === "COMPLETED" || depositStatus === "FAILED") {
      await syncDepositStatus(supabase, depositId, depositStatus);
    }

    return new Response(
      JSON.stringify({ status: depositStatus, raw: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
