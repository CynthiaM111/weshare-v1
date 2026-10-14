export type AppEnv = 'sandbox' | 'production';

/**
 * Mobile app environment: fail-closed to 'production' unless explicitly 'sandbox' or 'development'.
 * Unset or unknown values always behave as production.
 */
export function getAppEnv(): AppEnv {
  const env = process.env.EXPO_PUBLIC_APP_ENV;
  return env === 'sandbox' || env === 'development' ? 'sandbox' : 'production';
}

export function isSandboxApp(): boolean {
  return getAppEnv() === 'sandbox';
}

export function isProductionApp(): boolean {
  return getAppEnv() === 'production';
}

/**
 * GPS dev bypass: sandbox local dev only (uses ride from/to coords).
 * Never enabled in production-env builds. Defaults to false.
 */
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
 * Static compile-time dev UI guard: strictly false unless EXPO_PUBLIC_APP_ENV is explicitly
 * 'sandbox' or 'development' (fail-closed: unset or unknown behaves as production).
 */
export const DEV_UI_ENABLED =
  (process.env.EXPO_PUBLIC_APP_ENV === 'sandbox' ||
   process.env.EXPO_PUBLIC_APP_ENV === 'development') &&
  process.env.EXPO_PUBLIC_OTP_DEV_BYPASS === 'true';

/**
 * Internal Play testing: Supabase OTP is shown on-screen instead of SMS (server OTP_DEV_BYPASS).
 * Requires EXPO_PUBLIC_OTP_DEV_BYPASS=true in the build + OTP_DEV_BYPASS=true in Edge secrets.
 */
export function isOtpDevBypassEnabled(): boolean {
  return DEV_UI_ENABLED;
}
