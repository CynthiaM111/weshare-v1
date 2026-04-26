import AsyncStorage from '@react-native-async-storage/async-storage';

import type { NormalizedRwandanPhone } from './phone';

export type UserProfile = {
  userId: string;
  fullName: string;
  phoneE164: NormalizedRwandanPhone;
  createdAtISO: string;
};

const USERS_KEY = 'weshare:users:v1';

async function loadAll(): Promise<UserProfile[]> {
  const raw = await AsyncStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as UserProfile[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

async function saveAll(users: UserProfile[]) {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function getUserByPhone(phoneE164: NormalizedRwandanPhone): Promise<UserProfile | null> {
  const users = await loadAll();
  return users.find((u) => u.phoneE164 === phoneE164) ?? null;
}

export async function upsertUser(profile: UserProfile): Promise<UserProfile> {
  const users = await loadAll();
  const idx = users.findIndex((u) => u.userId === profile.userId || u.phoneE164 === profile.phoneE164);
  const next = [...users];
  if (idx >= 0) next[idx] = profile;
  else next.unshift(profile);
  await saveAll(next);
  return profile;
}

