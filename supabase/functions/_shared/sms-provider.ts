/**
 * SMS Provider abstraction and implementations for Pindo and Africa's Talking.
 */

export interface SendParams {
  to: string;
  text: string;
  sender: string;
  timeoutMs?: number;
}

export interface SendResult {
  providerMessageId: string;
  remainingBalance?: number;
  latencyMs?: number;
}

export interface SmsProvider {
  readonly name: string;
  send(params: SendParams): Promise<SendResult>;
}

export interface ProviderErrorDetails {
  code: string;
  status?: number;
  message: string;
  provider: string;
}

export class ProviderError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly provider: string;

  constructor(details: ProviderErrorDetails) {
    super(details.message);
    this.name = "ProviderError";
    this.code = details.code;
    this.status = details.status;
    this.provider = details.provider;
  }
}

/**
 * Pindo SMS Provider
 * API Docs: POST https://api.pindo.io/v1/sms/
 * Expects 201 Created with JSON { sms_id, remaining_balance }
 */
export class PindoProvider implements SmsProvider {
  readonly name = "pindo";
  private readonly apiToken: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly lowBalanceThreshold: number;

  constructor(options?: {
    apiToken?: string;
    baseUrl?: string;
    timeoutMs?: number;
    lowBalanceThreshold?: number;
  }) {
    this.apiToken = (options?.apiToken ?? Deno.env.get("PINDO_API_TOKEN") ?? "").trim();
    this.baseUrl = options?.baseUrl ?? "https://api.pindo.io/v1/sms/";
    this.timeoutMs = options?.timeoutMs ?? 4000;
    this.lowBalanceThreshold = options?.lowBalanceThreshold ?? 50;
  }

  async send(params: SendParams): Promise<SendResult> {
    if (!this.apiToken) {
      throw new ProviderError({
        provider: this.name,
        code: "SMS_PROVIDER_AUTH",
        message: "PINDO_API_TOKEN is not configured",
      });
    }

    const sendStart = Date.now();
    const effectiveTimeout = params.timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const res = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: params.to,
          text: params.text,
          sender: params.sender,
        }),
        signal: controller.signal,
      });

      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        /* ignore parse errors */
      }

      if (res.status === 401) {
        console.error(
          JSON.stringify({
            event: "SMS_PROVIDER_AUTH",
            provider: this.name,
            status: 401,
            error: data.message ?? text ?? "Unauthorized",
          })
        );
        throw new ProviderError({
          provider: this.name,
          code: "SMS_PROVIDER_AUTH",
          status: 401,
          message: "Pindo authentication failed",
        });
      }

      if (res.status === 409) {
        throw new ProviderError({
          provider: this.name,
          code: "INVALID_NUMBER",
          status: 409,
          message: "Invalid phone number according to Pindo",
        });
      }

      if (!res.ok) {
        const isServerErr = res.status >= 500;
        throw new ProviderError({
          provider: this.name,
          code: isServerErr ? "TEMPORARY_ERROR" : `HTTP_${res.status}`,
          status: res.status,
          message: `Pindo API error: ${text || `HTTP ${res.status}`}`,
        });
      }

      const providerMessageId = String(
        data.sms_id ?? data.id ?? `pindo-${Date.now()}`
      );
      const remainingBalance =
        typeof data.remaining_balance === "number"
          ? data.remaining_balance
          : typeof data.remaining_balance === "string"
          ? parseFloat(data.remaining_balance)
          : undefined;

      if (
        remainingBalance !== undefined &&
        !isNaN(remainingBalance) &&
        remainingBalance < this.lowBalanceThreshold
      ) {
        console.error(
          JSON.stringify({
            event: "SMS_BALANCE_LOW",
            provider: this.name,
            remainingBalance,
            threshold: this.lowBalanceThreshold,
          })
        );
      }

      const latencyMs = Date.now() - sendStart;
      return {
        providerMessageId,
        remainingBalance: remainingBalance !== undefined && !isNaN(remainingBalance) ? remainingBalance : undefined,
        latencyMs,
      };
    } catch (e: unknown) {
      if (e instanceof ProviderError) throw e;

      const isAbort = e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
      if (isAbort) {
        throw new ProviderError({
          provider: this.name,
          code: "TIMEOUT",
          message: `Pindo send timed out after ${this.timeoutMs}ms`,
        });
      }

      throw new ProviderError({
        provider: this.name,
        code: "TEMPORARY_ERROR",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Africa's Talking SMS Provider
 */
export class AfricasTalkingProvider implements SmsProvider {
  readonly name = "africas_talking";
  private readonly username: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options?: {
    username?: string;
    apiKey?: string;
    timeoutMs?: number;
  }) {
    this.username = (options?.username ?? Deno.env.get("AT_USERNAME") ?? "").trim();
    this.apiKey = (options?.apiKey ?? Deno.env.get("AT_API_KEY") ?? "").trim();
    this.timeoutMs = options?.timeoutMs ?? 4000;
  }

  private getBaseUrl(): string {
    if (this.username === "sandbox") {
      return "https://api.sandbox.africastalking.com/version1/messaging";
    }
    return "https://api.africastalking.com/version1/messaging";
  }

  async send(params: SendParams): Promise<SendResult> {
    if (!this.username || !this.apiKey) {
      throw new ProviderError({
        provider: this.name,
        code: "SMS_PROVIDER_AUTH",
        message: "AT_USERNAME or AT_API_KEY is not configured",
      });
    }

    const sendStart = Date.now();
    const effectiveTimeout = params.timeoutMs ?? this.timeoutMs;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      const body = new URLSearchParams({
        username: this.username,
        to: params.to,
        message: params.text,
      });

      if (params.sender?.trim() && this.username !== "sandbox") {
        body.set("from", params.sender.trim());
      }

      const res = await fetch(this.getBaseUrl(), {
        method: "POST",
        headers: {
          apiKey: this.apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
        signal: controller.signal,
      });

      const text = await res.text();
      let data: Record<string, unknown> = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        /* ignore */
      }

      if (!res.ok) {
        throw new ProviderError({
          provider: this.name,
          code: res.status >= 500 ? "TEMPORARY_ERROR" : `HTTP_${res.status}`,
          status: res.status,
          message: text || `HTTP ${res.status}`,
        });
      }

      const smsData = data.SMSMessageData as Record<string, unknown> | undefined;
      const recipients = smsData?.Recipients as Array<Record<string, unknown>> | undefined;
      const first = recipients?.[0];
      const status = String(first?.status ?? "").toLowerCase();

      if (
        status === "success" ||
        status === "sent" ||
        status === "queued" ||
        status === "submitted" ||
        (!recipients?.length && res.ok)
      ) {
        const messageId = String(first?.messageId ?? `at-${Date.now()}`);
        return {
          providerMessageId: messageId,
          remainingBalance: undefined,
          latencyMs: Date.now() - sendStart,
        };
      }

      throw new ProviderError({
        provider: this.name,
        code: String(first?.statusCode ?? first?.status ?? "SEND_FAILED"),
        message: String(first?.status ?? text ?? "Africa's Talking send rejected"),
      });
    } catch (e: unknown) {
      if (e instanceof ProviderError) throw e;

      const isAbort = e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
      if (isAbort) {
        throw new ProviderError({
          provider: this.name,
          code: "TIMEOUT",
          message: `Africa's Talking send timed out after ${this.timeoutMs}ms`,
        });
      }

      throw new ProviderError({
        provider: this.name,
        code: "TEMPORARY_ERROR",
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      clearTimeout(timer);
    }
  }
}
