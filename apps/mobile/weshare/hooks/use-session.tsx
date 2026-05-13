import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { type AuthSession, toAuthSession } from '@/lib/auth/session';
import { getProfile, type UserProfile } from '@/lib/auth/users';
import { supabase } from '@/lib/supabase';

type SessionContextValue = {
  session: AuthSession | null;
  loading: boolean;
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  // Keep loading=true until onAuthStateChange fires at least once with the
  // restored (or null) session — supabase emits INITIAL_SESSION on startup.
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

  return (
    <SessionContext.Provider value={{ session, loading, profile, refreshProfile }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return ctx;
}
