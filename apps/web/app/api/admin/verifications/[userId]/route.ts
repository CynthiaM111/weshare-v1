import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-api";
import { reviewVerification } from "@/lib/driver-verification-admin";

type Params = { params: { userId: string } };

export async function POST(request: Request, { params }: Params) {
  if (!requireAdminSession()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { decision?: string; rejectionReason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const decision = body.decision;
  if (decision !== "approved" && decision !== "rejected") {
    return NextResponse.json({ error: "decision must be approved or rejected" }, { status: 400 });
  }

  try {
    await reviewVerification(params.userId, decision, body.rejectionReason);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
