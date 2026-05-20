import { Reveal } from "../Reveal";

export function OurStory() {
  return (
    <section
      id="our-story"
      className="relative overflow-hidden"
      style={{
        backgroundColor: "#0E1E35",
        paddingTop: 120,
        paddingBottom: 120,
      }}
    >
      {/* Subtle teal blob, top-right */}
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-teal"
        style={{
          width: 560,
          height: 560,
          top: "-220px",
          right: "-180px",
          opacity: 0.08,
        }}
      />

      <div className="ws-container relative z-10">
        {/* Heading */}
        <Reveal>
          <div className="text-center">
            <span className="ws-eyebrow">Our Story</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl md:text-5xl">
              Why we built WeShare.
            </h2>
          </div>
        </Reveal>

        {/* Two-column: story + pull quote */}
        <div className="mt-14 grid grid-cols-1 items-start gap-10 md:grid-cols-2 md:gap-12">
          <Reveal delay={100}>
            <div className="space-y-5 text-base leading-relaxed text-white/75 sm:text-[17px]">
              <p>
                Petrol prices in Rwanda have surged over 40% in recent years.
                For daily commuters and intercity travelers, this means
                transport costs now consume a disproportionate share of
                household income. Meanwhile, drivers making the same routes
                every day bear that fuel cost alone — even when their car has
                three empty seats.
              </p>
              <p>
                WeShare was born out of a simple frustration — too many empty
                seats on Rwanda&apos;s roads, and too many people struggling to
                find affordable, reliable transport between cities. We saw
                drivers making daily runs between Kigali and Musanze, Huye,
                Rubavu and beyond, with empty seats that passengers desperately
                needed.
              </p>
              <p>
                So we built the bridge. WeShare is Rwanda&apos;s first
                dedicated ride-sharing platform, connecting drivers and
                passengers through technology that&apos;s simple, safe, and
                built for how people actually travel in East Africa.
              </p>
              <p>
                We&apos;re starting in Rwanda, but our vision is bigger — to
                become the mobility layer that connects East Africa, one shared
                ride at a time.
              </p>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <figure
              className="relative rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderLeft: "4px solid #FF6B35",
                padding: "36px 32px 32px",
              }}
            >
              {/* Teal opening quotation mark */}
              <span
                aria-hidden="true"
                className="absolute -top-4 left-6 select-none font-black leading-none"
                style={{
                  color: "#00C9B1",
                  fontSize: 80,
                  textShadow: "0 6px 24px rgba(0,201,177,0.25)",
                }}
              >
                &ldquo;
              </span>

              <blockquote className="text-xl italic leading-snug text-white sm:text-2xl">
                Too many empty seats. Too many people without a ride. We built
                the bridge.
              </blockquote>
              <figcaption className="mt-6 text-sm font-semibold not-italic text-white/65">
                — Ephraim Byiringiro, CEO
              </figcaption>
            </figure>
          </Reveal>
        </div>

        {/* Mission */}
        <Reveal delay={300}>
          <div className="mt-20 text-center md:mt-24">
            <span className="ws-eyebrow">Our Mission</span>
            <h3
              className="mx-auto mt-4 max-w-3xl font-black tracking-tight text-white"
              style={{ fontSize: "clamp(28px, 4vw, 42px)", lineHeight: 1.1 }}
            >
              Make shared mobility the default way to travel across East
              Africa.
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-white/65">
              Affordable for passengers. Profitable for drivers. Better for
              everyone.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export default OurStory;
