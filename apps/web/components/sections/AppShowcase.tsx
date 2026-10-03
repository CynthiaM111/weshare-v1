import { Reveal } from "../Reveal";
import { SectionLabel } from "../SectionLabel";
import { APP_DEMOS } from "@/lib/site-media";

export function AppShowcase() {
  return (
    <section id="app" className="ws-section ws-bg-black">
      <div className="ws-container">
        <div className="flex flex-col gap-6 border-b border-white/[0.08] pb-10 lg:flex-row lg:items-end lg:justify-between">
          <Reveal>
            <div>
              <SectionLabel>The app</SectionLabel>
              <h2 className="ws-headline ws-headline-lg mt-4 max-w-xl">
                Built in Kigali.
                <br />
                Ready for the road.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={60}>
            <p className="ws-lead max-w-md lg:text-right">
              Real screens from our build — search routes, book seats, pay with
              mobile money, and post rides from your phone.
            </p>
          </Reveal>
        </div>

        <div className="mt-12 space-y-16 lg:space-y-20">
          {APP_DEMOS.map((demo, i) => {
            const reversed = i % 2 === 1;
            return (
              <Reveal key={demo.src} delay={80}>
                <figure
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                    reversed ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div
                    className={`flex justify-center bg-black-ink px-4 py-6 sm:px-8 ${
                      reversed ? "lg:justify-start" : "lg:justify-end"
                    }`}
                  >
                    <div className="relative aspect-[9/16] w-full max-w-[280px] border border-white/10 bg-[#0a1424]">
                      <video
                        className="absolute inset-0 h-full w-full object-contain"
                        controls
                        playsInline
                        preload="metadata"
                        poster={demo.poster}
                      >
                        <source src={demo.src} type="video/mp4" />
                      </video>
                    </div>
                  </div>
                  <figcaption className={reversed ? "lg:pr-8" : "lg:pl-8"}>
                    <h3 className="font-display text-2xl font-bold text-white">{demo.title}</h3>
                    <p className="mt-3 max-w-sm text-base leading-relaxed text-white/60">{demo.desc}</p>
                  </figcaption>
                </figure>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AppShowcase;
