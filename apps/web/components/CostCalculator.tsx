"use client";

import { useMemo, useState } from "react";

type Route = { id: string; label: string; taxi: number };

const ROUTES: Route[] = [
  { id: "musanze", label: "Kigali → Musanze", taxi: 15000 },
  { id: "huye", label: "Kigali → Huye", taxi: 12000 },
  { id: "rubavu", label: "Kigali → Rubavu", taxi: 18000 },
  { id: "rwamagana", label: "Kigali → Rwamagana", taxi: 8000 },
  { id: "nyagatare", label: "Kigali → Nyagatare", taxi: 20000 },
];

const MIN_PASSENGERS = 1;
const MAX_PASSENGERS = 4;

function fmt(n: number): string {
  return n.toLocaleString("en-US");
}

export function CostCalculator() {
  const [routeId, setRouteId] = useState<string>(ROUTES[0].id);
  const [passengers, setPassengers] = useState<number>(2);

  const route = useMemo(
    () => ROUTES.find((r) => r.id === routeId) ?? ROUTES[0],
    [routeId],
  );

  const weShareFare = Math.round(route.taxi / passengers);
  const savings = Math.max(0, route.taxi - weShareFare);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.10)",
        borderRadius: 24,
        padding: 32,
      }}
    >
      <div className="text-center">
        <h3 className="text-xl font-black tracking-tight text-white sm:text-2xl">
          See how much you could save
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/55">
          Pick your route and how many of you are sharing the ride.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
        <div>
          <label htmlFor="ws-calc-route" className="ws-calc-label">
            Route
          </label>
          <select
            id="ws-calc-route"
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="ws-calc-input"
          >
            {ROUTES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="ws-calc-label">Passengers sharing</label>
          <div className="ws-calc-stepper">
            <button
              type="button"
              onClick={() =>
                setPassengers((p) => Math.max(MIN_PASSENGERS, p - 1))
              }
              disabled={passengers <= MIN_PASSENGERS}
              aria-label="Fewer passengers"
              className="ws-calc-step-btn"
            >
              −
            </button>
            <span className="ws-calc-step-value" aria-live="polite">
              {passengers}
            </span>
            <button
              type="button"
              onClick={() =>
                setPassengers((p) => Math.min(MAX_PASSENGERS, p + 1))
              }
              disabled={passengers >= MAX_PASSENGERS}
              aria-label="More passengers"
              className="ws-calc-step-btn"
            >
              +
            </button>
          </div>
        </div>

        <div>
          <label className="ws-calc-label">Estimated taxi fare</label>
          <div className="ws-calc-static">RWF {fmt(route.taxi)}</div>
        </div>
      </div>

      <div className="mt-8 border-t border-white/10 pt-8 text-center">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-white/45">
          Your estimated WeShare fare
        </p>
        <div
          className="mt-2 font-black leading-none tracking-tight"
          style={{
            color: "#00C9B1",
            fontSize: "clamp(36px, 5vw, 56px)",
            fontVariantNumeric: "tabular-nums",
          }}
          aria-live="polite"
        >
          RWF {fmt(weShareFare)}
        </div>
        <p className="mt-3 text-sm text-white/65 sm:text-base">
          You save approximately{" "}
          <span className="font-bold text-white/85">RWF {fmt(savings)}</span>{" "}
          compared to a private taxi
        </p>
      </div>
    </div>
  );
}

export default CostCalculator;
