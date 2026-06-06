import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  type AuthSession,
  markExpiredSignOut,
  takeSignOutKind,
  toAuthSession,
} from '@/lib/auth/session';
import { getProfile, type UserProfile } from '@/lib/auth/users';
import { supabase } from '@/lib/supabase';

type SessionContextValue = {
  session: AuthSession | null;
  loading: boolean;
  profile: UserProfile | null;
  sessionExpired: boolean;
  refreshProfile: () => Promise<void>;
  dismissSessionExpired: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const syncTicketRef = useRef(0);
  const hadSessionRef = useRef(false);

  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = session?.userId;
    if (!uid) {
      setProfile(null);
      return;
    }
    const p = await getProfile(uid);
    setProfile(p);
  }, [session?.userId]);

  const handleSignedOut = useCallback((kind: ReturnType<typeof takeSignOutKind>) => {
    if (kind === 'user') {
      setSessionExpired(false);
    } else if (hadSessionRef.current) {
      setSessionExpired(true);
    }
    hadSessionRef.current = false;
    setSession(null);
    setProfile(null);
  }, []);

  const tryRefreshSession = useCallback(async () => {
    if (!hadSessionRef.current) return;

    const { error } = await supabase.auth.refreshSession();
    if (!error) return;

    markExpiredSignOut();
    setSessionExpired(true);
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    supabase.auth.startAutoRefresh();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
        void tryRefreshSession();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });

    return () => {
      sub.remove();
      supabase.auth.stopAutoRefresh();
    };
  }, [tryRefreshSession]);

  useEffect(() => {
    let cancelled = false;

    async function syncAuth(event: AuthChangeEvent, s: Session | null) {
      if (event === 'SIGNED_OUT') {
        const kind = takeSignOutKind();
        if (!cancelled) handleSignedOut(kind);
        setLoading(false);
        return;
      }

      const ticket = ++syncTicketRef.current;
      const mapped = toAuthSession(s);
      if (mapped) {
        hadSessionRef.current = true;
        setSessionExpired(false);
      }
      const p = mapped?.userId ? await getProfile(mapped.userId) : null;
      if (cancelled || ticket !== syncTicketRef.current) return;
      setSession(mapped);
      setProfile(p);
      setLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      void syncAuth(event, s);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [handleSignedOut]);

  return (
    <SessionContext.Provider
      value={{
        session,
        loading,
        profile,
        sessionExpired,
        refreshProfile,
        dismissSessionExpired,
      }}
    >
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
