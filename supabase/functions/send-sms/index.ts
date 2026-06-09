/**
 * Supabase Auth Send SMS Hook → Africa's Talking (or dev bypass for internal testing).
 * Supabase generates the OTP; this function delivers it via AT or stores it for in-app display.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

import {
  isOtpDevBypassEnabled,
  normalizePhoneE164,
  storeDevOtpDisplay,
} from "../_shared/otp-dev-bypass.ts";

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

function atBaseUrl(username: string): string {
  if (username === "sandbox") {
    return "https://api.sandbox.africastalking.com/version1/messaging";
  }
  return "https://api.africastalking.com/version1/messaging";
}

async function sendViaAfricasTalking(
  phone: string,
  message: string,
  username: string,
  apiKey: string,
  senderId?: string
): Promise<{ ok: boolean; detail: string }> {
  const body = new URLSearchParams({
    username,
    to: normalizePhoneE164(phone),
    message,
  });
  if (senderId?.trim() && username !== "sandbox") {
    body.set("from", senderId.trim());
  }

  const res = await fetch(atBaseUrl(username), {
    method: "POST",
    headers: {
      apiKey,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }

  if (!res.ok) {
    return { ok: false, detail: text || `HTTP ${res.status}` };
  }

  const smsData = data.SMSMessageData as Record<string, unknown> | undefined;
  const recipients = smsData?.Recipients as Array<Record<string, unknown>> | undefined;
  const first = recipients?.[0];
  const status = String(first?.status ?? "").toLowerCase();

  if (status === "success" || status === "sent" || status === "queued" || status === "submitted") {
    return { ok: true, detail: status };
  }

  if (!recipients?.length && res.ok) {
    return { ok: true, detail: "accepted" };
  }

  return {
    ok: false,
    detail: String(first?.statusCode ?? first?.status ?? text),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const hookSecretRaw = (Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "").trim();
  const devBypass = isOtpDevBypassEnabled();
  const atUsername = (Deno.env.get("AT_USERNAME") ?? "").trim();
  const atApiKey = (Deno.env.get("AT_API_KEY") ?? "").trim();
  const atSenderId = (Deno.env.get("AT_SENDER_ID") ?? "WeShare").trim();

  if (!hookSecretRaw) {
    return jsonResponse({ error: "SEND_SMS_HOOK_SECRET is not configured" }, 500);
  }
  if (!devBypass && (!atUsername || !atApiKey)) {
    return jsonResponse({ error: "AT_USERNAME or AT_API_KEY is not configured" }, 500);
  }

  const payload = await req.text();
  const base64Secret = hookSecretRaw.replace(/^v1,whsec_/, "");
  const headers = Object.fromEntries(req.headers);

  try {
    const wh = new Webhook(base64Secret);
    const { user, sms } = wh.verify(payload, headers) as {
      user: { phone: string };
      sms: { otp: string };
    };

    const phone = user?.phone;
    const otp = sms?.otp;
    if (!phone || !otp) {
      return jsonResponse({ error: "Missing phone or otp in hook payload" }, 400);
    }

    const normalized = normalizePhoneE164(phone);
    // Supabase Auth test numbers (+250780000001–006) use fixed OTP 123456 in Dashboard.
    // Hook must succeed without sending SMS.
    if (/^\+25078000000[1-6]$/.test(normalized)) {
      return jsonResponse({}, 200);
    }

    if (devBypass) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await storeDevOtpDisplay(supabase, phone, otp);
      return jsonResponse({}, 200);
    }

    const message = `Your WeShare verification code is ${otp}. It expires in a few minutes.`;
    const result = await sendViaAfricasTalking(
      phone,
      message,
      atUsername,
      atApiKey,
      atSenderId
    );

    if (!result.ok) {
      console.error("[send-sms] Africa's Talking error:", result.detail);
      return jsonResponse(
        {
          error: {
            http_code: 502,
            message: `Failed to send SMS: ${result.detail}`,
          },
        },
        502
      );
    }

    return jsonResponse({}, 200);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[send-sms] hook error:", message);
    return jsonResponse(
      {
        error: {
          http_code: 500,
          message: `Send SMS hook failed: ${message}`,
        },
      },
      500
    );
  }
});
