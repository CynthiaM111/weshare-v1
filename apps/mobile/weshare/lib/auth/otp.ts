import { supabase } from '../supabase';

function friendlyOtpError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (lower.includes('invalid') && lower.includes('phone')) {
    return 'Enter a valid Rwanda mobile number.';
  }
  if (
    lower.includes('sms') ||
    lower.includes('provider') ||
    lower.includes('twilio') ||
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
 * Sends an SMS OTP via Supabase Auth → Send SMS Hook → Africa's Talking.
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

/** Fetch OTP stored by send-sms hook when internal dev bypass is active. */
export async function fetchDevOtpCode(phoneE164: string): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('dev-otp-peek', {
    body: { phone: phoneE164 },
  });
  if (error) return null;
  const otp = (data as { otp?: string | null } | null)?.otp;
  return otp && /^\d{6}$/.test(otp) ? otp : null;
}