import QRCode from "qrcode";
import { AppleIcon, GooglePlayIcon } from "../icons/StoreIcons";
import { Reveal } from "../Reveal";

const PLAY_URL = "https://play.google.com/store";
const APPLE_URL = "https://apps.apple.com";

async function makeQrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    width: 160,
    color: { dark: "#08111F", light: "#FFFFFF" },
  });
}

export async function Download() {
  const [playSvg, appleSvg] = await Promise.all([
    makeQrSvg(PLAY_URL),
    makeQrSvg(APPLE_URL),
  ]);

  return (
    <section
      id="download"
      className="relative overflow-hidden py-24 md:py-32"
      style={{
        background:
          "linear-gradient(180deg, #00C9B1 -40%, #0E1E35 50%, #08111F 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-teal"
        style={{ width: 520, height: 520, top: "-200px", right: "-160px", opacity: 0.18 }}
      />
      <div
        aria-hidden="true"
        className="ws-blob ws-blob-orange"
        style={{ width: 460, height: 460, bottom: "-180px", left: "-120px", opacity: 0.18 }}
      />

      <div className="ws-container relative z-10 text-center">
        <Reveal>
          <span className="ws-eyebrow">Download</span>
          <h2
            className="mx-auto mt-3 max-w-3xl font-black tracking-tight text-white"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.05 }}
          >
            Get WeShare on your phone.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/70 sm:text-lg">
            Available on Android and iOS now.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={PLAY_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Get WeShare on Google Play"
              className="ws-btn-primary inline-flex h-16 min-w-[230px] items-center justify-start gap-3 rounded-2xl px-6 text-left"
            >
              <GooglePlayIcon className="h-8 w-8 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                  Get it on
                </span>
                <span className="text-lg font-black">Google Play</span>
              </span>
            </a>

            <a
              href="#"
              aria-label="App Store — Coming soon"
              className="ws-btn-outline inline-flex h-16 min-w-[230px] cursor-not-allowed items-center justify-start gap-3 rounded-2xl px-6 text-left opacity-75"
              tabIndex={-1}
            >
              <AppleIcon className="h-8 w-8 shrink-0" />
              <span className="flex flex-col leading-tight">
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                  Coming Soon
                </span>
                <span className="text-lg font-black">App Store</span>
              </span>
            </a>
          </div>
        </Reveal>

        {/* QR codes */}
        <Reveal delay={220}>
          <div className="mt-12 flex flex-col items-center justify-center gap-8 sm:flex-row sm:gap-12">
            <QrCard label="Scan for Android" svgMarkup={playSvg} />
            <QrCard label="Scan for iOS" svgMarkup={appleSvg} />
          </div>
        </Reveal>

        <Reveal delay={300}>
          <p className="mt-6 text-sm text-white/50">
            Point your phone camera at the code to download
          </p>
          <p className="mt-8 text-sm text-white/60">
            Free to download · No subscription · Pay per ride
          </p>
        </Reveal>
      </div>
    </section>
  );
}

function QrCard({ label, svgMarkup }: { label: string; svgMarkup: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="inline-flex items-center justify-center bg-white"
        style={{
          borderRadius: 16,
          padding: 16,
          boxShadow: "0 14px 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          aria-label={label}
          role="img"
          className="block"
          style={{ width: 160, height: 160 }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      </div>
      <p
        className="mt-3 text-center"
        style={{ fontSize: 12, color: "rgba(255,255,255,0.50)" }}
      >
        {label}
      </p>
    </div>
  );
}

export default Download;
