import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_DEV_BYPASS_NUMBERS: readonly string[] = [
  "+250780000001",
  "+250780000002",
  "+250780000003",
  "+250780000004",
  "+250780000005",
  "+250780000006",
];

export function isOtpDevBypassEnabled(): boolean {
  return (Deno.env.get("OTP_DEV_BYPASS") ?? "").trim().toLowerCase() === "true";
}

export function normalizePhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("250") && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return `+250${digits.slice(1)}`;
  }
  if (digits.length === 9 && digits.startsWith("7")) {
    return `+250${digits}`;
  }
  return `+${digits}`;
}

export function getDevBypassNumbers(): string[] {
  const raw = Deno.env.get("DEV_BYPASS_NUMBERS");
  if (!raw || !raw.trim()) {
    return [...DEFAULT_DEV_BYPASS_NUMBERS];
  }
  const parsed = raw
    .split(",")
    .map((s) => normalizePhoneE164(s.trim()))
    .filter(Boolean);
  return parsed.length > 0 ? parsed : [...DEFAULT_DEV_BYPASS_NUMBERS];
}

export function isDevBypassNumber(phone: string): boolean {
  const normalized = normalizePhoneE164(phone);
  if (!normalized) return false;
  return getDevBypassNumbers().includes(normalized);
}

export function maskPhone(phone: string): string {
  const normalized = normalizePhoneE164(phone);
  if (!normalized || normalized.length <= 6) return "***";
  const start = normalized.slice(0, Math.min(6, normalized.length - 3));
  const end = normalized.slice(-3);
  return `${start}****${end}`;
}

export async function storeDevOtpDisplay(
  supabase: SupabaseClient,
  phone: string,
  otp: string
): Promise<void> {
  const normalized = normalizePhoneE164(phone);
  if (!isDevBypassNumber(normalized)) {
    throw new Error(`Refusing to store OTP for unlisted number: ${maskPhone(phone)}`);
  }
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error } = await supabase.from("dev_otp_display").upsert({
    phone: normalized,
    otp,
    expires_at: expiresAt,
  } as Record<string, string>);
  if (error) throw error;
}
