import { getSupabaseAdmin } from "./driver-verification-admin";

export const EXPECTED_APP_VERSION =
  process.env.NEXT_PUBLIC_EXPECTED_APP_VERSION ?? "1.0.0";

export type HealthBrief = {
  status: "good" | "watch" | "alert";
  title: string;
  items: string[];
};

export type MetricsSummary = {
  periodDays: number;
  expectedAppVersion: string;
  healthBrief: HealthBrief;
  funnel: {
    searches: number;
    bookTaps: number;
    paymentsInitiated: number;
    paymentsCompleted: number;
    searchToBookRate: number;
    bookToPayRate: number;
    paySuccessRate: number;
  };
  bookings: {
    pending: number;
    confirmed: number;
    started: number;
    completed: number;
    cancelled: number;
    total: number;
  };
  appVersions: { version: string; count: number }[];
  search: {
    total: number;
    successCount: number;
    zeroResultCount: number;
    zeroResultRate: number;
    avgDurationMs: number;
    p95DurationMs: number;
    recent: SearchMetricRow[];
  };
  payments: {
    deposits: { total: number; completed: number; failed: number; pending: number; successRate: number };
    payouts: { total: number; completed: number; failed: number; disputed: number; successRate: number };
    byNetwork: { network: string; deposits: number; completed: number }[];
    clientEvents: { initiated: number; completed: number; failed: number; timeout: number };
    recent: PaymentMetricRow[];
  };
  errors: {
    total: number;
    recent: ErrorMetricRow[];
  };
  health: {
    ridesActive: number;
    bookingsTotal: number;
    usersTotal: number;
    driversApproved: number;
    driversPending: number;
  };
};

export type SearchMetricRow = {
  id: string;
  fromQuery: string;
  toQuery: string;
  resultCount: number;
  durationMs: number | null;
  success: boolean;
  userLabel: string | null;
  appVersion: string | null;
  createdAt: string;
};

export type PaymentMetricRow = {
  id: string;
  bookingId: string;
  depositStatus: string;
  payoutStatus: string;
  network: string;
  grossAmount: number;
  escrowStatus: string;
  gpsVerified: boolean;
  createdAt: string;
};

export type ErrorMetricRow = {
  id: string;
  context: string;
  message: string;
  userLabel: string | null;
  appVersion: string | null;
  createdAt: string;
};

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return Math.round(sorted[idx] ?? 0);
}

function sinceIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

async function profileLabelsByUserId(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userIds: string[]
): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return new Map();

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", unique);

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const name = (row.full_name as string | null)?.trim();
    const phone = (row.phone as string | null)?.trim();
    map.set(row.id as string, phone || name || (row.id as string).slice(0, 8));
  }
  return map;
}

function collectAppVersions(rows: { payload: unknown }[]): { version: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const version = (row.payload as { app_version?: string }).app_version;
    if (!version || version === "unknown") continue;
    counts.set(version, (counts.get(version) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([version, count]) => ({ version, count }))
    .sort((a, b) => b.count - a.count);
}

function buildHealthBrief(
  data: Omit<MetricsSummary, "healthBrief" | "expectedAppVersion">
): HealthBrief {
  const items: string[] = [];
  let severity = 0; // 0 = good, 1 = watch, 2 = alert

  const bump = (level: "watch" | "alert") => {
    if (level === "alert") severity = 2;
    else if (severity < 1) severity = 1;
  };

  const hasActivity =
    data.funnel.searches > 0 ||
    data.payments.deposits.total > 0 ||
    data.funnel.bookTaps > 0;

  if (!hasActivity) {
    return {
      status: "watch",
      title: "No testing activity yet",
      items: [
        "Run a search and optionally a test payment in the mobile app to populate this dashboard.",
        `Expected tester build: v${EXPECTED_APP_VERSION} (restart Expo after pulling latest code).`,
      ],
    };
  }

  if (data.errors.total > 0) {
    bump("alert");
    items.push(`${data.errors.total} client error(s) — scroll to Client errors below.`);
  }

  if (data.search.total >= 3 && data.search.zeroResultRate >= 30) {
    bump("watch");
    items.push(
      `Search zero-result rate is ${data.search.zeroResultRate}% — riders may be typing places that don't match posted ride labels.`
    );
  }

  if (data.search.p95DurationMs > 2000) {
    bump("watch");
    items.push(
      `Search is slow (P95 ${data.search.p95DurationMs} ms) — check Supabase latency or ride query load.`
    );
  }

  if (data.payments.deposits.total > 0 && data.payments.deposits.successRate < 80) {
    bump("alert");
    items.push(
      `MoMo deposit success is ${data.payments.deposits.successRate}% — verify PawaPay sandbox keys and test numbers.`
    );
  }

  if (data.payments.deposits.failed > 0) {
    bump("alert");
    items.push(`${data.payments.deposits.failed} failed deposit(s) recorded in payments table.`);
  }

  if (data.payments.clientEvents.timeout > 0) {
    bump("watch");
    items.push(
      `${data.payments.clientEvents.timeout} payment timeout(s) — passenger waited 3 minutes without MoMo completing.`
    );
  }

  if (data.payments.clientEvents.failed > 0) {
    bump("alert");
    items.push(`${data.payments.clientEvents.failed} payment failure(s) reported from the app.`);
  }

  if (data.payments.payouts.failed > 0) {
    bump("alert");
    items.push(`${data.payments.payouts.failed} driver payout failure(s).`);
  }

  if (data.payments.payouts.disputed > 0) {
    bump("watch");
    items.push(
      `${data.payments.payouts.disputed} disputed escrow(s) — driver may have ended ride >5 km from destination.`
    );
  }

  if (data.health.driversPending > 0) {
    bump("watch");
    items.push(
      `${data.health.driversPending} driver application(s) pending — switch to the Drivers tab to review.`
    );
  }

  if (data.appVersions.length === 0) {
    bump("watch");
    items.push(
      `No app version seen in events yet — testers should rebuild Expo (expected v${EXPECTED_APP_VERSION}).`
    );
  } else {
    const outdated = data.appVersions.filter((v) => v.version !== EXPECTED_APP_VERSION);
    if (outdated.length > 0) {
      bump("watch");
      items.push(
        `Outdated builds in use: ${outdated.map((v) => `v${v.version} (${v.count} events)`).join(", ")} — ship v${EXPECTED_APP_VERSION}.`
      );
    }
  }

  const status: HealthBrief["status"] =
    severity === 2 ? "alert" : severity === 1 ? "watch" : "good";

  if (items.length === 0) {
    return {
      status: "good",
      title: "Everything looks good",
      items: [
        "Search speed, MoMo payments, and error rates are within normal ranges for internal testing.",
        data.appVersions.length > 0
          ? `Tester builds: ${data.appVersions.map((v) => `v${v.version} (${v.count} events)`).join(", ")}`
          : `Expected build: v${EXPECTED_APP_VERSION}`,
      ],
    };
  }

  return {
    status: status === "good" ? "watch" : status,
    title: status === "alert" ? "Needs your attention" : "Worth a quick review",
    items,
  };
}

export async function getMetricsSummary(periodDays = 7): Promise<MetricsSummary> {
  const supabase = getSupabaseAdmin();
  const since = sinceIso(periodDays);

  const [
    searchRes,
    funnelRes,
    paymentEventsRes,
    errorCountRes,
    errorRes,
    paymentsRes,
    bookingsPeriodRes,
    ridesRes,
    bookingsRes,
    usersRes,
    driversApprovedRes,
    driversPendingRes,
  ] = await Promise.all([
    supabase
      .from("app_metric_events")
      .select("id, user_id, success, duration_ms, payload, created_at")
      .eq("event_type", "search")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("app_metric_events")
      .select("payload, user_id")
      .eq("event_type", "funnel")
      .gte("created_at", since),
    supabase
      .from("app_metric_events")
      .select("payload, user_id")
      .eq("event_type", "payment")
      .gte("created_at", since),
    supabase
      .from("app_metric_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "error")
      .gte("created_at", since),
    supabase
      .from("app_metric_events")
      .select("id, user_id, payload, created_at")
      .eq("event_type", "error")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("payments")
      .select(
        "id, booking_id, deposit_status, payout_status, network, gross_amount, escrow_status, gps_verified, created_at"
      )
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("bookings").select("status").gte("created_at", since),
    supabase
      .from("rides")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .gte("depart_at", new Date().toISOString()),
    supabase.from("bookings").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("driver_verifications")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "approved"),
    supabase
      .from("driver_verifications")
      .select("user_id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  if (searchRes.error) throw new Error(searchRes.error.message);
  if (funnelRes.error) throw new Error(funnelRes.error.message);
  if (paymentEventsRes.error) throw new Error(paymentEventsRes.error.message);
  if (errorCountRes.error) throw new Error(errorCountRes.error.message);
  if (errorRes.error) throw new Error(errorRes.error.message);
  if (paymentsRes.error) throw new Error(paymentsRes.error.message);
  if (bookingsPeriodRes.error) throw new Error(bookingsPeriodRes.error.message);

  const searchRows = searchRes.data ?? [];
  const durations = searchRows
    .map((r) => r.duration_ms as number | null)
    .filter((v): v is number => typeof v === "number" && v >= 0);

  const zeroResultCount = searchRows.filter((r) => {
    const payload = r.payload as { result_count?: number };
    return (payload.result_count ?? 0) === 0;
  }).length;

  const profileIds = [
    ...searchRows.map((r) => r.user_id as string | null),
    ...(errorRes.data ?? []).map((r) => r.user_id as string | null),
  ].filter((id): id is string => Boolean(id));

  const profileLabels = await profileLabelsByUserId(supabase, profileIds);

  const recentSearch: SearchMetricRow[] = searchRows.slice(0, 15).map((r) => {
    const payload = r.payload as {
      from_query?: string;
      to_query?: string;
      result_count?: number;
      app_version?: string;
    };
    const userId = r.user_id as string | null;
    return {
      id: r.id as string,
      fromQuery: payload.from_query ?? "",
      toQuery: payload.to_query ?? "",
      resultCount: payload.result_count ?? 0,
      durationMs: r.duration_ms as number | null,
      success: Boolean(r.success),
      userLabel: userId ? (profileLabels.get(userId) ?? userId.slice(0, 8)) : null,
      appVersion: payload.app_version ?? null,
      createdAt: r.created_at as string,
    };
  });

  const funnelRows = funnelRes.data ?? [];
  const bookTaps = funnelRows.filter(
    (r) => (r.payload as { step?: string }).step === "book_tap"
  ).length;

  const clientPaymentEvents = paymentEventsRes.data ?? [];
  const phaseCounts = { initiated: 0, completed: 0, failed: 0, timeout: 0 };
  for (const row of clientPaymentEvents) {
    const phase = (row.payload as { phase?: string }).phase;
    if (phase === "initiated") phaseCounts.initiated++;
    else if (phase === "completed") phaseCounts.completed++;
    else if (phase === "failed") phaseCounts.failed++;
    else if (phase === "timeout") phaseCounts.timeout++;
  }

  const searchTotal = searchRows.length;

  const bookingStatus = { pending: 0, confirmed: 0, started: 0, completed: 0, cancelled: 0 };
  for (const row of bookingsPeriodRes.data ?? []) {
    const status = row.status as keyof typeof bookingStatus;
    if (status in bookingStatus) bookingStatus[status]++;
  }
  const bookingsTotal =
    bookingStatus.pending +
    bookingStatus.confirmed +
    bookingStatus.started +
    bookingStatus.completed +
    bookingStatus.cancelled;

  const appVersions = collectAppVersions([
    ...searchRows,
    ...funnelRows,
    ...clientPaymentEvents,
    ...(errorRes.data ?? []),
  ]);

  const paymentRows = paymentsRes.data ?? [];
  const depositCompleted = paymentRows.filter((p) => p.deposit_status === "completed").length;
  const depositFailed = paymentRows.filter((p) => p.deposit_status === "failed").length;
  const depositPending = paymentRows.filter(
    (p) => p.deposit_status === "pending" || p.deposit_status === "accepted"
  ).length;

  const payoutRows = paymentRows.filter((p) => p.payout_status && p.payout_status !== "pending");
  const payoutCompleted = payoutRows.filter((p) => p.payout_status === "completed").length;
  const payoutFailed = payoutRows.filter((p) => p.payout_status === "failed").length;
  const disputed = paymentRows.filter((p) => p.escrow_status === "disputed").length;

  const networkMap = new Map<string, { deposits: number; completed: number }>();
  for (const p of paymentRows) {
    const net = (p.network as string) ?? "unknown";
    const cur = networkMap.get(net) ?? { deposits: 0, completed: 0 };
    cur.deposits++;
    if (p.deposit_status === "completed") cur.completed++;
    networkMap.set(net, cur);
  }

  const recentPayments: PaymentMetricRow[] = paymentRows.slice(0, 15).map((p) => ({
    id: p.id as string,
    bookingId: p.booking_id as string,
    depositStatus: p.deposit_status as string,
    payoutStatus: (p.payout_status as string) ?? "pending",
    network: p.network as string,
    grossAmount: p.gross_amount as number,
    escrowStatus: p.escrow_status as string,
    gpsVerified: Boolean(p.gps_verified),
    createdAt: p.created_at as string,
  }));

  const recentErrors: ErrorMetricRow[] = (errorRes.data ?? []).map((r) => {
    const payload = r.payload as { context?: string; message?: string; app_version?: string };
    const userId = r.user_id as string | null;
    return {
      id: r.id as string,
      context: payload.context ?? "unknown",
      message: payload.message ?? "",
      userLabel: userId ? (profileLabels.get(userId) ?? userId.slice(0, 8)) : null,
      appVersion: payload.app_version ?? null,
      createdAt: r.created_at as string,
    };
  });

  const searchSuccess = searchRows.filter((r) => r.success).length;

  const core: Omit<MetricsSummary, "healthBrief" | "expectedAppVersion"> = {
    periodDays,
    funnel: {
      searches: searchTotal,
      bookTaps,
      paymentsInitiated: phaseCounts.initiated,
      paymentsCompleted: phaseCounts.completed,
      searchToBookRate: pct(bookTaps, searchTotal),
      bookToPayRate: pct(phaseCounts.initiated, bookTaps),
      paySuccessRate: pct(phaseCounts.completed, phaseCounts.initiated),
    },
    bookings: {
      ...bookingStatus,
      total: bookingsTotal,
    },
    appVersions,
    search: {
      total: searchTotal,
      successCount: searchSuccess,
      zeroResultCount,
      zeroResultRate: pct(zeroResultCount, searchTotal),
      avgDurationMs:
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0,
      p95DurationMs: percentile(durations, 95),
      recent: recentSearch,
    },
    payments: {
      deposits: {
        total: paymentRows.length,
        completed: depositCompleted,
        failed: depositFailed,
        pending: depositPending,
        successRate: pct(depositCompleted, paymentRows.length),
      },
      payouts: {
        total: payoutRows.length,
        completed: payoutCompleted,
        failed: payoutFailed,
        disputed,
        successRate: pct(payoutCompleted, payoutRows.length),
      },
      byNetwork: [...networkMap.entries()].map(([network, stats]) => ({ network, ...stats })),
      clientEvents: phaseCounts,
      recent: recentPayments,
    },
    errors: {
      total: errorCountRes.count ?? 0,
      recent: recentErrors,
    },
    health: {
      ridesActive: ridesRes.count ?? 0,
      bookingsTotal: bookingsRes.count ?? 0,
      usersTotal: usersRes.count ?? 0,
      driversApproved: driversApprovedRes.count ?? 0,
      driversPending: driversPendingRes.count ?? 0,
    },
  };

  return {
    ...core,
    expectedAppVersion: EXPECTED_APP_VERSION,
    healthBrief: buildHealthBrief(core),
  };
}
