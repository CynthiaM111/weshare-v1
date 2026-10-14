/**
 * Pindo Delivery Receipt (DLR) Webhook.
 *
 * Pindo POSTs { sms_id, modified_at, retries_count, status }
 * Authenticates via long random secret in the URL query param (?token=...), compared in constant time.
 * Updates are idempotent and monotonic (never downgrades 'delivered').
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

const PINDO_STATUS_MAP: Record<string, string> = {
  ACCEPTED: "accepted",
  DELIVRD: "delivered",
  UNDELIV: "undelivered",
  EXPIRED: "expired",
  REJECTED: "rejected",
  UNKNOWN: "unknown",
};

export async function handlePindoDlr(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = (Deno.env.get("PINDO_DLR_SECRET") ?? "").trim();
  if (!expectedSecret) {
    console.error("[pindo-dlr] PINDO_DLR_SECRET is not configured");
    return jsonResponse({ error: "PINDO_DLR_SECRET is not configured" }, 500);
  }

  // Authenticate secret from URL (?token=...) in constant time
  const url = new URL(req.url);
  const providedToken = url.searchParams.get("token") ?? "";

  if (!providedToken || !constantTimeEqual(providedToken, expectedSecret)) {
    console.warn("[pindo-dlr] Unauthorized webhook invocation (bad secret token)");
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let bodyText = "";
  try {
    bodyText = await req.text();
  } catch {
    return jsonResponse({ error: "Could not read body" }, 400);
  }

  let payload: {
    sms_id?: string | number;
    modified_at?: string;
    retries_count?: number;
    status?: string;
  } = {};

  try {
    payload = bodyText ? JSON.parse(bodyText) : {};
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const smsId = payload.sms_id !== undefined ? String(payload.sms_id) : "";
  const rawStatus = (payload.status ?? "").trim().toUpperCase();

  if (!smsId || !rawStatus) {
    return jsonResponse({ error: "Missing sms_id or status in payload" }, 400);
  }

  const mappedStatus = PINDO_STATUS_MAP[rawStatus] ?? "unknown";

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Look up existing record
  const { data: existing, error: fetchErr } = await supabase
    .from("sms_send_log")
    .select("id, status")
    .eq("provider", "pindo")
    .eq("provider_message_id", smsId)
    .maybeSingle();

  if (fetchErr) {
    console.error("[pindo-dlr] Error fetching sms_send_log:", fetchErr.message);
    return jsonResponse({ error: "Database error" }, 500);
  }

  // Monotonic guarantee: never downgrade a 'delivered' status
  if (existing) {
    if (existing.status === "delivered") {
      console.log(`[pindo-dlr] Keeping existing delivered status for sms_id ${smsId}`);
      return jsonResponse({ ok: true, status: "delivered", ignored: true }, 200);
    }

    const { error: updateErr } = await supabase
      .from("sms_send_log")
      .update({ status: mappedStatus })
      .eq("id", existing.id);

    if (updateErr) {
      console.error("[pindo-dlr] Error updating status:", updateErr.message);
      return jsonResponse({ error: "Database update error" }, 500);
    }

    console.log(
      JSON.stringify({
        event: "PINDO_DLR_UPDATED",
        smsId,
        fromStatus: existing.status,
        toStatus: mappedStatus,
      })
    );
  } else {
    console.warn(`[pindo-dlr] No record found for Pindo sms_id: ${smsId}`);
  }

  return jsonResponse({ ok: true, status: mappedStatus }, 200);
}

if (import.meta.main) {
  Deno.serve(handlePindoDlr);
}

