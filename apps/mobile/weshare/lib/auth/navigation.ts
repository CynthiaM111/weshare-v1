import { getProfile } from './users';
import { loadSession } from './session';

/** Safe in-app path after login (never send users back into /auth). */
export function normalizeAuthRedirect(redirect?: string | string[]): string {
  const raw = Array.isArray(redirect) ? redirect[0] : redirect;
  if (!raw || typeof raw !== 'string') return '/';
  if (raw.startsWith('/auth')) return '/';
  return raw;
}

export type PostLoginRoute = {
  pathname: string;
  params?: { redirect: string };
};

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

  return { pathname: dest };
}
