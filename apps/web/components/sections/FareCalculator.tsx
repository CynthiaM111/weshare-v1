"use client";

import { useEffect, useMemo, useState } from "react";

type Route = { id: string; label: string; taxi: number };

const ROUTES: Route[] = [
  { id: "musanze", label: "Kigali → Musanze", taxi: 15000 },
  { id: "huye", label: "Kigali → Huye", taxi: 12000 },
  { id: "rubavu", label: "Kigali → Rubavu", taxi: 18000 },
  { id: "rwamagana", label: "Kigali → Rwamagana", taxi: 6000 },
  { id: "nyagatare", label: "Kigali → Nyagatare", taxi: 22000 },
  { id: "nyanza", label: "Kigali → Nyanza", taxi: 9000 },
  { id: "muhanga", label: "Kigali → Muhanga", taxi: 7000 },
  { id: "kibuye", label: "Kigali → Kibuye/Karongi", taxi: 14000 },
];

const MIN_PASSENGERS = 1;
const MAX_PASSENGERS = 4;
const COLLAPSE_BELOW = 1024;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

export function FareCalculator() {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [routeId, setRouteId] = useState<string>(ROUTES[0].id);
  const [passengers, setPassengers] = useState<number>(2);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setCollapsed(window.innerWidth < COLLAPSE_BELOW);
    }
  }, []);

  const route = useMemo(
    () => ROUTES.find((r) => r.id === routeId) ?? ROUTES[0],
    [routeId],
  );
  const weShareFare = roundToHundred(route.taxi / passengers);
  const savings = Math.max(0, route.taxi - weShareFare);

  if (!mounted) return null;

  return (
    <aside
      id="calculator"
      aria-label="WeShare fare calculator"
      className="ws-floating-calc"
    >
      <div
        className="ws-floating-calc-inner"
        style={{ padding: collapsed ? "14px 16px" : 20 }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
          aria-controls="ws-calc-body"
          className="ws-fc-toggle"
        >
          <span>Fare estimate</span>
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              color: "rgba(255,255,255,0.75)",
              transform: collapsed ? "rotate(0deg)" : "rotate(180deg)",
              transition: "transform 0.25s ease",
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {!collapsed && (
          <div id="ws-calc-body" className="mt-4 space-y-4">
            <div>
              <label htmlFor="ws-fc-route" className="ws-fc-label">
                Your route
              </label>
              <select
                id="ws-fc-route"
                value={routeId}
                onChange={(e) => setRouteId(e.target.value)}
                className="ws-fc-select"
              >
                {ROUTES.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label} (RWF {fmt(r.taxi)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="ws-fc-label">Sharing with</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPassengers((p) => Math.max(MIN_PASSENGERS, p - 1))
                  }
                  disabled={passengers <= MIN_PASSENGERS}
                  aria-label="Fewer passengers"
                  className="ws-fc-step"
                >
                  −
                </button>
                <div
                  aria-live="polite"
                  className="flex-1 text-center text-sm font-extrabold tabular-nums text-white"
                >
                  {passengers} passenger{passengers === 1 ? "" : "s"}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPassengers((p) => Math.min(MAX_PASSENGERS, p + 1))
                  }
                  disabled={passengers >= MAX_PASSENGERS}
                  aria-label="More passengers"
                  className="ws-fc-step"
                >
                  +
                </button>
              </div>
            </div>

            <div className="space-y-3 border-t border-white/[0.08] pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/55">Private taxi</span>
                <span className="tabular-nums text-white/45 line-through">
                  RWF {fmt(route.taxi)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-teal">WeShare per seat</span>
                <span
                  aria-live="polite"
                  className="text-lg font-black tabular-nums text-teal"
                >
                  RWF {fmt(weShareFare)}
                </span>
              </div>
              <p className="rounded-lg bg-teal/10 px-3 py-2 text-center text-xs font-semibold text-teal">
                You save about RWF {fmt(savings)} on this trip
              </p>
            </div>

            <a href="#download" className="ws-btn-primary h-10 w-full text-xs">
              Download the app
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}

export default FareCalculator;
