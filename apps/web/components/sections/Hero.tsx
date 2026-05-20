import Image from "next/image";
import { GooglePlayIcon, AppleIcon } from "../icons/StoreIcons";
import { Reveal } from "../Reveal";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1600&q=80";

export function Hero() {
  return (
    <section
      id="top"
      className="relative isolate flex min-h-screen items-center overflow-hidden pt-16"
    >
      {/* Full-bleed background image with slow cinematic zoom */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 hero-zoom">
          <Image
            src={HERO_IMAGE}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        {/* Readability gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(8,17,31,0.85) 0%, rgba(8,17,31,0.72) 50%, rgba(8,17,31,0.96) 100%)",
          }}
        />
      </div>

      {/* Soft accent blobs over the photo */}
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-teal"
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
        className="ws-blob ws-blob-orange"
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
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
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

      <div className="ws-container relative z-10 py-16 md:py-24">
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
              🌍 Starting in Rwanda · Expanding across East Africa
            </p>
          </Reveal>
        </div>
      </div>

      {/* Bottom fade into next section */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
        style={{
          background:
            "linear-gradient(180deg, rgba(8,17,31,0) 0%, #08111F 100%)",
        }}
      />
    </section>
  );
}

export default Hero;
