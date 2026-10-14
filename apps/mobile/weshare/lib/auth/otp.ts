import { supabase } from '../supabase';

export const RESEND_COOLDOWN_SECONDS = 60;

function friendlyOtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('hourly') || lower.includes('cap') || lower.includes('hour')) {
    return 'Hourly code limit reached (maximum 2 codes per hour). Please try again later.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many') ||
    lower.includes('cooldown')
  ) {
    return 'Too many SMS requests. Please wait a minute and try again (maximum 2 codes per hour).';
  }
  if (lower.includes('invalid') && lower.includes('phone')) {
    return 'Enter a valid Rwanda mobile number.';
  }
  if (
    lower.includes('sms') ||
    lower.includes('provider') ||
    lower.includes('hook')
  ) {
    return 'We could not send the SMS. Try again shortly.';
  }
  if (lower.includes('signup') && lower.includes('disabled')) {
    return 'New sign-ups are temporarily unavailable.';
  }
  return message;
}

/**
 * Sends an SMS OTP via Supabase Auth → Send SMS Hook → Pindo / Africa's Talking.
 * Returns null on success, or an error message string.
 */
export async function sendOtp(phoneE164: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: {
      channel: 'sms',
      shouldCreateUser: true,
    },
  });
  return error ? friendlyOtpError(error.message) : null;
}

/**
 * Verifies the SMS code and persists the session (refresh token in device storage).
 * Returns null on success, or an error message string.
 */
export async function verifyOtp(phoneE164: string, token: string): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: 'sms',
  });
  if (!error) return null;
  const lower = error.message.toLowerCase();
  if (lower.includes('expired') || lower.includes('invalid') || lower.includes('otp')) {
    return 'Invalid or expired code. Please try again.';
  }
  return friendlyOtpError(error.message);
}