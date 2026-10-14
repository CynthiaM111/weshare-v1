// @ts-nocheck
import { assertEquals, assert, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

Deno.env.set("DENO_TESTING", "true");
Deno.env.set("SUPABASE_URL", "http://localhost:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
Deno.env.set("SEND_SMS_HOOK_SECRET", "whsec_MfKQ9r8GKYqrTwjUpUWDkrGhQqYjwZYi");
Deno.env.set("PINDO_API_TOKEN", "test-pindo-token");
Deno.env.set("AT_USERNAME", "sandbox");
Deno.env.set("AT_API_KEY", "test-at-key");
Deno.env.set("PINDO_DLR_SECRET", "super-secret-dlr-token-123456789");

import { handleSendSms } from "./index.ts";
import { handlePindoDlr } from "../pindo-dlr-webhook/index.ts";

const SECRET = "MfKQ9r8GKYqrTwjUpUWDkrGhQqYjwZYi";
const TEST_OTP = "847291";

const capturedLogs: string[] = [];

// Intercept console to verify OTP is NEVER logged
const origLog = console.log;
const origWarn = console.warn;
const origError = console.error;

console.log = (...args: unknown[]) => {
  capturedLogs.push(args.map(String).join(" "));
  origLog(...args);
};
console.warn = (...args: unknown[]) => {
  capturedLogs.push(args.map(String).join(" "));
  origWarn(...args);
};
console.error = (...args: unknown[]) => {
  capturedLogs.push(args.map(String).join(" "));
  origError(...args);
};

function createSignedRequest(
  body: Record<string, unknown>,
  options?: { badSignature?: boolean; overrideSecret?: string }
): Request {
  const payload = JSON.stringify(body);
  const wh = new Webhook(options?.overrideSecret ?? SECRET);
  const msgId = `msg_${Date.now()}`;
  const timestamp = new Date();
  let signature = wh.sign(msgId, timestamp, payload);

  if (options?.badSignature) {
    signature = "v1,badsignatureinvaliddatabase64==";
  }

  return new Request("http://localhost/functions/v1/send-sms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "webhook-id": msgId,
      "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "webhook-signature": signature,
    },
    body: payload,
  });
}

// Global fetch mock dispatcher
let mockRpcHandler: (name: string, params: Record<string, unknown>) => Promise<Response>;
let mockHttpHandler: (url: string, init?: RequestInit) => Promise<Response>;

const origFetch = globalThis.fetch;

function setupFetchMock() {
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    // Supabase RPC mock
    if (url.includes("/rest/v1/rpc/")) {
      const parts = url.split("/rpc/");
      const rpcName = parts[1].split("?")[0];
      const params = init?.body ? JSON.parse(String(init.body)) : {};
      return mockRpcHandler(rpcName, params);
    }

    return mockHttpHandler(url, init);
  };
}

function restoreFetchMock() {
  globalThis.fetch = origFetch;
}

Deno.test("send-sms: success via Pindo primary provider", async () => {
  setupFetchMock();
  try {
    let reservedCalled = false;
    let markCalled = false;

    mockRpcHandler = async (rpc, params) => {
      if (rpc === "auth_sms_reserve") {
        reservedCalled = true;
        return new Response(JSON.stringify("res-uuid-1234"), { status: 200 });
      }
      if (rpc === "auth_sms_mark") {
        markCalled = true;
        assertEquals(params.p_status, "sent");
        assertEquals(params.p_provider, "pindo");
        return new Response("null", { status: 200 });
      }
      return new Response("null", { status: 200 });
    };

    mockHttpHandler = async (url) => {
      if (url.includes("api.pindo.io")) {
        return new Response(
          JSON.stringify({ sms_id: "pindo-999", remaining_balance: 150.0 }),
          { status: 201 }
        );
      }
      return new Response("not found", { status: 404 });
    };

    const req = createSignedRequest({
      user: { phone: "+250788123456" },
      sms: { otp: TEST_OTP },
    });

    const res = await handleSendSms(req);
    assertEquals(res.status, 200);
    assert(reservedCalled, "auth_sms_reserve should be called");
    assert(markCalled, "auth_sms_mark should be called with sent");
  } finally {
    restoreFetchMock();
  }
});

Deno.test("send-sms: rejects bad signature with 401", async () => {
  const req = createSignedRequest(
    { user: { phone: "+250788123456" }, sms: { otp: TEST_OTP } },
    { badSignature: true }
  );

  const res = await handleSendSms(req);
  assertEquals(res.status, 401);
  const data = await res.json();
  assertEquals(data.error, "Invalid webhook signature");
});

Deno.test("send-sms: rejects disallowed phone prefix with 400", async () => {
  const req = createSignedRequest({
    user: { phone: "+14155552671" }, // US number, disallowed
    sms: { otp: TEST_OTP },
  });

  const res = await handleSendSms(req);
  assertEquals(res.status, 400);
  const data = await res.json();
  assertEquals(data.error.message, "Unsupported phone number prefix");
});

Deno.test("send-sms: denies on cooldown with 429", async () => {
  setupFetchMock();
  try {
    mockRpcHandler = async (rpc) => {
      if (rpc === "auth_sms_reserve") {
        return new Response(
          JSON.stringify({ message: "cooldown", code: "P0001" }),
          { status: 400 }
        );
      }
      return new Response("null", { status: 200 });
    };

    mockHttpHandler = async () => new Response("unused", { status: 500 });

    const req = createSignedRequest({
      user: { phone: "+250788123456" },
      sms: { otp: TEST_OTP },
    });

    const res = await handleSendSms(req);
    assertEquals(res.status, 429);
    const data = await res.json();
    assertEquals(data.error.http_code, 429);
  } finally {
    restoreFetchMock();
  }
});

Deno.test("send-sms: denies on hourly cap with 429", async () => {
  setupFetchMock();
  try {
    mockRpcHandler = async (rpc) => {
      if (rpc === "auth_sms_reserve") {
        return new Response(
          JSON.stringify({ message: "hourly_cap", code: "P0001" }),
          { status: 400 }
        );
      }
      return new Response("null", { status: 200 });
    };

    mockHttpHandler = async () => new Response("unused", { status: 500 });

    const req = createSignedRequest({
      user: { phone: "+250788123456" },
      sms: { otp: TEST_OTP },
    });

    const res = await handleSendSms(req);
    assertEquals(res.status, 429);
  } finally {
    restoreFetchMock();
  }
});

Deno.test("send-sms: Pindo 401 triggers SMS_PROVIDER_AUTH log and fails over to AT", async () => {
  setupFetchMock();
  try {
    let pindoCalled = false;
    let atCalled = false;
    let markStatus = "";
    let markProvider = "";

    mockRpcHandler = async (rpc, params) => {
      if (rpc === "auth_sms_reserve") {
        return new Response(JSON.stringify("res-uuid-401"), { status: 200 });
      }
      if (rpc === "auth_sms_mark") {
        markStatus = params.p_status as string;
        markProvider = params.p_provider as string;
        return new Response("null", { status: 200 });
      }
      return new Response("null", { status: 200 });
    };

    mockHttpHandler = async (url) => {
      if (url.includes("api.pindo.io")) {
        pindoCalled = true;
        return new Response(JSON.stringify({ message: "Bad auth token" }), { status: 401 });
      }
      if (url.includes("africastalking")) {
        atCalled = true;
        return new Response(
          JSON.stringify({
            SMSMessageData: {
              Recipients: [{ status: "Success", messageId: "AT-MSG-789" }],
            },
          }),
          { status: 200 }
        );
      }
      return new Response("not found", { status: 404 });
    };

    const req = createSignedRequest({
      user: { phone: "+250788123456" },
      sms: { otp: TEST_OTP },
    });

    const res = await handleSendSms(req);
    assertEquals(res.status, 200);
    assert(pindoCalled, "Pindo should have been called first");
    assert(atCalled, "Africa's Talking should have been called on failover");
    assertEquals(markStatus, "sent");
    assertEquals(markProvider, "africas_talking");

    // Check that SMS_PROVIDER_AUTH was logged
    const logsText = capturedLogs.join(" ");
    assertStringIncludes(logsText, "SMS_PROVIDER_AUTH");
  } finally {
    restoreFetchMock();
  }
});

Deno.test("send-sms: Pindo 409 fails over to fallback provider", async () => {
  setupFetchMock();
  try {
    let pindoCalled = false;
    let atCalled = false;

    mockRpcHandler = async (rpc) => {
      if (rpc === "auth_sms_reserve") return new Response(JSON.stringify("res-uuid-409"), { status: 200 });
      return new Response("null", { status: 200 });
    };

    mockHttpHandler = async (url) => {
      if (url.includes("api.pindo.io")) {
        pindoCalled = true;
        return new Response(JSON.stringify({ message: "Conflict number" }), { status: 409 });
      }
      if (url.includes("africastalking")) {
        atCalled = true;
        return new Response(
          JSON.stringify({
            SMSMessageData: { Recipients: [{ status: "Success", messageId: "AT-409" }] },
          }),
          { status: 200 }
        );
      }
      return new Response("not found", { status: 404 });
    };

    const req = createSignedRequest({
      user: { phone: "+250788123456" },
      sms: { otp: TEST_OTP },
    });

    const res = await handleSendSms(req);
    assertEquals(res.status, 200);
    assert(pindoCalled);
    assert(atCalled);
  } finally {
    restoreFetchMock();
  }
});

Deno.test("send-sms: Pindo timeout fails over to secondary provider", async () => {
  setupFetchMock();
  try {
    let atCalled = false;

    mockRpcHandler = async (rpc) => {
      if (rpc === "auth_sms_reserve") return new Response(JSON.stringify("res-uuid-timeout"), { status: 200 });
      return new Response("null", { status: 200 });
    };

    mockHttpHandler = async (url) => {
      if (url.includes("api.pindo.io")) {
        // Simulate AbortError/Timeout
        const abortErr = new Error("The operation was aborted");
        abortErr.name = "AbortError";
        throw abortErr;
      }
      if (url.includes("africastalking")) {
        atCalled = true;
        return new Response(
          JSON.stringify({
            SMSMessageData: { Recipients: [{ status: "Success", messageId: "AT-TIMEOUT-RECOVERED" }] },
          }),
          { status: 200 }
        );
      }
      return new Response("not found", { status: 404 });
    };

    const req = createSignedRequest({
      user: { phone: "+250788123456" },
      sms: { otp: TEST_OTP },
    });

    const res = await handleSendSms(req);
    assertEquals(res.status, 200);
    assert(atCalled, "Fallback Africa's Talking provider must be called on Pindo timeout");
  } finally {
    restoreFetchMock();
  }
});

Deno.test("pindo-dlr-webhook: updates delivery status monotonically", async () => {
  setupFetchMock();
  try {
    let updatedStatus = "";

    mockHttpHandler = async (url, init) => {
      // Mock Supabase REST table queries for sms_send_log
      if (url.includes("/rest/v1/sms_send_log")) {
        if (init?.method === "PATCH") {
          const body = JSON.parse(String(init.body));
          updatedStatus = body.status;
          return new Response("[]", { status: 200 });
        }
        // SELECT lookup
        return new Response(JSON.stringify({ id: "log-1", status: "sent" }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    };

    const req = new Request(
      "http://localhost/functions/v1/pindo-dlr-webhook?token=super-secret-dlr-token-123456789",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sms_id: "pindo-999",
          status: "DELIVRD",
          retries_count: 0,
        }),
      }
    );

    const res = await handlePindoDlr(req);
    assertEquals(res.status, 200);
    assertEquals(updatedStatus, "delivered");
  } finally {
    restoreFetchMock();
  }
});

Deno.test("pindo-dlr-webhook: never downgrades 'delivered' status", async () => {
  setupFetchMock();
  try {
    let updateAttempted = false;

    mockHttpHandler = async (url, init) => {
      if (url.includes("/rest/v1/sms_send_log")) {
        if (init?.method === "PATCH") {
          updateAttempted = true;
          return new Response("[]", { status: 200 });
        }
        // Current status is already DELIVERED
        return new Response(JSON.stringify({ id: "log-1", status: "delivered" }), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    };

    const req = new Request(
      "http://localhost/functions/v1/pindo-dlr-webhook?token=super-secret-dlr-token-123456789",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sms_id: "pindo-999",
          status: "UNDELIV",
        }),
      }
    );

    const res = await handlePindoDlr(req);
    assertEquals(res.status, 200);
    assert(!updateAttempted, "Must NOT update or downgrade an already delivered row");
  } finally {
    restoreFetchMock();
  }
});

Deno.test("pindo-dlr-webhook: rejects invalid token with 401", async () => {
  const req = new Request(
    "http://localhost/functions/v1/pindo-dlr-webhook?token=wrong-token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sms_id: "pindo-999", status: "DELIVRD" }),
    }
  );

  const res = await handlePindoDlr(req);
  assertEquals(res.status, 401);
});

Deno.test("send-sms: fallback skipped if under 800ms remain in deadline budget", async () => {
  setupFetchMock();
  try {
    let atCalled = false;
    let markStatus = "";

    mockRpcHandler = async (rpc, params) => {
      if (rpc === "auth_sms_reserve") return new Response(JSON.stringify("res-uuid-deadline"), { status: 200 });
      if (rpc === "auth_sms_mark") {
        markStatus = params.p_status as string;
        return new Response("null", { status: 200 });
      }
      return new Response("null", { status: 200 });
    };

    mockHttpHandler = async (url) => {
      if (url.includes("api.pindo.io")) {
        // Sleep 2800ms before failing so remaining budget is < 800ms (3500 - 2800 = 700ms)
        await new Promise((resolve) => setTimeout(resolve, 2800));
        throw new Error("Pindo slow timeout");
      }
      if (url.includes("africastalking")) {
        atCalled = true;
        return new Response("{}", { status: 200 });
      }
      if (url.includes("/rest/v1/sms_send_log")) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    };

    const req = createSignedRequest({
      user: { phone: "+250788123456" },
      sms: { otp: TEST_OTP },
    });

    const res = await handleSendSms(req);
    assertEquals(res.status, 502);
    assert(!atCalled, "Fallback provider should be SKIPPED because remaining budget < 800ms");
    assertEquals(markStatus, "failed");
  } finally {
    restoreFetchMock();
  }
});

Deno.test("send-sms: circuit breaker tries Africa's Talking first when Pindo failed >= 3 of last 5 sends", async () => {
  setupFetchMock();
  try {
    let firstProviderCalled = "";
    let markProvider = "";

    mockRpcHandler = async (rpc, params) => {
      if (rpc === "auth_sms_reserve") return new Response(JSON.stringify("res-uuid-cb"), { status: 200 });
      if (rpc === "auth_sms_mark") {
        markProvider = params.p_provider as string;
        return new Response("null", { status: 200 });
      }
      return new Response("null", { status: 200 });
    };

    mockHttpHandler = async (url) => {
      // Mock circuit breaker query returning 3 fails in last 5 sends within last 2 minutes
      if (url.includes("/rest/v1/sms_send_log")) {
        const now = new Date().toISOString();
        return new Response(
          JSON.stringify([
            { error_code: "SEND_TIMEOUT", send_outcome: "send_timeout", created_at: now },
            { error_code: "PROVIDER_ERROR", send_outcome: "provider_error", created_at: now },
            { error_code: null, send_outcome: "success", created_at: now },
            { error_code: "SEND_TIMEOUT", send_outcome: "send_timeout", created_at: now },
            { error_code: null, send_outcome: "success", created_at: now },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("africastalking")) {
        if (!firstProviderCalled) firstProviderCalled = "africas_talking";
        return new Response(
          JSON.stringify({
            SMSMessageData: { Recipients: [{ status: "Success", messageId: "AT-CB-001" }] },
          }),
          { status: 200 }
        );
      }
      if (url.includes("api.pindo.io")) {
        if (!firstProviderCalled) firstProviderCalled = "pindo";
        return new Response(JSON.stringify({ sms_id: "pindo-cb" }), { status: 201 });
      }
      return new Response("not found", { status: 404 });
    };

    const req = createSignedRequest({
      user: { phone: "+250788123456" },
      sms: { otp: TEST_OTP },
    });

    const res = await handleSendSms(req);
    assertEquals(res.status, 200);
    assertEquals(firstProviderCalled, "africas_talking", "Africa's Talking must be called FIRST when circuit is tripped");
    assertEquals(markProvider, "africas_talking");
  } finally {
    restoreFetchMock();
  }
});

Deno.test("security assertion: captured logs never contain the OTP", () => {
  const allLogs = capturedLogs.join("\n");
  assert(
    !allLogs.includes(TEST_OTP),
    `CRITICAL SECURITY VIOLATION: OTP '${TEST_OTP}' was detected in log output!`
  );
});
