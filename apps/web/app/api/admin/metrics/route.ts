import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-api";
import { getMetricsSummary } from "@/lib/metrics-admin";

export async function GET(request: Request) {
  if (!requireAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = Math.min(30, Math.max(1, Number(searchParams.get("days") ?? "7") || 7));

  try {
    const summary = await getMetricsSummary(days);
    return NextResponse.json(summary);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to load metrics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
