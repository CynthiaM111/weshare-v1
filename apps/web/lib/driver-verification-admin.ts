import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for admin API");
  }

  adminClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return adminClient;
}

export type PendingVerification = {
  userId: string;
  fullName: string;
  phone: string;
  licensePlate: string;
  carModel: string;
  carColor: string;
  licenseImagePath: string | null;
  carImagePath: string | null;
  submittedAt: string | null;
  licenseImageUrl: string | null;
  carImageUrl: string | null;
};

export async function listPendingVerifications(): Promise<PendingVerification[]> {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("driver_verifications")
    .select(
      `
      user_id,
      license_plate,
      car_model,
      car_color,
      license_image_path,
      car_image_path,
      submitted_at,
      profiles!driver_verifications_user_id_fkey ( full_name, phone )
    `
    )
    .eq("status", "pending")
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = data ?? [];

  return Promise.all(
    rows.map(async (row) => {
      const profile = row.profiles as { full_name?: string | null; phone?: string | null } | null;
      const licensePath = row.license_image_path as string | null;
      const carPath = row.car_image_path as string | null;

      const [licenseImageUrl, carImageUrl] = await Promise.all([
        licensePath
          ? supabase.storage.from("driver-verification").createSignedUrl(licensePath, 3600)
          : Promise.resolve({ data: null }),
        carPath
          ? supabase.storage.from("driver-verification").createSignedUrl(carPath, 3600)
          : Promise.resolve({ data: null }),
      ]);

      return {
        userId: row.user_id as string,
        fullName: profile?.full_name?.trim() || "Unknown",
        phone: profile?.phone ?? "",
        licensePlate: (row.license_plate as string) ?? "",
        carModel: (row.car_model as string) ?? "",
        carColor: (row.car_color as string) ?? "",
        licenseImagePath: licensePath,
        carImagePath: carPath,
        submittedAt: (row.submitted_at as string) ?? null,
        licenseImageUrl: licenseImageUrl.data?.signedUrl ?? null,
        carImageUrl: carImageUrl.data?.signedUrl ?? null,
      };
    })
  );
}

export async function reviewVerification(
  userId: string,
  decision: "approved" | "rejected",
  rejectionReason?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("driver_verifications")
    .update({
      status: decision,
      rejection_reason:
        decision === "rejected" ? (rejectionReason?.trim() || "Please resubmit clearer details.") : null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function getAdminAlertCounts(): Promise<{
  pendingVerifications: number;
  unreadAlerts: number;
}> {
  const supabase = getSupabaseAdmin();

  const [pendingRes, alertsRes] = await Promise.all([
    supabase
      .from("driver_verifications")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("admin_site_alerts")
      .select("id", { count: "exact", head: true })
      .is("read_at", null),
  ]);

  return {
    pendingVerifications: pendingRes.count ?? 0,
    unreadAlerts: alertsRes.count ?? 0,
  };
}

export async function listUnreadAlerts(limit = 10) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("admin_site_alerts")
    .select("id, title, message, created_at, driver_user_id")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markAllAlertsRead(): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("admin_site_alerts")
    .update({ read_at: now })
    .is("read_at", null);

  if (error) throw new Error(error.message);
}
