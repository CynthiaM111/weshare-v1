import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function isOtpDevBypassEnabled(): boolean {
  return (Deno.env.get("OTP_DEV_BYPASS") ?? "").trim().toLowerCase() === "true";
}

export function normalizePhoneE164(phone: string): string {
  let p = phone.trim();
  if (!p.startsWith("+")) p = `+${p.replace(/\D/g, "")}`;
  return p;
}

export async function storeDevOtpDisplay(
  supabase: ReturnType<typeof createClient>,
  phone: string,
  otp: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error } = await supabase.from("dev_otp_display").upsert({
    phone: normalizePhoneE164(phone),
    otp,
    expires_at: expiresAt,
  });
  if (error) throw error;
}
