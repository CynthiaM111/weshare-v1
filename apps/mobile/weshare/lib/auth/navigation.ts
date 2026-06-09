import { getProfile } from './users';
import { loadSession } from './session';

/** Safe in-app path after login (never send users back into /auth). */
export function normalizeAuthRedirect(redirect?: string | string[]): string {
  const raw = Array.isArray(redirect) ? redirect[0] : redirect;
  if (!raw || typeof raw !== 'string') return '/';
  if (raw.startsWith('/auth')) return '/';
  return raw;
}

/** Redirect param for auth after tapping "Book this ride" on Find Ride. */
export function bookingConfirmAuthRedirect(rideId: string): string {
  return `/bookings/confirm?rideId=${encodeURIComponent(rideId)}`;
}

export type PostLoginRoute = {
  pathname: string;
  params?: Record<string, string>;
};

/** Parse redirect strings into expo-router pathname + params (e.g. booking confirm + rideId). */
export function parseAuthRedirectRoute(dest: string): PostLoginRoute {
  if (dest.startsWith('/bookings/confirm')) {
    const q = dest.indexOf('?');
    if (q !== -1) {
      const rideId = new URLSearchParams(dest.slice(q + 1)).get('rideId');
      if (rideId) {
        return { pathname: '/bookings/confirm', params: { rideId } };
      }
    }
  }
  return { pathname: dest };
}

/** Where to send the user after OTP succeeds or when they already have a session. */
export async function resolvePostLoginRoute(
  redirect?: string | string[]
): Promise<PostLoginRoute> {
  const dest = normalizeAuthRedirect(redirect);
  const session = await loadSession();
  if (!session) {
    return { pathname: '/auth' };
  }

  const profile = await getProfile(session.userId);
  if (!profile?.fullName?.trim()) {
    return { pathname: '/auth/signup', params: { redirect: dest } };
  }

  return parseAuthRedirectRoute(dest);
}
