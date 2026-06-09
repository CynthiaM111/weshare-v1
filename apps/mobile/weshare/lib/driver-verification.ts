import { supabase } from './supabase';

export type DriverVerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type DriverVerification = {
  userId: string;
  status: DriverVerificationStatus;
  licensePlate: string;
  carModel: string;
  carColor: string;
  licenseImagePath: string | null;
  carImagePath: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
};

export type PendingDriverVerification = DriverVerification & {
  fullName: string;
  phoneE164: string;
};

const BUCKET = 'driver-verification';

function rowToVerification(row: Record<string, unknown>): DriverVerification {
  return {
    userId: row.user_id as string,
    status: (row.status as DriverVerificationStatus) ?? 'none',
    licensePlate: (row.license_plate as string) ?? '',
    carModel: (row.car_model as string) ?? '',
    carColor: (row.car_color as string) ?? '',
    licenseImagePath: (row.license_image_path as string) ?? null,
    carImagePath: (row.car_image_path as string) ?? null,
    rejectionReason: (row.rejection_reason as string) ?? null,
    submittedAt: (row.submitted_at as string) ?? null,
    reviewedAt: (row.reviewed_at as string) ?? null,
  };
}

export async function getMyDriverVerification(userId: string): Promise<DriverVerification | null> {
  const { data, error } = await supabase
    .from('driver_verifications')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToVerification(data);
}

export async function isDriverApproved(userId: string): Promise<boolean> {
  const v = await getMyDriverVerification(userId);
  return v?.status === 'approved';
}

export async function uploadVerificationImage(
  userId: string,
  kind: 'license' | 'car',
  uri: string,
  mimeType = 'image/jpeg'
): Promise<string> {
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const path = `${userId}/${kind}.${ext}`;

  const response = await fetch(uri);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();

  const { error } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: mimeType,
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return path;
}

export async function getVerificationSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export type SubmitDriverVerificationInput = {
  licensePlate: string;
  carModel: string;
  carColor: string;
  licenseImagePath?: string | null;
  carImagePath?: string | null;
};

export async function submitDriverVerification(
  userId: string,
  input: SubmitDriverVerificationInput
): Promise<string | null> {
  const now = new Date().toISOString();
  const payload = {
    user_id: userId,
    status: 'pending' as const,
    license_plate: input.licensePlate.trim(),
    car_model: input.carModel.trim(),
    car_color: input.carColor.trim(),
    license_image_path: input.licenseImagePath ?? null,
    car_image_path: input.carImagePath ?? null,
    rejection_reason: null,
    submitted_at: now,
    updated_at: now,
  };

  const existing = await getMyDriverVerification(userId);
  if (existing) {
    const { error } = await supabase
      .from('driver_verifications')
      .update(payload)
      .eq('user_id', userId);
    return error?.message ?? null;
  }

  const { error } = await supabase.from('driver_verifications').insert(payload);
  return error?.message ?? null;
}

export async function listPendingVerifications(): Promise<PendingDriverVerification[]> {
  const { data, error } = await supabase
    .from('driver_verifications')
    .select('*, profiles!driver_verifications_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map(row => {
    const profile = row.profiles as { full_name?: string; phone?: string } | null;
    return {
      ...rowToVerification(row),
      fullName: profile?.full_name?.trim() || 'Unknown',
      phoneE164: profile?.phone ?? '',
    };
  });
}

export async function reviewDriverVerification(
  userId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  rejectionReason?: string
): Promise<string | null> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('driver_verifications')
    .update({
      status: decision,
      rejection_reason: decision === 'rejected' ? (rejectionReason?.trim() || 'Please resubmit clearer photos.') : null,
      reviewed_at: now,
      reviewed_by: reviewerId,
      updated_at: now,
    })
    .eq('user_id', userId);

  return error?.message ?? null;
}
