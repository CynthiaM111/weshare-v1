import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeRwandanPhone, type NormalizedRwandanPhone } from './phone';

export type OtpStartResult = {
  verificationId: string;
  phoneE164: NormalizedRwandanPhone;
};

const PENDING_KEY = 'weshare:otp_pending:v1';

function newVerificationId() {
  return `otp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * OTP entry point (SMS not implemented yet).
 * For now this ONLY validates & normalizes the phone, and persists a pending challenge.
 */
export async function startOtp(phoneInput: string): Promise<OtpStartResult> {
  const phoneE164 = normalizeRwandanPhone(phoneInput);
  if (!phoneE164) {
    throw new Error('INVALID_RW_PHONE');
  }

  const verificationId = newVerificationId();
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify({ verificationId, phoneE164, createdAtISO: new Date().toISOString() }));
  return { verificationId, phoneE164 };
}

/**
 * Placeholder for future OTP verify flow.
 * Intentionally not implemented yet (no SMS provider wired).
 */
export async function verifyOtp(_verificationId: string, _code: string): Promise<never> {
  throw new Error('OTP_NOT_IMPLEMENTED');
}

export async function loadPendingOtp(): Promise<OtpStartResult | null> {
  const raw = await AsyncStorage.getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OtpStartResult & { createdAtISO?: string };
    if (!parsed?.verificationId || !parsed?.phoneE164) return null;
    return { verificationId: parsed.verificationId, phoneE164: parsed.phoneE164 };
  } catch {
    return null;
  }
}

export async function clearPendingOtp(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_KEY);
}

