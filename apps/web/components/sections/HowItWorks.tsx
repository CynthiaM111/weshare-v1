import Image from "next/image";
import { Reveal } from "../Reveal";
import { SectionLabel } from "../SectionLabel";
import { PlusRouteIcon, SearchIcon, SeatIcon } from "../icons/SiteIcons";

const STEPS = [
  {
    id: "search",
    title: "Search your route",
    desc: "Open Find Ride, type your From and To, and pick from Rwanda place suggestions on the map.",
    image: "/media/screenshots/search-places.png",
    alt: "Searching for Kigali destinations in WeShare",
    icon: SearchIcon,
  },
  {
    id: "book",
    title: "Post or pick a seat",
    desc: "Drivers post departure time, seats, and price. Passengers browse listings and book in a few taps.",
    image: "/media/screenshots/ride-detail.png",
    alt: "Ride listing with driver details and price per seat",
    icon: PlusRouteIcon,
  },
  {
    id: "pay",
    title: "Pay and ride together",
    desc: "Checkout with MTN or Airtel mobile money. Driver contact and plate unlock after booking.",
    image: "/media/screenshots/pay-mobile-money.png",
    alt: "Mobile money payment screen in WeShare",
    icon: SeatIcon,
  },
] as const;

export function HowItWorks() {
  return (
    <section id="how-it-works" className="ws-section ws-bg-paper">
      <div className="ws-container">
        <Reveal>
          <SectionLabel>How it works</SectionLabel>
          <h2 className="ws-headline ws-headline-lg mt-4 max-w-2xl">
            From search to shared seat.
          </h2>
          <p className="ws-lead mt-4 max-w-xl">
            No complicated menus. The flow mirrors how people already travel between
            Kigali, Musanze, Huye, and the rest of the country.
          </p>
        </Reveal>

        <ol className="mt-14 space-y-16 lg:mt-16 lg:space-y-20">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const reversed = i % 2 === 1;
            return (
              <Reveal key={step.id} delay={60} as="li">
                <div
                  className={`grid items-center gap-8 border-t border-navy-900/10 pt-12 lg:grid-cols-2 lg:gap-14 ${
                    reversed ? "lg:[&>*:first-child]:order-2" : ""
                  } ${i === 0 ? "border-t-0 pt-0" : ""}`}
                >
                  <div className={reversed ? "lg:pl-10" : "lg:pr-10"}>
                    <span className="inline-flex h-10 w-10 items-center justify-center border border-teal/35 bg-teal/10 text-teal">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-2xl font-bold text-navy-900 md:text-3xl">
                      {step.title}
                    </h3>
                    <p className="mt-3 max-w-md text-base leading-relaxed text-navy-900/65">
                      {step.desc}
                    </p>
                  </div>

                  <figure className="mx-auto w-full max-w-[260px] border border-navy-900/10 bg-navy-900 lg:max-w-[300px]">
                    <div className="relative aspect-[9/19] overflow-hidden">
                      <Image
                        src={step.image}
                        alt={step.alt}
                        fill
                        sizes="(max-width: 1024px) 260px, 300px"
                        className="object-cover object-top"
                      />
                    </div>
                  </figure>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </div>
    </section>
  );
}

export default HowItWorks;
