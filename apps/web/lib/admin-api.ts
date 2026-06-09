import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME, isValidAdminSession } from "@/lib/admin-auth";

export function adminUnauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function requireAdminSession(): boolean {
  const value = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return isValidAdminSession(value);
}

export function withAdminAuth<T extends (...args: never[]) => Promise<Response>>(handler: T) {
  return async (...args: Parameters<T>) => {
    if (!requireAdminSession()) return adminUnauthorized();
    return handler(...args);
  };
}
