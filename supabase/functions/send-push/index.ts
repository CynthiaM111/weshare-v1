import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function handleSendPush(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedSecret =
      Deno.env.get("SEND_PUSH_SECRET") ||
      Deno.env.get("WEBHOOK_SECRET") ||
      "weshare-push-secret-local";

    const providedSecret = req.headers.get("x-webhook-secret") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerSecret = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    const clientSecret = providedSecret || bearerSecret;

    if (!constantTimeEqual(clientSecret, expectedSecret)) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const record = body.record || body;

    const notificationId = record.id || record.notificationId || body.notificationId;
    const userId = record.user_id || record.userId || body.userId;
    const type = record.type || body.data?.type || "system";
    const title = typeof record.title === "string" ? record.title.trim() : "";
    const message = typeof record.message === "string" ? record.message.trim() : "";
    const rideId = record.ride_id || record.rideId || body.data?.rideId;
    const bookingId = record.booking_id || record.bookingId || body.data?.bookingId;

    if (!userId || !title || !message) {
      return new Response(
        JSON.stringify({ error: "userId, title, and message are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Determine deep-link route based on notification metadata
    let route = body.route || body.data?.route;
    if (!route) {
      if (type === "new_booking" || type === "ride_started" || type === "ride_completed") {
        route = rideId ? `/(tabs)/rides/${rideId}` : "/(tabs)/my-rides";
      } else if (type?.startsWith("booking_") || type?.startsWith("payment_")) {
        route = "/(tabs)/my-bookings";
      } else {
        route = "/(tabs)/notifications";
      }
    }

    // Scrubbed push data payload: ONLY notificationId, route, type (NO payment or PII details)
    const pushData = {
      notificationId: notificationId || null,
      route,
      type,
    };

    const { data: tokens, error: tokenError } = await supabase
      .from("push_tokens")
      .select("token")
      .eq("user_id", userId);

    if (tokenError) {
      throw new Error(`Failed to query push tokens: ${tokenError.message}`);
    }

    const to = (tokens ?? []).map((row: any) => row.token).filter(Boolean);

    if (to.length === 0) {
      // Mark as processed so sweep does not retry endlessly
      if (notificationId) {
        await supabase
          .from("notifications")
          .update({
            push_sent_at: new Date().toISOString(),
            push_attempts: ((record.push_attempts ?? 0) as number) + 1,
          })
          .eq("id", notificationId);
      }

      return new Response(JSON.stringify({ sent: 0, reason: "No push tokens" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GENERIC_PUSH_COPY: Record<string, { title: string; body: string }> = {
      booking_pending: {
        title: "Booking Requested",
        body: "Your booking request is pending confirmation.",
      },
      new_booking: {
        title: "New Booking Request",
        body: "A passenger has requested to book your ride.",
      },
      booking_confirmed: {
        title: "Booking Confirmed",
        body: "Your seat has been confirmed.",
      },
      booking_cancelled: {
        title: "Booking Cancelled",
        body: "A booking update has occurred.",
      },
      ride_started: {
        title: "Ride Started",
        body: "Your ride is now on its way.",
      },
      ride_completed: {
        title: "Ride Completed",
        body: "Your ride has arrived at its destination.",
      },
      ride_cancelled: {
        title: "Ride Cancelled",
        body: "A ride you booked has been cancelled.",
      },
      payment_received: {
        title: "Payment Update",
        body: "A payment update is available for your ride.",
      },
      refund_sent: {
        title: "Refund Processed",
        body: "Your refund has been processed.",
      },
    };

    const visibleCopy = GENERIC_PUSH_COPY[type] || {
      title: "WeShare Notification",
      body: "You have a new update in WeShare.",
    };

    const messages = to.map((token: string) => ({
      to: token,
      title: visibleCopy.title,
      body: visibleCopy.body,
      sound: "default",
      priority: "high",
      channelId: "rides",
      data: pushData,
    }));

    const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(messages),
    });

    if (!pushRes.ok) {
      const text = await pushRes.text();
      if (notificationId) {
        await supabase
          .from("notifications")
          .update({
            push_attempts: ((record.push_attempts ?? 0) as number) + 1,
          })
          .eq("id", notificationId);
      }
      throw new Error(`Expo push failed: ${pushRes.status} ${text}`);
    }

    const pushResult = await pushRes.json().catch(() => null);

    // Prune invalid tokens (DeviceNotRegistered)
    if (pushResult && Array.isArray(pushResult.data)) {
      const unregisteredTokens: string[] = [];
      pushResult.data.forEach((ticket: any, index: number) => {
        if (
          ticket.status === "error" &&
          ticket.details?.error === "DeviceNotRegistered" &&
          to[index]
        ) {
          unregisteredTokens.push(to[index]);
        }
      });

      if (unregisteredTokens.length > 0) {
        await supabase.from("push_tokens").delete().in("token", unregisteredTokens);
      }
    }

    // Mark notification as push delivered
    if (notificationId) {
      await supabase
        .from("notifications")
        .update({
          push_sent_at: new Date().toISOString(),
          push_attempts: ((record.push_attempts ?? 0) as number) + 1,
        })
        .eq("id", notificationId);
    }

    return new Response(JSON.stringify({ sent: to.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Push delivery failed";
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

if (import.meta.main) {
  serve(handleSendPush);
}
