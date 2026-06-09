import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-api";
import { listPendingVerifications } from "@/lib/driver-verification-admin";

export async function GET() {
  if (!requireAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pending = await listPendingVerifications();
    return NextResponse.json({ pending });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load verifications";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
