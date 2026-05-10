import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type AuthSession, toAuthSession } from '@/lib/auth/session';
import { getProfile, type UserProfile } from '@/lib/auth/users';
import { supabase } from '@/lib/supabase';

export function useSession() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const syncTicketRef = useRef(0);

  const refreshProfile = useCallback(async () => {
    const uid = session?.userId;
    if (!uid) {
      setProfile(null);
      return;
    }
    const p = await getProfile(uid);
    setProfile(p);
  }, [session?.userId]);

  useEffect(() => {
    let cancelled = false;

    async function syncAuth(s: Session | null) {
      const ticket = ++syncTicketRef.current;
      const mapped = toAuthSession(s);
      const p = mapped?.userId ? await getProfile(mapped.userId) : null;
      if (cancelled || ticket !== syncTicketRef.current) return;
      setSession(mapped);
      setProfile(p);
      setLoading(false);
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!cancelled) void syncAuth(s);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      void syncAuth(s);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return { session, loading, profile, refreshProfile };
}
