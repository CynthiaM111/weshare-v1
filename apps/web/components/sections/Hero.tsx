import { GooglePlayIcon, AppleIcon } from "../icons/StoreIcons";
import { Reveal } from "../Reveal";
import { HeroBackground, HERO_POSTER } from "./HeroBackground";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-screen items-center overflow-hidden pt-16"
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

      {/* Soft accent blobs over the video */}
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-teal pointer-events-none absolute z-[1]"
        style={{
          width: 520,
          height: 520,
          top: "-120px",
          left: "-120px",
          opacity: 0.12,
        }}
      />
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-orange pointer-events-none absolute z-[1]"
        style={{
          width: 600,
          height: 600,
          bottom: "-180px",
          right: "-160px",
          opacity: 0.1,
        }}
      />

      {/* Subtle grid */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[1] opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 70%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 70%)",
        }}
      />

      <div className="ws-container relative z-[1] py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="ws-eyebrow">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-teal" />
              Now in Rwanda
            </span>
          </Reveal>

          <Reveal delay={80}>
            <h1
              className="mt-5 font-black leading-[1.05] tracking-tight text-white"
              style={{ fontSize: "clamp(48px, 7vw, 80px)" }}
            >
              Split the Cost.{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #FF6B35, #F5C842)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Share the Ride.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/75 sm:text-lg">
              With fuel prices rising across Rwanda, WeShare lets drivers and
              passengers split travel costs fairly — making every journey more
              affordable for everyone on board.
            </p>
          </Reveal>

          <Reveal delay={240}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="#"
                className="ws-btn-primary h-12 px-6 text-[15px]"
                aria-label="Download on Android"
              >
                <GooglePlayIcon className="h-5 w-5" />
                Download on Android
              </a>
              <a
                href="#"
                className="ws-btn-outline h-12 px-6 text-[15px]"
                aria-label="Download on iOS"
              >
                <AppleIcon className="h-5 w-5" />
                Download on iOS
              </a>
            </div>
          </Reveal>

          <Reveal delay={320}>
            <p className="mt-6 text-sm text-white/60">
              Starting in Rwanda · Built for intercity travel
            </p>
          </Reveal>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-32"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,17,31,0) 0%, #08111F 100%)",
        }}
      />
    </section>
  );
}

export default Hero;
