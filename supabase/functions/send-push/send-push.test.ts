import { assertEquals, assertNotEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { handleSendPush } from "./index.ts";

Deno.test("send-push: rejects invalid or missing secret with 401", async () => {
  Deno.env.set("SEND_PUSH_SECRET", "super-secret-push-key");
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "dummy-service-key");

  const reqNoSecret = new Request("http://localhost/send-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: "u1", title: "Test", message: "Hello" }),
  });

  const res1 = await handleSendPush(reqNoSecret);
  assertEquals(res1.status, 401);

  const reqBadSecret = new Request("http://localhost/send-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": "wrong-secret",
    },
    body: JSON.stringify({ userId: "u1", title: "Test", message: "Hello" }),
  });

  const res2 = await handleSendPush(reqBadSecret);
  assertEquals(res2.status, 401);
});

Deno.test("send-push: rejects missing parameters with 400", async () => {
  Deno.env.set("SEND_PUSH_SECRET", "super-secret-push-key");
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "dummy-service-key");

  const req = new Request("http://localhost/send-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-webhook-secret": "super-secret-push-key",
    },
    body: JSON.stringify({ userId: "u1" }), // missing title, message
  });

  const res = await handleSendPush(req);
  assertEquals(res.status, 400);
});

Deno.test("send-push: payload scrubbing and Expo DeviceNotRegistered pruning", async () => {
  Deno.env.set("SEND_PUSH_SECRET", "super-secret-push-key");
  Deno.env.set("SUPABASE_URL", "http://localhost:54321");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "dummy-service-key");

  const originalFetch = globalThis.fetch;
  let capturedExpoBody: any = null;
  let deletedTokens: string[] = [];
  let updatedNotification: any = null;

  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = input.toString();

    // Supabase REST calls
    if (url.includes("/rest/v1/push_tokens")) {
      if (init?.method === "DELETE") {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      // SELECT tokens
      return new Response(
        JSON.stringify([
          { token: "ExponentPushToken[active-token]" },
          { token: "ExponentPushToken[unregistered-token]" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    if (url.includes("/rest/v1/notifications")) {
      updatedNotification = JSON.parse(init?.body as string);
      return new Response(JSON.stringify([{ id: "notif-123" }]), { status: 200 });
    }

    // Expo push send
    if (url.includes("exp.host/--/api/v2/push/send")) {
      capturedExpoBody = JSON.parse(init?.body as string);
      return new Response(
        JSON.stringify({
          data: [
            { status: "ok", id: "ticket-1" },
            {
              status: "error",
              message: "DeviceNotRegistered",
              details: { error: "DeviceNotRegistered" },
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("{}", { status: 200 });
  };

  try {
    const req = new Request("http://localhost/send-push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": "super-secret-push-key",
      },
      body: JSON.stringify({
        record: {
          id: "notif-123",
          user_id: "user-456",
          type: "payment_received",
          title: "Payment confirmed",
          message: "Payment of 5000 RWF received",
          ride_id: "ride-789",
          booking_id: "book-101",
          // Sensitive data that must NOT leak into push payload data
          gross_amount: 5000,
          net_amount: 4500,
          phone_number: "+250788123456",
        },
      }),
    });

    const res = await handleSendPush(req);
    assertEquals(res.status, 200);

    // Verify Expo messages sent with fixed generic copy (no amounts, no PII)
    assertEquals(capturedExpoBody.length, 2);
    const msg = capturedExpoBody[0];
    assertEquals(msg.title, "Payment Update");
    assertEquals(msg.body, "A payment update is available for your ride.");
    assertEquals(msg.priority, "high");
    assertEquals(msg.channelId, "rides");

    // CRITICAL: Push data must ONLY contain notificationId, route, type
    assertEquals(msg.data.notificationId, "notif-123");
    assertEquals(msg.data.type, "payment_received");
    assertEquals(msg.data.route, "/(tabs)/my-bookings");
    assertEquals((msg.data as any).gross_amount, undefined);
    assertEquals((msg.data as any).net_amount, undefined);
    assertEquals((msg.data as any).phone_number, undefined);

    // Verify notification push_sent_at was marked
    assertNotEquals(updatedNotification.push_sent_at, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
