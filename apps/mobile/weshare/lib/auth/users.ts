import { supabase } from '../supabase';

export type UserProfile = {
  id: string;
  phoneE164: string;
  fullName: string;
  avatarUrl?: string;
  isSuperAdmin: boolean;
  createdAt: string;
};

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return profileFromRow(data);
}

export const getUserById = getProfile;

export function profileFromRow(row: {
  id: string;
  phone?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  is_super_admin?: boolean | null;
  created_at: string;
}): UserProfile {
  return {
    id: row.id,
    phoneE164: row.phone ?? '',
    fullName: row.full_name ?? '',
    avatarUrl: row.avatar_url ?? undefined,
    isSuperAdmin: row.is_super_admin === true,
    createdAt: row.created_at,
  };
}

/** Batch-fetch profiles by user id (e.g. passengers on a ride). */
export async function getProfiles(userIds: string[]): Promise<Map<string, UserProfile>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, UserProfile>();
  if (unique.length === 0) return map;

  const { data, error } = await supabase.from('profiles').select('*').in('id', unique);
  if (error) return map;

  for (const row of data ?? []) {
    map.set(row.id, profileFromRow(row));
  }
  return map;
}

/** Best-effort label for a passenger when showing bookings to a driver. */
export function passengerDisplayName(
  profile: UserProfile | null | undefined,
  passengerId: string
): string {
  const name = profile?.fullName?.trim();
  if (name) return name;
  const phone = profile?.phoneE164?.trim();
  if (phone) return phone;
  return `Passenger ${passengerId.slice(0, 8)}`;
}

export async function upsertProfile(
  userId: string,
  fields: { fullName?: string; phoneE164?: string }
): Promise<string | null> {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    full_name: fields.fullName,
    phone: fields.phoneE164,
    updated_at: new Date().toISOString(),
  });
  return error ? error.message : null;
}