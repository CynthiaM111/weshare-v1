"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type SessionState = {
  authenticated: boolean;
  pendingVerifications?: number;
  unreadAlerts?: number;
};

export function AdminSiteNotifier() {
  const [session, setSession] = useState<SessionState>({ authenticated: false });
  const [alertDismissed, setAlertDismissed] = useState(false);
  const prevPending = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/session", { cache: "no-store" });
      const data = (await res.json()) as SessionState;
      setSession(data);

      if (
        data.authenticated &&
        typeof data.pendingVerifications === "number" &&
        data.pendingVerifications > prevPending.current &&
        prevPending.current > 0
      ) {
        setAlertDismissed(false);
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          new Notification("WeShare admin", {
            body: `${data.pendingVerifications} driver verification(s) waiting for review.`,
          });
        }
      }
      if (typeof data.pendingVerifications === "number") {
        prevPending.current = data.pendingVerifications;
      }
    } catch {
      setSession({ authenticated: false });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  // Logged-in admins always get a small dashboard shortcut (no code re-entry).
  if (session.authenticated) {
    const pending = session.pendingVerifications ?? 0;
    const unread = session.unreadAlerts ?? 0;
    const hasUrgent = pending > 0 || unread > 0;

    if (hasUrgent && !alertDismissed) {
      return (
        <div
          className="fixed bottom-4 left-4 right-4 z-[100] mx-auto flex max-w-lg items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-2xl sm:left-auto sm:right-6"
          style={{
            backgroundColor: "rgba(14, 30, 53, 0.96)",
            borderColor: "rgba(0, 201, 177, 0.35)",
            boxShadow: "0 16px 48px rgba(0,0,0,0.45)",
          }}
          role="status"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-extrabold text-teal">Driver verification</p>
            <p className="text-xs font-semibold text-white/70">
              {pending > 0
                ? `${pending} application${pending === 1 ? "" : "s"} waiting for review`
                : `${unread} new notification${unread === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/admin/verify-drivers"
              className="rounded-full px-4 py-2 text-xs font-extrabold text-white"
              style={{ background: "linear-gradient(135deg, #00c9b1, #00a896)" }}
            >
              Review
            </Link>
            <button
              type="button"
              onClick={() => setAlertDismissed(true)}
              className="rounded-full px-2 py-1 text-lg leading-none text-white/50 hover:text-white"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      );
    }

    return (
      <Link
        href="/admin/verify-drivers"
        className="fixed bottom-5 right-5 z-[100] flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-extrabold shadow-lg transition-transform hover:scale-[1.02]"
        style={{
          backgroundColor: "rgba(14, 30, 53, 0.96)",
          borderColor: hasUrgent ? "rgba(0, 201, 177, 0.5)" : "rgba(255,255,255,0.12)",
          color: hasUrgent ? "#00c9b1" : "rgba(255,255,255,0.85)",
        }}
      >
        {hasUrgent ? (
          <span
            className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-black text-navy"
            style={{ background: "#00c9b1" }}
          >
            {pending || unread}
          </span>
        ) : null}
        Admin dashboard
      </Link>
    );
  }

  return null;
}
