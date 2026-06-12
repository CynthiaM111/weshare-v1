import Image from "next/image";
import { Reveal } from "../Reveal";
import { PlusRouteIcon, SearchIcon, SeatIcon } from "../icons/SiteIcons";

const STEPS = [
  {
    num: "01",
    title: "Search your route",
    desc: "Open Find Ride, type your From and To, and pick from Rwanda place suggestions on the map.",
    image: "/media/screenshots/search-places.png",
    alt: "Searching for Kigali destinations in WeShare",
    icon: SearchIcon,
  },
  {
    num: "02",
    title: "Post or pick a seat",
    desc: "Drivers post departure time, seats, and price. Passengers browse listings and book in a few taps.",
    image: "/media/screenshots/ride-detail.png",
    alt: "Ride listing with driver details and price per seat",
    icon: PlusRouteIcon,
  },
  {
    num: "03",
    title: "Pay and ride together",
    desc: "Checkout with MTN or Airtel mobile money. Driver contact and plate unlock after booking.",
    image: "/media/screenshots/pay-mobile-money.png",
    alt: "Mobile money payment screen in WeShare",
    icon: SeatIcon,
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="ws-section border-t border-white/[0.06]">
      <div className="ws-container">
        <Reveal>
          <div className="max-w-2xl">
            <span className="ws-eyebrow">How it works</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Three steps from search to shared seat.
            </h2>
            <p className="mt-4 text-base text-white/65">
              No complicated menus — the flow mirrors how people already travel
              between Kigali, Musanze, Huye, and the rest of the country.
            </p>
          </div>
        </Reveal>

        <ol className="mt-14 space-y-16 lg:space-y-24">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const reversed = i % 2 === 1;
            return (
              <Reveal key={step.num} delay={80}>
                <li
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                    reversed ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-extrabold tabular-nums tracking-widest text-white/35">
                        {step.num}
                      </span>
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-teal/25 bg-teal/10 text-teal">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <h3 className="mt-4 text-2xl font-black tracking-tight text-white">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-white/65">
                      {step.desc}
                    </p>
                  </div>

                  <figure className="ws-phone-frame mx-auto w-full max-w-[280px] lg:max-w-none lg:justify-self-center">
                    <div className="relative aspect-[9/19] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0a1424] shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
                      <Image
                        src={step.image}
                        alt={step.alt}
                        fill
                        sizes="(max-width: 1024px) 280px, 320px"
                        className="object-cover object-top"
                      />
                    </div>
                  </figure>
                </li>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
