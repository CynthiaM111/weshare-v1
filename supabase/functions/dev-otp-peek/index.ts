/**
 * Returns the current dev-bypass OTP for a phone (internal testing only).
 * Gated by OTP_DEV_BYPASS=true in Edge secrets — disabled in production launch.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  isOtpDevBypassEnabled,
  normalizePhoneE164,
} from "../_shared/otp-dev-bypass.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isOtpDevBypassEnabled()) {
    return new Response(JSON.stringify({ error: "Dev OTP bypass is disabled" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let phone = "";
  try {
    const body = await req.json();
    phone = normalizePhoneE164(String(body?.phone ?? ""));
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!phone) {
    return new Response(JSON.stringify({ error: "phone is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("dev_otp_display")
    .select("otp, expires_at")
    .eq("phone", phone)
    .maybeSingle();

  if (error) {
    console.error("[dev-otp-peek] query error:", error.message);
    return new Response(JSON.stringify({ error: "Could not load code" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!data?.otp) {
    return new Response(JSON.stringify({ otp: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return new Response(JSON.stringify({ otp: null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ otp: data.otp }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
