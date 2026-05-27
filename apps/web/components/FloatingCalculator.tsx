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

const FACTS: string[] = [
  "🔥 Fuel prices up 40% since 2022",
  "🚗 Average Rwandan spends 35% of income on transport",
  "💡 Sharing 2 seats cuts your cost in half",
  "📈 WeShare saves users RWF 80,000+ per month",
];

const MIN_PASSENGERS = 1;
const MAX_PASSENGERS = 4;
// Below this width the calc is bottom-docked (see globals.css). Default to
// collapsed there so it doesn't cover content; expanded by default on desktop.
const COLLAPSE_BELOW = 1024;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100;
}

export function FloatingCalculator() {
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [routeId, setRouteId] = useState<string>(ROUTES[0].id);
  const [passengers, setPassengers] = useState<number>(2);
  const [factIndex, setFactIndex] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setCollapsed(window.innerWidth < COLLAPSE_BELOW);
    }
  }, []);

  useEffect(() => {
    if (collapsed) return;
    const id = window.setInterval(() => {
      setFactIndex((i) => (i + 1) % FACTS.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [collapsed]);

  const route = useMemo(
    () => ROUTES.find((r) => r.id === routeId) ?? ROUTES[0],
    [routeId],
  );
  const weShareFare = roundToHundred(route.taxi / passengers);
  const savings = Math.max(0, route.taxi - weShareFare);

  if (!mounted) return null;

  return (
    <aside
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
          <span>💰 Fare Calculator</span>
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
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5"
                style={{
                  background: "rgba(0,201,177,0.12)",
                  border: "1px solid rgba(0,201,177,0.30)",
                  color: "#00C9B1",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  lineHeight: 1,
                }}
              >
                <span
                  aria-hidden="true"
                  className="inline-block h-1 w-1 rounded-full"
                  style={{ background: "#00C9B1" }}
                />
                Live Calculator
              </span>
              <h3
                className="mt-2 text-white"
                style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}
              >
                💰 How much will you save?
              </h3>
            </div>

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
                  style={{
                    flex: 1,
                    textAlign: "center",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    fontVariantNumeric: "tabular-nums",
                  }}
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

            <div
              style={{
                background: "rgba(0,201,177,0.08)",
                border: "1px solid rgba(0,201,177,0.20)",
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div className="flex items-center justify-between">
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.60)" }}>
                  Private taxi
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "rgba(255,255,255,0.55)",
                    textDecoration: "line-through",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  RWF {fmt(route.taxi)}
                </span>
              </div>

              <div
                aria-hidden="true"
                className="my-2"
                style={{
                  height: 1,
                  background: "rgba(255,255,255,0.10)",
                }}
              />

              <div className="flex items-center justify-between">
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#00C9B1",
                  }}
                >
                  Your WeShare fare
                </span>
                <span
                  aria-live="polite"
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color: "#00C9B1",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  RWF {fmt(weShareFare)}
                </span>
              </div>

              <div className="mt-3 text-center">
                <span
                  style={{
                    display: "inline-block",
                    background: "rgba(0,201,177,0.15)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#00C9B1",
                  }}
                >
                  ✅ You save RWF {fmt(savings)} per trip
                </span>
              </div>
            </div>

            <p key={factIndex} className="ws-fact-text">
              {FACTS[factIndex]}
            </p>

            <a
              href="#download"
              className="ws-btn-primary"
              style={{
                height: 36,
                borderRadius: 10,
                fontSize: 12,
                fontWeight: 900,
                width: "100%",
                padding: 0,
                gap: 6,
              }}
            >
              Download &amp; Start Saving →
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}

export default FloatingCalculator;
