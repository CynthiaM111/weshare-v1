/**
 * SMS configuration constants, message formatting, and safe structured logging.
 */

export const ALLOWED_PREFIXES = ["+250"];

export const BRAND_NAME = "WeShare";

export interface SmsConfig {
  OTP_EXPIRY_S: number;
  MIN_INTERVAL_S: number;
  MAX_SENDS_PER_HOUR: number;
  GLOBAL_CAP_24H: number;
  LOW_BALANCE_THRESHOLD: number;
  SMS_SENDER: string;
  SMS_PRIMARY: string;
  SMS_FALLBACK: string;
}

export function getSmsConfig(): SmsConfig {
  return {
    OTP_EXPIRY_S: parseInt(Deno.env.get("OTP_EXPIRY_S") ?? "300", 10),
    MIN_INTERVAL_S: parseInt(Deno.env.get("MIN_INTERVAL_S") ?? "60", 10),
    MAX_SENDS_PER_HOUR: parseInt(Deno.env.get("MAX_SENDS_PER_HOUR") ?? "2", 10),
    GLOBAL_CAP_24H: parseInt(Deno.env.get("GLOBAL_CAP_24H") ?? "1000", 10),
    LOW_BALANCE_THRESHOLD: parseFloat(Deno.env.get("LOW_BALANCE_THRESHOLD") ?? "50"),
    SMS_SENDER: (Deno.env.get("SMS_SENDER") ?? Deno.env.get("AT_SENDER_ID") ?? "WeShare").trim(),
    SMS_PRIMARY: (Deno.env.get("SMS_PRIMARY") ?? "pindo").trim().toLowerCase(),
    SMS_FALLBACK: (Deno.env.get("SMS_FALLBACK") ?? "africas_talking").trim().toLowerCase(),
  };
}

/** Formats OTP SMS message with brand, code, expiry minutes, and "do not share" warning. */
export function formatSmsMessage(otp: string, expirySeconds: number = 300): string {
  const expiryMinutes = Math.max(1, Math.round(expirySeconds / 60));
  return `${BRAND_NAME}: Your verification code is ${otp}. Valid for ${expiryMinutes} minutes. Do not share this code with anyone.`;
}

/** Masks phone numbers (e.g. +250780****001) for safe logging. */
export function maskPhone(phone: string): string {
  if (!phone || phone.length <= 6) return "***";
  const start = phone.slice(0, Math.min(6, phone.length - 3));
  const end = phone.slice(-3);
  return `${start}****${end}`;
}

/**
 * Structured logger that guarantees OTPs are never logged.
 */
export const smsLogger = {
  info(event: string, details?: Record<string, unknown>) {
    console.log(JSON.stringify({ level: "INFO", event, ...sanitizeDetails(details) }));
  },
  warn(event: string, details?: Record<string, unknown>) {
    console.warn(JSON.stringify({ level: "WARN", event, ...sanitizeDetails(details) }));
  },
  error(event: string, details?: Record<string, unknown>) {
    console.error(JSON.stringify({ level: "ERROR", event, ...sanitizeDetails(details) }));
  },
};

function sanitizeDetails(details?: Record<string, unknown>): Record<string, unknown> {
  if (!details) return {};
  const sanitized: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(details)) {
    // Redact any OTP or sensitive field
    if (/otp|token|secret|password/i.test(key)) {
      sanitized[key] = "[REDACTED]";
    } else if (typeof val === "string" && /phone/i.test(key)) {
      sanitized[key] = maskPhone(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}
