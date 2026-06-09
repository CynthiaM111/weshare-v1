import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  ADMIN_COOKIE_NAME,
  createAdminSessionValue,
  verifyAdminCode,
} from "@/lib/admin-auth";
import { getAdminAlertCounts } from "@/lib/driver-verification-admin";
import { requireAdminSession } from "@/lib/admin-api";

export async function GET() {
  if (!requireAdminSession()) {
    return NextResponse.json({ authenticated: false });
  }

  try {
    const counts = await getAdminAlertCounts();
    return NextResponse.json({
      authenticated: true,
      ...counts,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load admin session";
    return NextResponse.json({ authenticated: true, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const code = body.code ?? "";
  if (!verifyAdminCode(code)) {
    return NextResponse.json({ error: "Invalid admin code" }, { status: 401 });
  }

  cookies().set(ADMIN_COOKIE_NAME, createAdminSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  cookies().delete(ADMIN_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
