import { Reveal } from "../Reveal";
import { APP_DEMOS } from "@/lib/site-media";

export function AppShowcase() {
  return (
    <section id="app" className="ws-section border-t border-white/[0.06]">
      <div className="ws-container">
        <Reveal>
          <div className="max-w-2xl">
            <span className="ws-eyebrow">The app</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Built in Kigali. Ready for the road.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-white/65 sm:text-lg">
              Real screens from our internal build — search, book, pay with mobile money,
              and post rides from your phone.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid items-start gap-6 lg:grid-cols-2">
          {APP_DEMOS.map((demo, i) => (
            <Reveal key={demo.src} delay={(i + 1) * 80}>
              <figure className="ws-media-card flex flex-col self-start overflow-hidden">
                <div className="flex justify-center bg-[#0a1424] px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                  <div className="relative aspect-[9/16] w-full max-w-[320px]">
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
                <figcaption className="border-t border-white/[0.08] px-5 py-4">
                  <h3 className="text-base font-extrabold text-white">{demo.title}</h3>
                  <p className="mt-1 text-sm text-white/60">{demo.desc}</p>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default AppShowcase;
