import type { Session } from '@supabase/supabase-js';

import { supabase } from '../supabase';

export type AuthSession = {
  userId: string;
  phoneE164: string;
};

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
  await supabase.auth.signOut();
}
