import { Reveal } from "../Reveal";

type Feature = {
  icon: string;
  label: string;
  desc: string;
};

const FEATURES: Feature[] = [
  { icon: "💰", label: "Split fuel costs fairly", desc: "Everyone pays their share — drivers save, passengers save." },
  { icon: "📍", label: "GPS-verified routes", desc: "Routes are pin-locked, no fake locations." },
  { icon: "🔒", label: "Phone-verified users", desc: "Every account starts with an SMS check." },
  { icon: "⚡", label: "No surge pricing, ever", desc: "Set fares with no rush-hour spikes or hidden multipliers." },
  { icon: "🇷🇼", label: "Built for Rwanda", desc: "Designed around how Rwandans actually travel." },
  { icon: "🌍", label: "Expanding East Africa", desc: "Coming next to Uganda, Burundi & Tanzania." },
  { icon: "🤝", label: "Fair cost-sharing model", desc: "Fares are priced by distance, then split across seats." },
];

const STAGGER = [100, 200, 300, 100, 200, 300, 100];

export function WhyWeShare() {
  return (
    <section
      id="why-weshare"
      className="ws-section relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, #08111F 0%, #0E1E35 60%, #08111F 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-teal"
        style={{ width: 480, height: 480, top: "20%", left: "-160px", opacity: 0.08 }}
      />
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-orange"
        style={{ width: 480, height: 480, bottom: "-200px", right: "-100px", opacity: 0.08 }}
      />

      <div className="ws-container relative z-10">
        <Reveal>
          <div className="text-center">
            <span className="ws-eyebrow">Why WeShare</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
              Built around how Rwandans really move.
            </h2>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.label} delay={STAGGER[i] ?? 100}>
              <div className="ws-card flex h-full items-start gap-4 p-5">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  aria-hidden="true"
                >
                  {f.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-white">{f.label}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/60">{f.desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default WhyWeShare;
