import type { Session } from '@supabase/supabase-js';

import { supabase } from '../supabase';

export type AuthSession = {
  userId: string;
  phoneE164: string;
};

type SignOutKind = 'user' | 'expired';

let pendingSignOut: SignOutKind | null = null;

/** Profile → Log out (do not show session-expired screen). */
export function markUserInitiatedSignOut(): void {
  pendingSignOut = 'user';
}

/** Refresh token invalid / expired — show session-expired screen. */
export function markExpiredSignOut(): void {
  pendingSignOut = 'expired';
}

export function takeSignOutKind(): SignOutKind | 'unknown' {
  if (!pendingSignOut) return 'unknown';
  const kind = pendingSignOut;
  pendingSignOut = null;
  return kind;
}

export function toAuthSession(session: Session | null): AuthSession | null {
  if (!session?.user) return null;
  return {
    userId: session.user.id,
    phoneE164: session.user.phone ?? '',
  };
}

export async function loadSession(): Promise<AuthSession | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return toAuthSession(session);
}

export async function clearSession(): Promise<void> {
  markUserInitiatedSignOut();
  await supabase.auth.signOut();
}
