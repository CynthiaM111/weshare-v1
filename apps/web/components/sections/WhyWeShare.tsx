import type { ComponentType } from "react";
import { Reveal } from "../Reveal";
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
    <section id="why-weshare" className="ws-section border-t border-white/[0.06] bg-[#0a1528]">
      <div className="ws-container">
        <Reveal>
          <div className="max-w-2xl">
            <span className="ws-eyebrow">Why WeShare</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Shared mobility that fits Rwanda.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/65">
              Not another ride-hailing clone — a way to fill seats on trips people
              are already making, with mobile money built in from day one.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 divide-y divide-white/[0.08] border-y border-white/[0.08]">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.label} delay={(i % 3) * 60}>
                <div className="grid gap-4 py-6 sm:grid-cols-[auto_1fr] sm:gap-6 sm:py-7">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-teal">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">{f.label}</h3>
                    <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/60">
                      {f.desc}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default WhyWeShare;
