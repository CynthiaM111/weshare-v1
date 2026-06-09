import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-api";
import { getAdminAlertCounts, listUnreadAlerts, markAllAlertsRead } from "@/lib/driver-verification-admin";

export async function GET() {
  if (!requireAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [counts, alerts] = await Promise.all([getAdminAlertCounts(), listUnreadAlerts()]);
    return NextResponse.json({ ...counts, alerts });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load alerts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST() {
  if (!requireAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await markAllAlertsRead();
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to mark alerts read";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
