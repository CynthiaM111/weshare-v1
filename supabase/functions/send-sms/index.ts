/**
 * Supabase Auth Send SMS Hook with send-side limiting, delivery logging,
 * deadline budget (3500ms max, fallback skipped if < 800ms remain),
 * and circuit breaker (Pindo >= 3 fails in last 5 sends -> Africa's Talking first for 5m).
 */
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

import {
  isDevBypassNumber,
  isOtpDevBypassEnabled,
  normalizePhoneE164,
  storeDevOtpDisplay,
} from "../_shared/otp-dev-bypass.ts";
import {
  AfricasTalkingProvider,
  PindoProvider,
  type SendResult,
  type SmsProvider,
} from "../_shared/sms-provider.ts";
import {
  ALLOWED_PREFIXES,
  formatSmsMessage,
  getSmsConfig,
  maskPhone,
  smsLogger,
} from "../_shared/sms-constants.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function resolveProvider(name: string): SmsProvider {
  if (name === "africas_talking" || name === "at") {
    return new AfricasTalkingProvider();
  }
  return new PindoProvider();
}

/**
 * Circuit breaker: if Pindo failed or timed out in at least 3 of the last 5 sends
 * (from sms_send_log), trip circuit and prioritize Africa's Talking for 5 minutes.
 */
export async function isPindoCircuitBreakerTripped(supabase: SupabaseClient): Promise<boolean> {
  try {
    const { data: recent, error } = await supabase
      .from("sms_send_log")
      .select("error_code, send_outcome, created_at")
      .eq("provider", "pindo")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !recent || recent.length === 0) return false;

    // Count send-time outcomes only (error_code SEND_TIMEOUT / PROVIDER_ERROR), never DLR statuses
    const sendFailures = recent.filter(
      (r: { error_code?: string; send_outcome?: string }) =>
        r.error_code === "SEND_TIMEOUT" ||
        r.error_code === "PROVIDER_ERROR" ||
        r.send_outcome === "send_timeout" ||
        r.send_outcome === "provider_error"
    );

    if (sendFailures.length >= 3) {
      const latestFail = sendFailures[0];
      if (latestFail) {
        const ageMs = Date.now() - new Date(latestFail.created_at).getTime();
        if (ageMs < 5 * 60 * 1000) {
          return true;
        }
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function handleSendSms(req: Request): Promise<Response> {
  const hookStart = Date.now();
  const HOOK_DEADLINE_MS = 3500;
  const FALLBACK_THRESHOLD_MS = 800;

  function getRemainingMs(): number {
    return Math.max(0, HOOK_DEADLINE_MS - (Date.now() - hookStart));
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const hookSecretRaw = (Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "").trim();
  if (!hookSecretRaw) {
    smsLogger.error("HOOK_SECRET_MISSING", { message: "SEND_SMS_HOOK_SECRET is not configured" });
    return jsonResponse({ error: "SEND_SMS_HOOK_SECRET is not configured" }, 500);
  }

  const payload = await req.text();
  const cleanSecret = hookSecretRaw.replace(/^v1,/, "");
  const headers = Object.fromEntries(req.headers);

  // 1. Audit & verify standard-webhooks signature
  let hookData: { user?: { phone?: string }; sms?: { otp?: string } };
  try {
    const wh = new Webhook(cleanSecret);
    hookData = wh.verify(payload, headers) as {
      user?: { phone?: string };
      sms?: { otp?: string };
    };
  } catch (err) {
    smsLogger.warn("BAD_WEBHOOK_SIGNATURE", {
      reason: err instanceof Error ? err.message : String(err),
    });
    return jsonResponse({ error: "Invalid webhook signature" }, 401);
  }

  const phone = hookData.user?.phone;
  const otp = hookData.sms?.otp;

  if (!phone || !otp) {
    return jsonResponse({ error: "Missing phone or otp in hook payload" }, 400);
  }

  // 2. Normalize and check allowlisted prefix
  const normalized = normalizePhoneE164(phone);
  const isPrefixAllowed = ALLOWED_PREFIXES.some((prefix) => normalized.startsWith(prefix));

  if (!isPrefixAllowed) {
    smsLogger.warn("REJECTED_PREFIX", { phone: normalized });
    return jsonResponse(
      {
        error: {
          http_code: 400,
          message: "Unsupported phone number prefix",
        },
      },
      400
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // 3. Dev bypass handling
  if (isDevBypassNumber(normalized)) {
    if (isOtpDevBypassEnabled()) {
      await storeDevOtpDisplay(supabase, normalized, otp);
      smsLogger.info("DEV_OTP_STORED", { phone: normalized });
    } else {
      smsLogger.info("DEV_NUMBER_BYPASSED", { phone: normalized });
    }
    return jsonResponse({}, 200);
  }

  // 4. Reserve SMS quota via auth_sms_reserve
  const config = getSmsConfig();
  const { data: reservationId, error: reserveError } = await supabase.rpc(
    "auth_sms_reserve",
    {
      p_phone: normalized,
      p_min_interval_s: config.MIN_INTERVAL_S,
      p_max_per_hour: config.MAX_SENDS_PER_HOUR,
      p_global_cap_24h: config.GLOBAL_CAP_24H,
    }
  );

  if (reserveError) {
    smsLogger.warn("SMS_RATE_LIMITED", {
      phone: normalized,
      reason: reserveError.message,
    });
    return jsonResponse(
      {
        error: {
          http_code: 429,
          message: "Too many requests. Please try again later.",
        },
      },
      429
    );
  }

  // 5. Build OTP message text (brand, code, expiry minutes, do not share)
  const messageText = formatSmsMessage(otp, config.OTP_EXPIRY_S);

  // 6. Check circuit breaker status
  const circuitTripped = await isPindoCircuitBreakerTripped(supabase);

  let primary: SmsProvider;
  let fallback: SmsProvider;

  if (circuitTripped) {
    smsLogger.warn("CIRCUIT_BREAKER_ACTIVE", {
      reason: "Pindo failed in >= 3 of last 5 sends. Trying Africa's Talking first for 5m.",
    });
    primary = resolveProvider("africas_talking");
    fallback = resolveProvider("pindo");
  } else {
    primary = resolveProvider(config.SMS_PRIMARY);
    fallback = resolveProvider(config.SMS_FALLBACK);
  }

  let sendResult: SendResult | null = null;
  let activeProviderName = primary.name;
  let lastErrorDetail = "";

  const primaryBudget = getRemainingMs();
  try {
    // Attempt Primary Provider within remaining deadline budget
    sendResult = await primary.send({
      to: normalized,
      text: messageText,
      sender: config.SMS_SENDER,
      timeoutMs: primaryBudget,
    });
    activeProviderName = primary.name;
  } catch (primaryErr) {
    lastErrorDetail = primaryErr instanceof Error ? primaryErr.message : String(primaryErr);
    smsLogger.warn("PRIMARY_PROVIDER_FAILED", {
      primary: primary.name,
      fallback: fallback.name,
      phone: normalized,
      error: lastErrorDetail,
    });

    // Check remaining deadline budget before attempting fallback
    const fallbackBudget = getRemainingMs();
    if (fallbackBudget < FALLBACK_THRESHOLD_MS) {
      smsLogger.warn("FALLBACK_SKIPPED_DEADLINE", {
        remainingMs: fallbackBudget,
        thresholdMs: FALLBACK_THRESHOLD_MS,
      });
    } else {
      try {
        sendResult = await fallback.send({
          to: normalized,
          text: messageText,
          sender: config.SMS_SENDER,
          timeoutMs: fallbackBudget,
        });
        activeProviderName = fallback.name;
      } catch (fallbackErr) {
        lastErrorDetail = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);
        smsLogger.error("FALLBACK_PROVIDER_FAILED", {
          primary: primary.name,
          fallback: fallback.name,
          phone: normalized,
          error: lastErrorDetail,
        });
      }
    }
  }

  // 7. Update reservation status in sms_send_log
  if (sendResult) {
    await supabase.rpc("auth_sms_mark", {
      p_id: reservationId,
      p_status: "sent",
      p_provider_message_id: sendResult.providerMessageId,
      p_balance: sendResult.remainingBalance ?? null,
      p_error: null,
      p_provider: activeProviderName,
      p_latency_ms: sendResult.latencyMs ?? (Date.now() - hookStart),
      p_send_outcome: "success",
    });

    smsLogger.info("SMS_SENT", {
      phone: normalized,
      provider: activeProviderName,
      messageId: sendResult.providerMessageId,
    });

    return jsonResponse({}, 200);
  }

  // Both primary and fallback failed (or fallback was skipped due to deadline)
  const isTimeout =
    lastErrorDetail.toLowerCase().includes("timed out") ||
    lastErrorDetail.includes("TIMEOUT");
  const failureOutcome = isTimeout ? "send_timeout" : "provider_error";
  const failureErrorCode = isTimeout ? "SEND_TIMEOUT" : "PROVIDER_ERROR";

  await supabase.rpc("auth_sms_mark", {
    p_id: reservationId,
    p_status: "failed",
    p_provider_message_id: null,
    p_balance: null,
    p_error: failureErrorCode,
    p_provider: activeProviderName,
    p_latency_ms: Date.now() - hookStart,
    p_send_outcome: failureOutcome,
  });

  return jsonResponse(
    {
      error: {
        http_code: 502,
        message: "Failed to deliver SMS. Please try again later.",
      },
    },
    502
  );
}

if (import.meta.main) {
  Deno.serve(handleSendSms);
}
