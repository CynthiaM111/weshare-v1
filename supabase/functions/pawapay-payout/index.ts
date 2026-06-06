import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncDepositStatus } from "../_shared/deposit-sync.ts";
import { getPawapayConfig } from "../_shared/pawapay-config.ts";
import { parsePawapayEntityStatus } from "../_shared/pawapay-parse.ts";
import { syncPayoutStatus } from "../_shared/payout-sync.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeRwandaPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("250")) return digits;
  if (digits.length === 9) return `250${digits}`;
  return digits;
}

function detectNetworkRwanda(phone: string): string {
  const local = phone.replace(/\D/g, "").replace(/^250/, "").slice(0, 3);
  if (local === "078" || local === "079") return "MTN_MOMO_RWA";
  if (local === "073" || local === "072") return "AIRTEL_RWA";
  return "MTN_MOMO_RWA";
}

function formatPayoutAmount(value: number): string {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Payout amount must be greater than zero");
  return String(n);
}

async function refreshPayoutFromPawaPay(
  supabase: ReturnType<typeof createClient>,
  payoutId: string,
  pawapayUrl: string,
  token: string
): Promise<string> {
  const res = await fetch(`${pawapayUrl}/v2/payouts/${payoutId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const text = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  const status = parsePawapayEntityStatus(data);
  if (status === "COMPLETED" || status === "FAILED") {
    await syncPayoutStatus(supabase, payoutId, status);
  }
  return status;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { paymentId, driverPhone, netAmount } = await req.json();

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: "paymentId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { baseUrl: PAWAPAY_URL, token: PAWAPAY_TOKEN } = getPawapayConfig();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("id, deposit_id, net_amount, driver_phone, deposit_status, payout_id, escrow_status")
      .eq("id", paymentId)
      .single();

    if (paymentErr || !payment) {
      throw new Error(`Payment not found: ${paymentErr?.message ?? paymentId}`);
    }

    if (payment.payout_id) {
      const status = await refreshPayoutFromPawaPay(supabase, payment.payout_id, PAWAPAY_URL, PAWAPAY_TOKEN);
      const { data: updated } = await supabase
        .from("payments")
        .select("escrow_status, payout_status")
        .eq("id", paymentId)
        .single();
      return new Response(
        JSON.stringify({
          payoutId: payment.payout_id,
          status: status === "COMPLETED" ? "COMPLETED" : "ALREADY_INITIATED",
          escrowStatus: updated?.escrow_status ?? payment.escrow_status,
          payoutStatus: updated?.payout_status ?? null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (payment.deposit_status !== "completed") {
      if (!payment.deposit_id) {
        throw new Error(`Deposit not completed (status: ${payment.deposit_status}, no deposit_id)`);
      }

      const depositRes = await fetch(`${PAWAPAY_URL}/v2/deposits/${payment.deposit_id}`, {
        headers: {
          Authorization: `Bearer ${PAWAPAY_TOKEN}`,
          "Content-Type": "application/json",
        },
      });
      const depositText = await depositRes.text();
      let depositData: Record<string, unknown> = {};
      try {
        depositData = depositText ? JSON.parse(depositText) : {};
      } catch {
        /* ignore */
      }
      const pawapayDepositStatus = parsePawapayEntityStatus(depositData);

      if (pawapayDepositStatus === "COMPLETED") {
        await syncDepositStatus(supabase, payment.deposit_id, "COMPLETED");
        payment.deposit_status = "completed";
      } else if (pawapayDepositStatus === "FAILED") {
        await syncDepositStatus(supabase, payment.deposit_id, "FAILED");
        throw new Error("Passenger deposit failed — cannot pay out driver");
      } else {
        throw new Error(
          `Deposit not completed (db: ${payment.deposit_status}, pawapay: ${pawapayDepositStatus})`
        );
      }
    }

    const phoneRaw = (driverPhone as string) || payment.driver_phone || "";
    const phoneNumber = normalizeRwandaPhone(phoneRaw);
    if (phoneNumber.length < 12) {
      throw new Error("Valid driver payout phone (250 + 9 digits) is required.");
    }

    const provider = detectNetworkRwanda(phoneNumber);
    const amount = formatPayoutAmount(netAmount ?? payment.net_amount ?? 0);
    const payoutId = crypto.randomUUID();

    const requestBody = {
      payoutId,
      amount,
      currency: "RWF",
      recipient: {
        type: "MMO",
        accountDetails: { phoneNumber, provider },
      },
      customerMessage: "WeShare payout",
    };

    const pawapayRes = await fetch(`${PAWAPAY_URL}/v2/payouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAWAPAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await pawapayRes.text();
    let pawapayData: Record<string, unknown> = {};
    try {
      pawapayData = responseText ? JSON.parse(responseText) : {};
    } catch {
      /* ignore */
    }

    const pawapayStatus = pawapayData.status as string | undefined;

    if (pawapayStatus === "REJECTED") {
      const failureMessage =
        (pawapayData.failureReason as { failureMessage?: string } | undefined)?.failureMessage ??
        responseText;
      throw new Error(`PawaPay rejected payout: ${failureMessage}`);
    }

    if (!pawapayRes.ok && pawapayStatus !== "ACCEPTED" && pawapayStatus !== "COMPLETED" && pawapayStatus !== "ENQUEUED") {
      throw new Error(`PawaPay error ${pawapayRes.status}: ${responseText}`);
    }

    const { error: linkErr } = await supabase
      .from("payments")
      .update({
        payout_id: payoutId,
        payout_status: pawapayStatus === "COMPLETED" ? "completed" : "pending",
        driver_phone: phoneNumber,
      })
      .eq("id", paymentId);

    if (linkErr) throw new Error(`Payment record update failed: ${linkErr.message}`);

    if (pawapayStatus === "COMPLETED") {
      await syncPayoutStatus(supabase, payoutId, "COMPLETED");
    } else {
      await refreshPayoutFromPawaPay(supabase, payoutId, PAWAPAY_URL, PAWAPAY_TOKEN);
    }

    const { data: updated } = await supabase
      .from("payments")
      .select("escrow_status, payout_status")
      .eq("id", paymentId)
      .single();

    return new Response(
      JSON.stringify({
        payoutId,
        status: pawapayStatus ?? "ACCEPTED",
        escrowStatus: updated?.escrow_status ?? "holding",
        payoutStatus: updated?.payout_status ?? "pending",
        phoneNumber,
        provider,
        amount,
      }),
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
