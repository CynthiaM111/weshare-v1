import { Reveal } from "../Reveal";
import { SectionLabel } from "../SectionLabel";

type Stat = {
  value: string;
  label: string;
  accent: "accent" | "teal" | "gold";
};

const STATS: Stat[] = [
  {
    value: "60%",
    label: "Average savings vs. hiring a private taxi on intercity routes",
    accent: "accent",
  },
  {
    value: "3×",
    label: "More affordable than solo travel when seats are shared",
    accent: "teal",
  },
  {
    value: "0 RWF",
    label: "Surge pricing. No hidden fees. Pay what was agreed.",
    accent: "gold",
  },
];

const accentClass = {
  accent: { border: "border-accent", text: "text-accent" },
  teal: { border: "border-teal", text: "text-teal" },
  gold: { border: "border-gold", text: "text-gold" },
} as const;

export function Affordability() {
  return (
    <section id="affordability" className="ws-section ws-bg-paper">
      <div className="ws-container">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          <Reveal>
            <div>
              <SectionLabel>Why WeShare exists</SectionLabel>
              <h2 className="ws-headline ws-headline-lg mt-4">
                Fuel prices are rising.
                <br />
                Your transport costs don&apos;t have to.
              </h2>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <p className="ws-lead lg:pt-10">
              Every day, thousands of drivers make the same journey — Kigali to
              Musanze, Huye to Kigali, Rubavu to the capital — with empty seats.
              Every empty seat is fuel paid for twice. WeShare fills those seats,
              splits the bill, and puts money back in everyone&apos;s pocket.
            </p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-10 border-t border-white/[0.08] pt-14 sm:grid-cols-3 sm:gap-8">
          {STATS.map((s, i) => (
            <Reveal key={s.value} delay={100 + i * 60}>
              <div className={`ws-stat ${accentClass[s.accent].border}`}>
                <div className={`ws-stat-value ${accentClass[s.accent].text}`}>
                  {s.value}
                </div>
                <p className="ws-stat-label">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default Affordability;
