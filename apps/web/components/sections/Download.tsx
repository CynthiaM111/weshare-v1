import type { ReactNode } from "react";
import QRCode from "qrcode";
import { AppleIcon, GooglePlayIcon } from "../icons/StoreIcons";
import { SectionLabel } from "../SectionLabel";
import { Reveal } from "../Reveal";

const PLAY_URL = "https://play.google.com/store";
const APPLE_URL = "https://apps.apple.com";

const PERKS = [
  "Free to download",
  "Pay per ride — no subscription",
  "MTN & Airtel mobile money built in",
] as const;

async function makeQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 128,
    color: { dark: "#08111F", light: "#FFFFFF" },
  });
}

export async function Download() {
  const [playSvg, appleSvg] = await Promise.all([
    makeQrSvg(PLAY_URL),
    makeQrSvg(APPLE_URL),
  ]);

  return (
    <section id="download" className="ws-section relative overflow-hidden ws-bg-black">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 ws-route-grid opacity-30"
        style={{
          maskImage: "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)",
          WebkitMaskImage:
            "linear-gradient(180deg, transparent, black 30%, black 70%, transparent)",
        }}
      />

      <div className="ws-container relative">
        <Reveal>
          <SectionLabel>Download</SectionLabel>
          <h2 className="ws-headline ws-headline-xl mt-4 max-w-3xl">
            Install <span className="text-accent">WeShare</span>
            <br className="hidden sm:block" />
            {" "}and share the road.
          </h2>
        </Reveal>

        <Reveal delay={80}>
          <div className="ws-download-card mt-10 overflow-hidden lg:mt-12">
            <div className="grid lg:grid-cols-[minmax(0,1fr)_280px]">
              {/* Copy + store links */}
              <div className="border-b border-white/[0.08] p-6 sm:p-8 lg:border-b-0 lg:border-r lg:border-white/[0.08]">
                <p className="max-w-md text-base leading-relaxed text-white/65 sm:text-lg">
                  Android is live today. iOS is on the way. Search routes, book a seat,
                  and pay with mobile money — all from your phone.
                </p>

                <ul className="mt-6 space-y-2.5">
                  {PERKS.map((perk) => (
                    <li key={perk} className="ws-download-perk">
                      {perk}
                    </li>
                  ))}
                </ul>

                <div className="mt-8 space-y-3">
                  <StoreLink
                    href={PLAY_URL}
                    label="Get it on"
                    store="Google Play"
                    icon={<GooglePlayIcon className="h-7 w-7 shrink-0" />}
                    active
                  />
                  <StoreLink
                    label="Coming soon"
                    store="App Store"
                    icon={<AppleIcon className="h-7 w-7 shrink-0" />}
                    disabled
                  />
                </div>
              </div>

              {/* QR codes */}
              <div className="grid grid-cols-2 divide-x divide-white/[0.08] bg-black/40 lg:grid-cols-1 lg:divide-x-0 lg:divide-y lg:divide-white/[0.08]">
                <QrCell label="Android" sublabel="Scan to install" svgMarkup={playSvg} />
                <QrCell label="iOS" sublabel="Coming soon" svgMarkup={appleSvg} muted />
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={140}>
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.14em] text-white/35">
            Available in Rwanda · Built for intercity travel
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function StoreLink({
  href,
  label,
  store,
  icon,
  active = false,
  disabled = false,
}: {
  href?: string;
  label: string;
  store: string;
  icon: ReactNode;
  active?: boolean;
  disabled?: boolean;
}) {
  const className = `ws-download-store group ${
    active ? "ws-download-store--active" : ""
  } ${disabled ? "ws-download-store--soon" : ""}`;

  const inner = (
    <>
      {icon}
      <span className="flex flex-col leading-tight">
        <span
          className={`text-[10px] font-medium uppercase tracking-[0.14em] ${
            active ? "text-white/75" : "text-white/45"
          }`}
        >
          {label}
        </span>
        <span className="font-display text-lg font-bold text-white">{store}</span>
      </span>
      {active && (
        <span
          aria-hidden="true"
          className="ml-auto text-lg text-white/70 transition-transform duration-200 group-hover:translate-x-0.5"
        >
          →
        </span>
      )}
    </>
  );

  if (disabled || !href) {
    return (
      <span aria-label={`${store} — ${label}`} className={className} tabIndex={-1}>
        {inner}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} ${store}`}
      className={className}
    >
      {inner}
    </a>
  );
}

function QrCell({
  label,
  sublabel,
  svgMarkup,
  muted = false,
}: {
  label: string;
  sublabel: string;
  svgMarkup: string;
  muted?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
        {sublabel}
      </p>
      <div
        className={`mt-3 border bg-white p-2.5 ${muted ? "opacity-50" : ""}`}
        style={{ borderColor: "rgba(255,255,255,0.12)" }}
      >
        <div
          aria-label={`QR code for ${label}`}
          role="img"
          className="block"
          style={{ width: 128, height: 128 }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>
      <p className="mt-3 font-display text-sm font-semibold text-white/70">{label}</p>
    </div>
  );
}

export default Download;
