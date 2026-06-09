"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

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

export default function AdminVerifyDriversPage() {
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

  useEffect(() => {
    void (async () => {
      const ok = await checkSession();
      if (ok) await loadQueue();
    })();
  }, [checkSession, loadQueue]);

  useEffect(() => {
    if (!authenticated) return;
    const id = window.setInterval(loadQueue, 30_000);
    return () => window.clearInterval(id);
  }, [authenticated, loadQueue]);

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
      <div className="flex min-h-screen items-center justify-center bg-navy">
        <p className="text-sm font-semibold text-white/60">Loading…</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen flex-col bg-navy">
        <header className="border-b border-white/10 px-6 py-5">
          <Link href="/" className="text-sm font-bold text-teal hover:underline">
            ← WeShare
          </Link>
        </header>
        <main className="flex flex-1 items-center justify-center px-6 py-16">
          <form
            onSubmit={onLogin}
            className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8"
          >
            <h1 className="text-xl font-black text-white">Admin access</h1>
            <p className="mt-2 text-sm font-semibold text-white/55">
              Enter the admin code to review driver verifications.
            </p>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wider text-white/45">
              Admin code
            </label>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-2 w-full rounded-xl border border-white/12 bg-white/5 px-4 py-3 text-lg font-bold tracking-[0.3em] text-white outline-none focus:border-teal/50"
              placeholder="••••"
              maxLength={8}
            />
            {authError ? <p className="mt-3 text-sm font-bold text-red-400">{authError}</p> : null}
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
    <div className="min-h-screen bg-navy">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 backdrop-blur-md">
        <div className="ws-container flex h-16 items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-black text-white">Verify drivers</h1>
            <p className="text-xs font-semibold text-white/50">WeShare admin</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void loadQueue()}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/80 hover:bg-white/5"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => void onLogout()}
              className="rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-white/60 hover:text-white"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="ws-container py-8">
        {alerts.length > 0 ? (
          <div
            className="mb-6 rounded-2xl border px-4 py-3"
            style={{ borderColor: "rgba(0,201,177,0.35)", background: "rgba(0,201,177,0.08)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-extrabold text-teal">New verification requests</p>
                {alerts.slice(0, 3).map((a) => (
                  <p key={a.id} className="mt-1 text-xs font-semibold text-white/70">
                    {a.message}
                  </p>
                ))}
              </div>
              <button
                type="button"
                onClick={() => void markAlertsRead()}
                className="shrink-0 text-xs font-bold text-teal hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {actionError ? (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300">
            {actionError}
          </p>
        ) : null}

        {loading && pending.length === 0 ? (
          <p className="text-center text-sm font-semibold text-white/50">Loading queue…</p>
        ) : null}

        {!loading && pending.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-8 py-16 text-center">
            <p className="text-2xl font-black text-teal">All caught up</p>
            <p className="mt-2 text-sm font-semibold text-white/55">No pending driver applications.</p>
            <p className="mt-4 text-xs font-semibold text-white/40">
              This page refreshes every 30 seconds. You&apos;ll see an on-site alert when someone applies.
            </p>
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-2">
          {pending.map((row) => (
            <article
              key={row.userId}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <h2 className="text-lg font-black text-white">{row.fullName}</h2>
              {row.phone ? (
                <p className="mt-1 text-sm font-semibold text-white/60">{row.phone}</p>
              ) : null}
              <p className="mt-2 text-sm font-bold text-teal">
                {row.carModel} · {row.carColor} · {row.licensePlate}
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
                  className="rounded-xl border border-red-500/40 px-4 py-2.5 text-sm font-extrabold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={acting === row.userId}
                  onClick={() => void review(row.userId, "approved")}
                  className="flex-1 rounded-xl py-2.5 text-sm font-extrabold text-white disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, #00c9b1, #00a896)" }}
                >
                  {acting === row.userId ? "Saving…" : "Approve driver"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </main>

      {rejectTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-2 p-6">
            <h3 className="text-lg font-black text-white">Decline verification</h3>
            <p className="mt-1 text-sm font-semibold text-white/55">
              Optional reason shown to the driver in the app.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mt-4 w-full rounded-xl border border-white/12 bg-white/5 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-teal/40"
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
                className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-extrabold text-white"
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

function DocPreview({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-white/40">{label}</p>
      <div className="relative flex h-32 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-black/20">
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
