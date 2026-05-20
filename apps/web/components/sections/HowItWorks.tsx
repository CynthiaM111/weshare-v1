import type { ReactNode } from "react";
import { Reveal } from "../Reveal";

type Step = {
  title: string;
  desc: string;
  tint: "teal" | "orange";
  icon: ReactNode;
};

const STEPS: Step[] = [
  {
    title: "Post a Ride",
    desc: "Drivers post their route, departure time, available seats and price per seat.",
    tint: "teal",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M5 18h14l-1.5-5h-11L5 18Z" />
        <path d="M7 13l1.4-4.2A2 2 0 0 1 10.3 7.5h3.4a2 2 0 0 1 1.9 1.3L17 13" />
        <circle cx="7.5" cy="18" r="1.5" />
        <circle cx="16.5" cy="18" r="1.5" />
      </svg>
    ),
  },
  {
    title: "Find & Book",
    desc: "Passengers search by city, pick a ride that fits their schedule, and request a seat.",
    tint: "orange",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <circle cx="11" cy="11" r="6" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    ),
  },
  {
    title: "Ride Together",
    desc: "Meet at the pickup point, split the fuel cost fairly with your driver, and travel together — everyone saves.",
    tint: "teal",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
        <path d="M5 13c1.4-.8 3-.8 4.5 0L12 14.5l2.5-1.5c1.5-.8 3.1-.8 4.5 0" />
        <path d="M9 11.5 11.5 9l2.5 2.5" />
        <path d="m7 17 3 3 2-1.5 2 1.5 3-3" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="ws-section relative">
      <div className="ws-container">
        <Reveal>
          <div className="text-center">
            <span className="ws-eyebrow">How it works</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
              Three simple steps to cut your transport costs in half.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/65">
              Whether you&apos;re behind the wheel or in the back seat, WeShare
              gets you from A to B without the headaches.
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <Reveal key={step.title} delay={(i + 1) * 100}>
              <article className="ws-card group relative overflow-hidden p-7 h-full">
                <div className="mb-6 flex items-center justify-between">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor:
                        step.tint === "teal"
                          ? "rgba(0,201,177,0.14)"
                          : "rgba(255,107,53,0.14)",
                      color: step.tint === "teal" ? "#00C9B1" : "#FF6B35",
                    }}
                  >
                    {step.icon}
                  </div>
                  <span className="text-xs font-extrabold text-white/40 tabular-nums">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="text-xl font-black tracking-tight text-white">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-white/65">
                  {step.desc}
                </p>

                {/* subtle hover wash */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                  style={{
                    background:
                      step.tint === "teal"
                        ? "radial-gradient(600px 200px at 0% 0%, rgba(0,201,177,0.08), transparent 60%)"
                        : "radial-gradient(600px 200px at 100% 0%, rgba(255,107,53,0.08), transparent 60%)",
                  }}
                />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
