import type { ReactNode } from "react";
import { CostCalculator } from "../CostCalculator";
import { Reveal } from "../Reveal";

type Tone = "orange" | "teal" | "gold";

type Stat = {
  number: string;
  label: string;
  tone: Tone;
  delay: number;
};

const STATS: Stat[] = [
  {
    number: "60%",
    label: "Average savings compared to hiring a private taxi",
    tone: "orange",
    delay: 100,
  },
  {
    number: "3x",
    label: "More affordable than solo travel when seats are shared",
    tone: "teal",
    delay: 200,
  },
  {
    number: "0 RWF",
    label: "No surge pricing. No hidden fees. Pay what's agreed.",
    tone: "gold",
    delay: 300,
  },
];

function toneStyle(tone: Tone): React.CSSProperties {
  if (tone === "orange") {
    return {
      background: "linear-gradient(135deg, #FF6B35, #F5C842)",
      WebkitBackgroundClip: "text",
      backgroundClip: "text",
      color: "transparent",
    };
  }
  if (tone === "teal") return { color: "#00C9B1" };
  return { color: "#F5C842" };
}

export function Affordability() {
  return (
    <section
      id="affordability"
      className="relative overflow-hidden ws-section"
      style={{ backgroundColor: "#08111F" }}
    >
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-orange"
        style={{
          width: 520,
          height: 520,
          top: "-180px",
          right: "-200px",
          opacity: 0.08,
        }}
      />
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-teal"
        style={{
          width: 460,
          height: 460,
          bottom: "-160px",
          left: "-180px",
          opacity: 0.08,
        }}
      />

      <div className="ws-container relative z-10">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <span className="ws-eyebrow">Why WeShare Exists</span>
            <h2
              className="mt-4 font-black tracking-tight text-white"
              style={{ fontSize: "clamp(32px, 5vw, 52px)", lineHeight: 1.08 }}
            >
              Fuel prices are rising. Your transport costs don&apos;t have to.
            </h2>
            <p className="mt-6 text-base leading-relaxed text-white/70 sm:text-lg">
              Every day, thousands of drivers make the same journey — Kigali to
              Musanze, Huye to Kigali, Rubavu to the capital — with empty
              seats. Every empty seat is a wasted cost. WeShare fills those
              seats, splits the fuel bill, and puts money back in
              everyone&apos;s pocket.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STATS.map((s) => (
            <Reveal key={s.number} delay={s.delay}>
              <StatCard stat={s} />
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <div className="mt-12">
            <CostCalculator />
          </div>
        </Reveal>

        <Reveal delay={300}>
          <div
            className="mt-12 text-center text-white"
            style={{
              background: "linear-gradient(135deg, #FF6B35 0%, #FF4500 100%)",
              borderRadius: 16,
              padding: "24px 32px",
              fontSize: "clamp(16px, 1.8vw, 22px)",
              fontWeight: 700,
              lineHeight: 1.35,
              boxShadow: "0 14px 40px rgba(255,107,53,0.25)",
            }}
          >
            🚗 Every empty seat on Rwanda&apos;s roads is a missed opportunity
            to save. WeShare fills the gap.
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StatCard({ stat }: { stat: Stat }): ReactNode {
  return (
    <div
      className="h-full text-center"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 20,
        padding: 32,
        transition: "all 0.25s var(--ease)",
      }}
    >
      <div
        className="font-black leading-none tracking-tight"
        style={{
          fontSize: "clamp(48px, 6vw, 72px)",
          fontVariantNumeric: "tabular-nums",
          ...toneStyle(stat.tone),
        }}
      >
        {stat.number}
      </div>
      <p className="mx-auto mt-5 max-w-[260px] text-sm leading-relaxed text-white/65 sm:text-base">
        {stat.label}
      </p>
    </div>
  );
}

export default Affordability;
