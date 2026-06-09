"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Logo } from "@/components/Logo";

type AdminTab = "drivers" | "metrics";

type PendingVerification = {
  userId: string;
  fullName: string;
  phone: string;
  licensePlate: string;
  carModel: string;
  carColor: string;
  licenseImageUrl: string | null;
  carImageUrl: string | null;
  submittedAt: string | null;
};

type AlertRow = {
  id: string;
  title: string;
  message: string;
  created_at: string;
};

type MetricsSummary = {
  periodDays: number;
  expectedAppVersion: string;
  healthBrief: {
    status: "good" | "watch" | "alert";
    title: string;
    items: string[];
  };
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
    zeroResultRate: number;
    avgDurationMs: number;
    p95DurationMs: number;
    recent: {
      id: string;
      fromQuery: string;
      toQuery: string;
      resultCount: number;
      durationMs: number | null;
      success: boolean;
      userLabel: string | null;
      appVersion: string | null;
      createdAt: string;
    }[];
  };
  payments: {
    deposits: { total: number; completed: number; failed: number; pending: number; successRate: number };
    payouts: { total: number; completed: number; failed: number; disputed: number; successRate: number };
    byNetwork: { network: string; deposits: number; completed: number }[];
    clientEvents: { initiated: number; completed: number; failed: number; timeout: number };
    recent: {
      id: string;
      depositStatus: string;
      payoutStatus: string;
      network: string;
      grossAmount: number;
      escrowStatus: string;
      gpsVerified: boolean;
      createdAt: string;
    }[];
  };
  errors: {
    total: number;
    recent: {
      id: string;
      context: string;
      message: string;
      userLabel: string | null;
      appVersion: string | null;
      createdAt: string;
    }[];
  };
  health: {
    ridesActive: number;
    bookingsTotal: number;
    usersTotal: number;
    driversApproved: number;
    driversPending: number;
  };
};

export default function AdminVerifyDriversPage() {
  const [tab, setTab] = useState<AdminTab>("drivers");
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState("");
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsDays, setMetricsDays] = useState(7);

  const checkSession = useCallback(async () => {
    const res = await fetch("/api/admin/session", { cache: "no-store" });
    const data = await res.json();
    setAuthenticated(Boolean(data.authenticated));
    return Boolean(data.authenticated);
  }, []);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setActionError("");
    try {
      const [verRes, alertRes] = await Promise.all([
        fetch("/api/admin/verifications", { cache: "no-store" }),
        fetch("/api/admin/alerts", { cache: "no-store" }),
      ]);

      if (verRes.status === 401) {
        setAuthenticated(false);
        return;
      }

      const verData = await verRes.json();
      const alertData = await alertRes.json();

      if (!verRes.ok) throw new Error(verData.error ?? "Failed to load queue");
      setPending(verData.pending ?? []);
      setAlerts(alertData.alerts ?? []);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMetrics = useCallback(async () => {
    setMetricsLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/metrics?days=${metricsDays}`, { cache: "no-store" });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load metrics");
      setMetrics(data);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to load metrics");
    } finally {
      setMetricsLoading(false);
    }
  }, [metricsDays]);

  useEffect(() => {
    void (async () => {
      const ok = await checkSession();
      if (ok) {
        await loadQueue();
        await loadMetrics();
      }
    })();
  }, [checkSession, loadQueue, loadMetrics]);

  useEffect(() => {
    if (!authenticated) return;
    const id = window.setInterval(() => {
      void loadQueue();
      if (tab === "metrics") void loadMetrics();
    }, 30_000);
    return () => window.clearInterval(id);
  }, [authenticated, tab, loadQueue, loadMetrics]);

  useEffect(() => {
    if (authenticated && tab === "metrics") void loadMetrics();
  }, [authenticated, tab, metricsDays, loadMetrics]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error ?? "Invalid code");
        return;
      }
      setAuthenticated(true);
      setCode("");
      await loadQueue();
      await loadMetrics();
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function onLogout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    setAuthenticated(false);
    setPending([]);
    setAlerts([]);
  }

  async function markAlertsRead() {
    await fetch("/api/admin/alerts", { method: "POST" });
    setAlerts([]);
  }

  async function review(userId: string, decision: "approved" | "rejected", reason?: string) {
    setActing(userId);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/verifications/${userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, rejectionReason: reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Review failed");
      setRejectTarget(null);
      setRejectReason("");
      await loadQueue();
      await markAlertsRead();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setActing(null);
    }
  }

  if (authenticated === null) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center">
        <p className="text-sm font-semibold admin-text-teal">Loading…</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="admin-shell flex min-h-screen flex-col">
        <header className="admin-header px-6 py-5">
          <Link href="/" className="inline-flex items-center gap-2">
            <Logo size={28} />
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <form onSubmit={onLogin} className="admin-login-card w-full max-w-sm rounded-2xl p-8">
            <p className="ws-eyebrow">WeShare admin</p>
            <h1 className="mt-2 text-xl font-black text-white">Admin access</h1>
            <p className="mt-2 text-sm font-semibold text-white/55">
              Enter the admin code. After login, use the Drivers and Metrics tabs.
            </p>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wider admin-text-teal">
              Admin code
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="admin-input mt-2 w-full rounded-xl px-4 py-3 text-lg font-bold tracking-[0.3em]"
              placeholder="••••"
              maxLength={8}
            />
            {authError ? <p className="mt-3 text-sm font-bold admin-text-danger">{authError}</p> : null}
            <button
              type="submit"
              disabled={authLoading || !code.trim()}
              className="ws-btn-primary mt-6 w-full justify-center disabled:opacity-50"
            >
              {authLoading ? "Checking…" : "Continue"}
            </button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen">
      <header className="admin-header sticky top-0 z-40">
        <div className="ws-container flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size={30} asLink={false} />
            <div>
              <h1 className="text-lg leading-none">
                <span className="admin-wordmark-we">We</span>
                <span className="admin-wordmark-share">Share</span>
                <span className="admin-text-muted text-sm font-semibold"> admin</span>
              </h1>
              <p className="admin-subtitle mt-0.5">Internal testing dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void (tab === "metrics" ? loadMetrics() : loadQueue())}
              className="admin-btn-refresh"
            >
              Refresh
            </button>
            <button type="button" onClick={() => void onLogout()} className="admin-btn-logout">
              Log out
            </button>
          </div>
        </div>
        <div className="admin-nav-bar ws-container flex gap-1 pb-0 pt-1">
          <TabButton active={tab === "drivers"} onClick={() => setTab("drivers")} label="Drivers" />
          <TabButton active={tab === "metrics"} onClick={() => setTab("metrics")} label="Metrics" />
        </div>
      </header>

      <main className="ws-container py-8">
        {actionError ? (
          <p className="admin-error-banner mb-4 px-4 py-3 text-sm font-bold">{actionError}</p>
        ) : null}
        {tab === "metrics" ? (
          <MetricsPanel
            metrics={metrics}
            loading={metricsLoading}
            days={metricsDays}
            onDaysChange={setMetricsDays}
          />
        ) : (
          <>
        {alerts.length > 0 ? (
          <div className="admin-alert mb-6 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold admin-text-teal">New verification requests</p>
                {alerts.slice(0, 3).map((a) => (
                  <p key={a.id} className="mt-1 text-xs font-semibold admin-text-muted">
                    {a.message}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void markAlertsRead()}
                className="shrink-0 text-xs font-bold admin-text-teal hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {loading && pending.length === 0 ? (
          <p className="text-center text-sm font-semibold admin-text-muted">Loading queue…</p>
        ) : null}

        {!loading && pending.length === 0 ? (
          <div className="admin-empty px-8 py-16 text-center">
            <p className="text-2xl font-black admin-text-teal">All caught up</p>
            <p className="mt-2 text-sm font-semibold admin-text-muted">No pending driver applications.</p>
            <p className="mt-4 text-xs font-semibold admin-text-muted">
              This page refreshes every 30 seconds. You&apos;ll see an on-site alert when someone applies.
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {pending.map((row) => (
            <article key={row.userId} className="admin-card p-5">
              <h2 className="text-lg font-black text-white">{row.fullName}</h2>
              {row.phone ? (
                <p className="mt-1 text-sm font-semibold text-white/60">{row.phone}</p>
              ) : null}
              <p className="mt-2 text-sm font-bold admin-text-teal">
                {row.carModel} · <span className="admin-word-accent">{row.carColor}</span> · {row.licensePlate}
              </p>
              {row.submittedAt ? (
                <p className="mt-1 text-xs font-semibold text-white/40">
                  Submitted {new Date(row.submittedAt).toLocaleString()}
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <DocPreview label="License" url={row.licenseImageUrl} />
                <DocPreview label="Car + plate" url={row.carImageUrl} />
              </div>

              <div className="mt-5 flex gap-3">
                <button
                  type="button"
                  disabled={acting === row.userId}
                  onClick={() => setRejectTarget(row.userId)}
                  className="admin-decline-btn rounded-xl px-4 py-2.5 text-sm font-extrabold disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={acting === row.userId}
                  onClick={() => void review(row.userId, "approved")}
                  className="admin-btn-teal flex-1 rounded-xl py-2.5 text-sm font-extrabold disabled:opacity-50"
                >
                  {acting === row.userId ? "Saving…" : "Approve driver"}
                </button>
              </div>
            </article>
          ))}
        </div>
          </>
        )}
      </main>

      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="admin-card w-full max-w-md rounded-2xl p-6">
            <h3 className="text-lg font-black text-white">Decline verification</h3>
            <p className="mt-1 text-sm font-semibold text-white/55">
              Optional reason shown to the driver in the app.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="admin-input mt-4 w-full rounded-xl px-3 py-2 text-sm font-semibold"
              placeholder="e.g. License photo is unclear"
            />
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectReason("");
                }}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-white/70"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void review(rejectTarget, "rejected", rejectReason)}
                className="admin-decline-btn flex-1 rounded-xl py-2 text-sm font-extrabold"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`admin-nav-link ${active ? "admin-nav-link--active" : ""}`}
    >
      {label}
    </button>
  );
}

type StatAccent =
  | "default"
  | "teal"
  | "orange"
  | "gold"
  | "danger"
  | "warning"
  | "info"
  | "funnel"
  | "pending"
  | "confirmed"
  | "started"
  | "completed-booking"
  | "cancelled"
  | "health-rides"
  | "health-bookings"
  | "health-users"
  | "health-approved"
  | "health-pending";

function StatCard({
  label,
  value,
  hint,
  accent = "default",
  valueClassName = "",
  hintPill = false,
  hintClassName = "",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: StatAccent;
  valueClassName?: string;
  hintPill?: boolean;
  hintClassName?: string;
}) {
  const accentClass = accent === "default" ? "" : `admin-stat--${accent}`;

  return (
    <div className={`admin-stat ${accentClass}`}>
      <p className="admin-stat-label">{label}</p>
      <p className={`admin-stat-value ${valueClassName}`}>{value}</p>
      {hint ? (
        <p className={hintPill ? "admin-stat-hint--pill" : `admin-stat-hint ${hintClassName}`}>{hint}</p>
      ) : null}
    </div>
  );
}

function HealthBriefBanner({ brief }: { brief: MetricsSummary["healthBrief"] }) {
  return (
    <div className={`admin-brief admin-brief--${brief.status}`}>
      <p className="admin-brief-title">{brief.title}</p>
      <ul className="admin-brief-list">
        {brief.items.map((item) =>
          item.toLowerCase().includes("disputed") ? (
            <li key={item}>
              <span className="admin-disputed-warning">
                <span className="admin-disputed-warning-icon" aria-hidden>
                  ⚠️
                </span>
                <span>{item}</span>
              </span>
            </li>
          ) : (
            <li key={item}>{item}</li>
          )
        )}
      </ul>
    </div>
  );
}

function AppVersionBanner({
  expectedVersion,
  versions,
}: {
  expectedVersion: string;
  versions: { version: string; count: number }[];
}) {
  const primary = versions[0];

  return (
    <section>
      <h2 className="admin-section-title">App build</h2>
      <div className="admin-version-hero">
        <div>
          <p className="admin-version-label">Expected tester build</p>
          <p className="admin-version-number">v{expectedVersion}</p>
        </div>
        <div className="admin-hairline h-10 w-px" />
        <div className="flex-1">
          <p className="admin-version-label">Seen in events (last {versions.length ? "period" : "—"})</p>
          {primary ? (
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="admin-badge admin-badge--teal">v{primary.version}</span>
              <span className="text-sm font-bold text-white">{primary.count} events</span>
              {versions.slice(1).map((v) => (
                <span key={v.version} className="admin-badge admin-badge--gold">
                  v{v.version} · {v.count}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm font-semibold admin-text-gold">
              No version logged yet — restart Expo (`npx expo start -c`) on the latest code.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function MetricsPanel({
  metrics,
  loading,
  days,
  onDaysChange,
}: {
  metrics: MetricsSummary | null;
  loading: boolean;
  days: number;
  onDaysChange: (d: number) => void;
}) {
  if (loading && !metrics) {
    return <p className="text-center text-sm font-semibold text-teal/70">Loading metrics…</p>;
  }

  if (!metrics) {
    return (
      <div className="admin-empty px-8 py-16 text-center">
        <p className="text-sm font-semibold text-white/55">No metrics yet. Run searches and payments in the app.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold admin-text-teal">Last {metrics.periodDays} days</p>
        <select
          value={days}
          onChange={(e) => onDaysChange(Number(e.target.value))}
          className="admin-time-filter"
        >
          <option value={1}>1 day</option>
          <option value={7}>7 days</option>
          <option value={14}>14 days</option>
          <option value={30}>30 days</option>
        </select>
      </div>

      <HealthBriefBanner brief={metrics.healthBrief} />
      <AppVersionBanner expectedVersion={metrics.expectedAppVersion} versions={metrics.appVersions} />

      <section>
        <h2 className="admin-section-title">Conversion funnel</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard accent="funnel" label="Searches" value={metrics.funnel.searches} />
          <StatCard
            accent="funnel"
            label="Book taps"
            value={metrics.funnel.bookTaps}
            hint={`${metrics.funnel.searchToBookRate}% of searches`}
            hintPill
          />
          <StatCard
            accent="funnel"
            label="Pay started"
            value={metrics.funnel.paymentsInitiated}
            hint={`${metrics.funnel.bookToPayRate}% of book taps`}
            hintPill
          />
          <StatCard
            accent="funnel"
            label="Pay completed"
            value={metrics.funnel.paymentsCompleted}
            hint={`${metrics.funnel.paySuccessRate}% of pay started`}
            hintPill
          />
        </div>
      </section>

      <section>
        <h2 className="admin-section-title">Bookings (period)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard accent="pending" label="Pending" value={metrics.bookings.pending} />
          <StatCard accent="confirmed" label="Confirmed" value={metrics.bookings.confirmed} />
          <StatCard accent="started" label="Started" value={metrics.bookings.started} />
          <StatCard accent="completed-booking" label="Completed" value={metrics.bookings.completed} />
          <StatCard accent="cancelled" label="Cancelled" value={metrics.bookings.cancelled} />
          <StatCard accent="teal" label="Total new" value={metrics.bookings.total} />
        </div>
      </section>

      <section>
        <h2 className="admin-section-title">App health</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard accent="health-rides" label="Active rides" value={metrics.health.ridesActive} />
          <StatCard accent="health-bookings" label="Total bookings" value={metrics.health.bookingsTotal} />
          <StatCard accent="health-users" label="Users" value={metrics.health.usersTotal} />
          <StatCard accent="health-approved" label="Approved drivers" value={metrics.health.driversApproved} />
          <StatCard accent="health-pending" label="Pending drivers" value={metrics.health.driversPending} />
        </div>
      </section>

      <section>
        <h2 className="admin-section-title">Search</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard accent="teal" label="Searches" value={metrics.search.total} />
          <StatCard
            accent={metrics.search.zeroResultRate === 0 ? "teal" : "danger"}
            label="Zero results"
            value={`${metrics.search.zeroResultRate}%`}
            valueClassName={metrics.search.zeroResultRate === 0 ? "admin-stat-value--teal" : "admin-stat-value--danger"}
            hint="May indicate bad place labels"
          />
          <StatCard
            accent="teal"
            label="Avg speed"
            value={`${metrics.search.avgDurationMs} ms`}
            valueClassName="admin-stat-value--speed"
          />
          <StatCard
            accent="warning"
            label="P95 speed"
            value={`${metrics.search.p95DurationMs} ms`}
            valueClassName="admin-stat-value--speed"
            hint="Slow tail — watch DB/API"
            hintClassName="admin-text-warning"
          />
        </div>
        {metrics.search.recent.length > 0 ? (
          <div className="admin-table-wrap mt-4">
            <table className="admin-table min-w-full text-left">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>From → To</th>
                  <th>Results</th>
                  <th>Ms</th>
                  <th>Ver</th>
                  <th>OK</th>
                </tr>
              </thead>
              <tbody>
                {metrics.search.recent.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="admin-text-teal">{row.userLabel ?? "—"}</td>
                    <td className="font-semibold text-white">
                      {row.fromQuery} → {row.toQuery}
                    </td>
                    <td>{row.resultCount}</td>
                    <td>{row.durationMs ?? "—"}</td>
                    <td>
                      {row.appVersion ? (
                        <span className="admin-badge admin-badge--teal">v{row.appVersion}</span>
                      ) : (
                        <span className="admin-text-muted">—</span>
                      )}
                    </td>
                    <td className={row.success ? "admin-text-teal" : "admin-text-danger"}>
                      {row.success ? "✓" : "✗"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="admin-section-title">PawaPay MoMo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            accent="teal"
            label="Deposits"
            value={`${metrics.payments.deposits.completed}/${metrics.payments.deposits.total}`}
            hint={`${metrics.payments.deposits.successRate}% success · ${metrics.payments.deposits.failed} failed · ${metrics.payments.deposits.pending} pending`}
            hintClassName={
              metrics.payments.deposits.successRate === 100 ? "admin-text-success-bold" : ""
            }
          />
          <StatCard
            accent="orange"
            label="Payouts"
            value={`${metrics.payments.payouts.completed}/${metrics.payments.payouts.total}`}
            hint={`${metrics.payments.payouts.successRate}% success · ${metrics.payments.payouts.disputed} disputed`}
            hintClassName={
              metrics.payments.payouts.disputed > 0 ? "admin-text-danger" : ""
            }
          />
          <StatCard
            accent="warning"
            label="Client timeouts"
            value={metrics.payments.clientEvents.timeout}
            hint="User waited 180s without completion"
            hintClassName="admin-text-warning"
          />
          <StatCard
            accent="danger"
            label="Client failures"
            value={metrics.payments.clientEvents.failed}
            hint={`${metrics.payments.clientEvents.initiated} initiated · ${metrics.payments.clientEvents.completed} completed`}
          />
        </div>
        {metrics.payments.byNetwork.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {metrics.payments.byNetwork.map((n) => (
              <span key={n.network} className="admin-chip-network">
                {n.network}: {n.completed}/{n.deposits}
              </span>
            ))}
          </div>
        ) : null}
        {metrics.payments.recent.length > 0 ? (
          <div className="admin-table-wrap mt-4">
            <table className="admin-table min-w-full text-left">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Network</th>
                  <th>Amount</th>
                  <th>Deposit</th>
                  <th>Payout</th>
                  <th>GPS</th>
                </tr>
              </thead>
              <tbody>
                {metrics.payments.recent.map((row) => (
                  <tr key={row.id}>
                    <td>{new Date(row.createdAt).toLocaleString()}</td>
                    <td>
                      <span className="admin-chip-network">{row.network}</span>
                    </td>
                    <td className="admin-text-gold">{row.grossAmount.toLocaleString()} RWF</td>
                    <td
                      className={
                        row.depositStatus === "completed"
                          ? "admin-text-teal"
                          : row.depositStatus === "failed"
                            ? "admin-text-danger"
                            : "admin-text-warning"
                      }
                    >
                      {row.depositStatus}
                    </td>
                    <td
                      className={
                        row.payoutStatus === "completed"
                          ? "admin-text-teal"
                          : row.payoutStatus === "failed"
                            ? "admin-text-danger"
                            : "admin-text-warning"
                      }
                    >
                      {row.payoutStatus}
                    </td>
                    <td className={row.gpsVerified ? "admin-text-teal" : "admin-text-muted"}>
                      {row.gpsVerified ? "✓" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {metrics.errors.total > 0 ? (
        <section>
          <h2 className="admin-section-title admin-text-danger">Client errors</h2>
          <div className="space-y-2">
            {metrics.errors.recent.map((err) => (
              <div key={err.id} className="admin-error-item px-4 py-3">
                <p className="text-xs font-bold admin-text-danger">
                  {err.context} · {new Date(err.createdAt).toLocaleString()}
                  {err.userLabel ? ` · ${err.userLabel}` : ""}
                  {err.appVersion ? (
                    <>
                      {" · "}
                      <span className="admin-badge admin-badge--teal">v{err.appVersion}</span>
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-sm font-semibold admin-text-muted">{err.message}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DocPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider admin-text-muted">{label}</p>
      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-[rgba(255,255,255,0.08)] bg-[#08111F]">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        ) : (
          <span className="px-2 text-center text-xs font-semibold text-white/40">Not uploaded</span>
        )}
      </div>
    </div>
  );
}
