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
 * In-app photo picker for driver verification (requires native module in standalone builds).
 * When false, drivers submit vehicle details only until the internal Play build ships.
 */
export function isDriverPhotoUploadEnabled(): boolean {
  return process.env.EXPO_PUBLIC_DRIVER_PHOTOS === 'true';
}

/** Sandbox / internal: allow verification submit without photos (text fields only). */
export function canSubmitDriverVerificationWithoutPhotos(): boolean {
  return isSandboxApp() || isOtpDevBypassEnabled() || !isDriverPhotoUploadEnabled();
}

/**
 * Internal Play testing: Supabase OTP is shown on-screen instead of SMS (server OTP_DEV_BYPASS).
 * Requires EXPO_PUBLIC_OTP_DEV_BYPASS=true in the build + OTP_DEV_BYPASS=true in Edge secrets.
 */
export function isOtpDevBypassEnabled(): boolean {
  return process.env.EXPO_PUBLIC_OTP_DEV_BYPASS === 'true';
}
