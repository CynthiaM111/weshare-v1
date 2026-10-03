import type { ComponentType } from "react";
import { Reveal } from "../Reveal";
import { SectionLabel } from "../SectionLabel";
import {
  PhoneIcon,
  PinIcon,
  RouteIcon,
  ShieldCheckIcon,
  UsersIcon,
  WalletIcon,
} from "../icons/SiteIcons";

type Feature = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  desc: string;
};

const FEATURES: Feature[] = [
  {
    icon: WalletIcon,
    label: "Split fuel costs fairly",
    desc: "Drivers set a per-seat price. Passengers pay their share — no hidden multipliers.",
  },
  {
    icon: PinIcon,
    label: "GPS-verified pickup & drop-off",
    desc: "Routes are pinned on the map so rides start and finish where both sides agreed.",
  },
  {
    icon: PhoneIcon,
    label: "Phone-verified accounts",
    desc: "Every user signs in with an SMS code before booking or posting.",
  },
  {
    icon: ShieldCheckIcon,
    label: "Verified drivers",
    desc: "Drivers submit vehicle details for review before they can offer rides.",
  },
  {
    icon: RouteIcon,
    label: "Intercity routes people already take",
    desc: "Built around Kigali ↔ Musanze, Huye, Rubavu, and other corridors Rwandans use daily.",
  },
  {
    icon: UsersIcon,
    label: "Empty seats become savings",
    desc: "When a driver already has spare seats, filling them lowers cost for everyone.",
  },
];

export function WhyWeShare() {
  return (
    <section id="why-weshare" className="ws-section ws-bg-black">
      <div className="ws-container">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28 lg:self-start">
              <SectionLabel>Why WeShare</SectionLabel>
              <h2 className="ws-headline ws-headline-lg mt-4">
                Shared mobility that fits Rwanda.
              </h2>
              <p className="ws-lead mt-5">
                Not another ride-hailing clone — a way to fill seats on trips people
                are already making, with mobile money built in from day one.
              </p>
            </div>
          </Reveal>

          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.label} delay={(i % 2) * 40}>
                  <div className="group grid gap-4 py-7 sm:grid-cols-[48px_1fr] sm:gap-6">
                    <div className="flex h-10 w-10 items-center justify-center border border-white/10 text-teal transition-colors group-hover:border-teal/40 group-hover:bg-teal/5">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-semibold text-white">{f.label}</h3>
                      <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/55">{f.desc}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default WhyWeShare;
