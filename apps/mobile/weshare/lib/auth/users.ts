import { supabase } from '../supabase';

export type UserProfile = {
  id: string;
  phoneE164: string;
  fullName: string;
  avatarUrl?: string;
  createdAt: string;
};

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    phoneE164: data.phone,
    fullName: data.full_name ?? '',
    avatarUrl: data.avatar_url ?? undefined,
    createdAt: data.created_at,
  };
}

export const getUserById = getProfile;

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