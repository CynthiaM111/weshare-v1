// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { syncDepositStatus } from "../_shared/deposit-sync.ts";
import { computePaymentAmounts } from "../_shared/payment-fees.ts";
import { getPawapayConfig } from "../_shared/pawapay-config.ts";
import { shouldMockMoMoPayment } from "../_shared/internal-test-phones.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let bookingId, rideId, passengerId, driverId, amount, phone, network;
  try {
    const bodyText = await req.text();
    const body = JSON.parse(bodyText);
    bookingId = body.bookingId;
    rideId = body.rideId;
    passengerId = body.passengerId;
    driverId = body.driverId;
    amount = body.amount;
    phone = body.phone;
    network = body.network;
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { baseUrl: PAWAPAY_URL, token: PAWAPAY_TOKEN } = getPawapayConfig();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const depositId = crypto.randomUUID();
    // `amount` is the driver's posted ride fare; passenger deposits fare + 5% fee.
    const { netAmount, serviceFee, grossAmount } = computePaymentAmounts(amount);

    const { data: ride } = await supabase
      .from("rides")
      .select("depart_at")
      .eq("id", rideId)
      .single();

    const refundEligibleAt = ride?.depart_at
      ? new Date(new Date(ride.depart_at).getTime() + 3 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, deposit_status")
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (existingPayment?.deposit_status === "completed") {
      throw new Error("This booking is already paid");
    }
    if (existingPayment) {
      const { error: removeErr } = await supabase
        .from("payments")
        .delete()
        .eq("id", existingPayment.id);
      if (removeErr) throw new Error(`Could not reset payment for retry: ${removeErr.message}`);
    }

    const { error: dbError } = await supabase.from("payments").insert({
      booking_id: bookingId,
      ride_id: rideId,
      passenger_id: passengerId,
      driver_id: driverId,
      deposit_id: depositId,
      gross_amount: grossAmount,
      service_fee: serviceFee,
      net_amount: netAmount,
      currency: "RWF",
      passenger_phone: phone,
      network,
      escrow_status: "holding",
      deposit_status: "pending",
      refund_eligible_at: refundEligibleAt,
    });

    if (dbError) throw new Error(`DB error: ${dbError.message}`);

    if (shouldMockMoMoPayment(phone)) {
      await syncDepositStatus(supabase, depositId, "COMPLETED");
      return new Response(
        JSON.stringify({
          depositId,
          status: "COMPLETED",
          grossAmount,
          serviceFee,
          netAmount,
          mocked: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const requestBody = {
      depositId,
      amount: String(grossAmount),
      currency: "RWF",
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: phone.replace('+', ''),
          provider: network,
        },
      },
    };

    const pawapayRes = await fetch(`${PAWAPAY_URL}/v2/deposits`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PAWAPAY_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await pawapayRes.text();

    let pawapayData: Record<string, unknown> = {};
    try {
      pawapayData = responseText ? JSON.parse(responseText) : {};
    } catch {
      // response may be non-JSON on HTTP errors
    }

    const pawapayStatus = pawapayData.status as string | undefined;

    if (pawapayStatus === "REJECTED") {
      const failureMessage =
        (pawapayData.failureReason as { failureMessage?: string } | undefined)?.failureMessage ??
        "Payment rejected";
      await supabase.from("payments").update({ deposit_status: "failed" }).eq("deposit_id", depositId);
      throw new Error(failureMessage);
    }

    if (pawapayStatus === "ACCEPTED") {
      await supabase.from("payments").update({ deposit_status: "accepted" }).eq("deposit_id", depositId);
      return new Response(
        JSON.stringify({ depositId, status: "ACCEPTED", grossAmount, serviceFee, netAmount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pawapayStatus === "COMPLETED") {
      await syncDepositStatus(supabase, depositId, "COMPLETED");
      return new Response(
        JSON.stringify({ depositId, status: "COMPLETED", grossAmount, serviceFee, netAmount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (pawapayStatus === "FAILED") {
      await syncDepositStatus(supabase, depositId, "FAILED");
      throw new Error("Payment failed");
    }

    if (pawapayStatus === "IN_RECONCILIATION" || pawapayStatus === "SUBMITTED") {
      return new Response(
        JSON.stringify({ depositId, status: pawapayStatus, grossAmount, serviceFee, netAmount }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!pawapayRes.ok) {
      throw new Error(`PawaPay error ${pawapayRes.status}: ${responseText}`);
    }

    return new Response(
      JSON.stringify({ depositId, status: pawapayStatus ?? "UNKNOWN", grossAmount, serviceFee, netAmount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
