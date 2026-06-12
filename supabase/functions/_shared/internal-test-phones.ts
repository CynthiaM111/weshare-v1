import { isOtpDevBypassEnabled, normalizePhoneE164 } from "./otp-dev-bypass.ts";

/** Supabase Auth internal test MSISDNs (+250780000001–006). OTP is always 123456. */
export function isInternalTestPhone(phone: string): boolean {
  return /^\+25078000000[1-6]$/.test(normalizePhoneE164(phone));
}

/** Skip PawaPay and auto-complete MoMo when internal Play testing is enabled. */
export function shouldMockMoMoPayment(phone: string): boolean {
  return isOtpDevBypassEnabled() && isInternalTestPhone(phone);
}
