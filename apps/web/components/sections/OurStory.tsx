import { Reveal } from "../Reveal";
import { SectionLabel } from "../SectionLabel";

export function OurStory() {
  return (
    <section id="our-story" className="ws-section ws-bg-paper">
      <div className="ws-container">
        <Reveal>
          <SectionLabel>Our story</SectionLabel>
          <h2 className="ws-headline ws-headline-lg mt-4 max-w-3xl">
            Why we built WeShare.
          </h2>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:gap-16">
          <Reveal delay={80}>
            <div className="space-y-6 text-base leading-[1.75] text-navy-900/70 sm:text-[17px]">
              <p>
                Petrol prices in Rwanda have surged over 40% in recent years.
                For daily commuters and intercity travelers, transport costs now
                consume a disproportionate share of household income. Meanwhile,
                drivers making the same routes every day bear that fuel cost alone
                — even when their car has three empty seats.
              </p>
              <p>
                WeShare was born out of a simple frustration — too many empty seats
                on Rwanda&apos;s roads, and too many people struggling to find
                affordable, reliable transport between cities. We saw drivers making
                daily runs between Kigali and Musanze, Huye, Rubavu and beyond,
                with empty seats that passengers desperately needed.
              </p>
              <p>
                So we built the bridge. WeShare is Rwanda&apos;s first dedicated
                ride-sharing platform, connecting drivers and passengers through
                technology that&apos;s simple, safe, and built for how people
                actually travel in East Africa.
              </p>
              <p>
                We&apos;re starting in Rwanda, but our vision is bigger — to become
                the mobility layer that connects East Africa, one shared ride at a
                time.
              </p>
            </div>
          </Reveal>

          <Reveal delay={160}>
            <figure className="border border-navy-900/10 border-l-[3px] border-l-accent bg-navy-900 p-8 text-white lg:mt-8">
              <blockquote className="font-display text-xl font-medium leading-snug md:text-2xl">
                Too many empty seats. Too many people without a ride. We built the
                bridge.
              </blockquote>
              <figcaption className="mt-8 border-t border-white/10 pt-5 text-sm font-medium text-white/55">
                Ephraim Byiringiro
                <span className="mt-0.5 block text-teal">Chief Executive Officer</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>

        <Reveal delay={240}>
          <div className="mt-20 border-t border-white/[0.08] pt-16 lg:mt-24">
            <SectionLabel>Our mission</SectionLabel>
            <h3 className="ws-headline mt-4 max-w-4xl text-[clamp(1.75rem,3.5vw,2.625rem)]">
              Make shared mobility the default way to travel across East Africa.
            </h3>
            <p className="mt-4 max-w-xl text-navy-900/60">
              Affordable for passengers. Profitable for drivers. Better for everyone.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default OurStory;
