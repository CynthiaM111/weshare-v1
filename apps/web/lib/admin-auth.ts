import { createHmac, timingSafeEqual } from "crypto";

export const ADMIN_VERIFY_CODE =
  process.env.ADMIN_VERIFY_CODE ?? (process.env.NODE_ENV === "production" ? "" : "3589");
export const ADMIN_COOKIE_NAME = "weshare_admin_session";
const ADMIN_SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "weshare-admin-dev";

function sessionToken(): string {
  return createHmac("sha256", ADMIN_SESSION_SECRET).update("weshare-admin-verified").digest("hex");
}

export function verifyAdminCode(code: string): boolean {
  if (!ADMIN_VERIFY_CODE) return false;
  return code.trim() === ADMIN_VERIFY_CODE;
}

export function createAdminSessionValue(): string {
  return sessionToken();
}

export function isValidAdminSession(value: string | undefined): boolean {
  if (!value) return false;
  const expected = sessionToken();
  try {
    const a = Buffer.from(value, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
