import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncDepositStatus } from "../_shared/deposit-sync.ts";
import { parsePawapayEntityStatus } from "../_shared/pawapay-parse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { depositId } = await req.json();

    let PAWAPAY_TOKEN = (Deno.env.get("PAWAPAY_API_TOKEN") ?? "").trim();
    if (PAWAPAY_TOKEN.toLowerCase().startsWith("bearer ")) {
      PAWAPAY_TOKEN = PAWAPAY_TOKEN.slice(7).trim();
    }
    const PAWAPAY_URL = (Deno.env.get("PAWAPAY_BASE_URL") ?? "").trim().replace(/\/$/, "");

    const res = await fetch(`${PAWAPAY_URL}/v2/deposits/${depositId}`, {
      headers: {
        "Authorization": `Bearer ${PAWAPAY_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    const depositStatus = parsePawapayEntityStatus(data as Record<string, unknown>);

    if (depositStatus === "COMPLETED" || depositStatus === "FAILED") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await syncDepositStatus(supabase, depositId, depositStatus);
    }

    return new Response(
      JSON.stringify({ status: depositStatus, raw: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
