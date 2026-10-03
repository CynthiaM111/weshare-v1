import { GooglePlayIcon, AppleIcon } from "../icons/StoreIcons";
import { SectionLabel } from "../SectionLabel";
import { Reveal } from "../Reveal";
import { HeroBackground, HERO_POSTER } from "./HeroBackground";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-[92vh] items-end overflow-hidden pt-[104px] md:items-center md:pt-24"
    >
      <div className="pointer-events-none absolute inset-0 z-0">
        <noscript>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${HERO_POSTER})` }}
            aria-hidden="true"
          />
        </noscript>
        <HeroBackground />
        <div className="hero-bg-overlay" aria-hidden="true" />
      </div>

      {/* Route grid — fades toward content */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] ws-route-grid opacity-60"
        style={{
          maskImage: "linear-gradient(105deg, black 20%, transparent 70%)",
          WebkitMaskImage: "linear-gradient(105deg, black 20%, transparent 70%)",
        }}
      />

      <div className="ws-container relative z-[2] pb-16 pt-8 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
          <div className="max-w-2xl">
            <Reveal>
              <SectionLabel>Now in Rwanda</SectionLabel>
            </Reveal>

            <Reveal delay={60}>
              <h1 className="ws-headline ws-headline-xl mt-5">
                Split the cost.
                <br />
                <span className="text-accent">Share the ride.</span>
              </h1>
            </Reveal>

            <Reveal delay={120}>
              <p className="ws-lead mt-6 max-w-lg">
                With fuel prices rising across Rwanda, WeShare lets drivers and
                passengers split travel costs fairly — making every journey more
                affordable for everyone on board.
              </p>
            </Reveal>

            <Reveal delay={180}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href="#download"
                  className="ws-btn-primary"
                  aria-label="Download on Android"
                >
                  <GooglePlayIcon className="h-5 w-5" />
                  Download on Android
                </a>
                <a
                  href="#download"
                  className="ws-btn-secondary"
                  aria-label="Download on iOS"
                >
                  <AppleIcon className="h-5 w-5" />
                  iOS — coming soon
                </a>
              </div>
            </Reveal>
          </div>

          <Reveal delay={240} className="hidden lg:block">
            <div className="ws-panel ws-panel-accent-left p-6">
              <p className="ws-section-label !text-white/50">On the road today</p>
              <ul className="mt-5 space-y-4 border-t border-white/[0.08] pt-5">
                {[
                  ["Kigali → Musanze", "From RWF 5,000/seat"],
                  ["Kigali → Huye", "From RWF 4,000/seat"],
                  ["Kigali → Rubavu", "From RWF 6,000/seat"],
                ].map(([route, fare]) => (
                  <li
                    key={route}
                    className="flex items-baseline justify-between gap-4 border-b border-dashed border-white/[0.08] pb-4 last:border-0 last:pb-0"
                  >
                    <span className="font-display text-lg font-semibold text-white">{route}</span>
                    <span className="shrink-0 text-sm font-medium text-teal">{fare}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-white/45">
                Estimates from the fare calculator — actual prices set by drivers.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={300}>
          <p className="mt-10 text-xs font-medium uppercase tracking-[0.16em] text-white/40">
            Starting in Rwanda · Built for corridors people already travel
          </p>
        </Reveal>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-black to-transparent"
      />
    </section>
  );
}

export default Hero;
