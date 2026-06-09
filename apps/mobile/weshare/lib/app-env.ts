export type AppEnv = 'sandbox' | 'production';

/** Mobile app environment — separate from PawaPay backend env (set in Supabase secrets). */
export function getAppEnv(): AppEnv {
  return process.env.EXPO_PUBLIC_APP_ENV === 'production' ? 'production' : 'sandbox';
}

export function isSandboxApp(): boolean {
  return getAppEnv() === 'sandbox';
}

export function isProductionApp(): boolean {
  return getAppEnv() === 'production';
}

/** GPS dev bypass only in sandbox app builds. */
export function isGpsDevModeEnabled(): boolean {
  if (isProductionApp()) return false;
  return process.env.EXPO_PUBLIC_GPS_DEV_MODE === 'true';
}

/**
 * Internal Play testing: Supabase OTP is shown on-screen instead of SMS (server OTP_DEV_BYPASS).
 * Requires EXPO_PUBLIC_OTP_DEV_BYPASS=true in the build + OTP_DEV_BYPASS=true in Edge secrets.
 */
export function isOtpDevBypassEnabled(): boolean {
  return process.env.EXPO_PUBLIC_OTP_DEV_BYPASS === 'true';
}
