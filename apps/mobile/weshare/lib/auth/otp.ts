import { supabase } from '../supabase';

/**
 * Sends a one-time password SMS to the given E.164 phone number.
 * Returns null on success, or an error message string.
 */
export async function sendOtp(phoneE164: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
  return error ? error.message : null;
}

/**
 * Verifies the OTP token for the given phone number.
 * Returns null on success, or an error message string.
 */
export async function verifyOtp(phoneE164: string, token: string): Promise<string | null> {
  const { error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token,
    type: 'sms',
  });
  return error ? error.message : null;
}