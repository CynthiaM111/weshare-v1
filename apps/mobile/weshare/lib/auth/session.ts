import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NormalizedRwandanPhone } from './phone';

export type AuthSession = {
  userId: string;
  phoneE164: NormalizedRwandanPhone;
  createdAtISO: string;
};

const SESSION_KEY = 'weshare:auth_session:v1';

function newUserIdFromPhone(phoneE164: string) {
  // Deterministic-ish placeholder until backend auth exists.
  const base = phoneE164.replace(/\D/g, '');
  return `usr_${base}`;
}

export async function loadSession(): Promise<AuthSession | null> {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.phoneE164 || !parsed?.userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveSession(session: AuthSession): Promise<void> {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export function sessionFromVerifiedPhone(phoneE164: NormalizedRwandanPhone): AuthSession {
  return {
    userId: newUserIdFromPhone(phoneE164),
    phoneE164,
    createdAtISO: new Date().toISOString(),
  };
}

