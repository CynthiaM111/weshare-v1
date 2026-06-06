import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { normalizeAuthRedirect } from '@/lib/auth/navigation';
import { useSession } from '@/hooks/use-session';

type Options = {
  redirect?: string | string[];
  /** When true, users without a name may stay (signup screen). */
  allowIncompleteProfile?: boolean;
};

/**
 * If the user already has a persisted session, skip phone/OTP and go straight to the app.
 */
export function useRedirectIfAuthenticated({
  redirect,
  allowIncompleteProfile = false,
}: Options = {}) {
  const router = useRouter();
  const { session, profile, loading } = useSession();
  const dest = normalizeAuthRedirect(redirect);

  useEffect(() => {
    if (loading || !session) return;

    const hasName = Boolean(profile?.fullName?.trim());
    if (!hasName) {
      if (allowIncompleteProfile) return;
      router.replace({ pathname: '/auth/signup', params: { redirect: dest } } as any);
      return;
    }

    router.replace(dest as any);
  }, [loading, session, profile?.fullName, dest, allowIncompleteProfile, router]);
}
