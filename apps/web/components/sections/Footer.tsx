import Link from "next/link";
import { Logo } from "../Logo";

const LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "The app", href: "#app" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Download", href: "#download" },
  { label: "Team", href: "#team" },
  { label: "Contact", href: "mailto:contact@weshare.rw", external: true },
  { label: "Verify drivers", href: "/admin/verify-drivers" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-black pt-14 pb-8">
      <div className="ws-container">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:gap-10">
          <div>
            <Logo size={28} />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/55">
              Connecting Rwanda, one shared ride at a time.
            </p>
          </div>

          <nav aria-label="Footer">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Explore
            </h4>
            <ul className="mt-4 flex flex-col gap-2.5">
              {LINKS.map((l) => (
                <li key={l.label}>
                  {l.external || l.href.startsWith("#") || l.href.startsWith("mailto:") ? (
                    <a
                      href={l.href}
                      className="text-sm font-medium text-white/70 transition-colors hover:text-white"
                    >
                      {l.label}
                    </a>
                  ) : (
                    <Link
                      href={l.href}
                      className="text-sm font-medium text-white/70 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Get in touch
            </h4>
            <a
              href="mailto:contact@weshare.rw"
              className="mt-4 inline-block text-sm font-medium text-white/75 transition-colors hover:text-accent"
            >
              contact@weshare.rw
            </a>
            <div className="mt-5 flex items-center gap-2">
              <SocialButton label="Twitter / X" href="#">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M18.244 3H21l-6.52 7.45L22 21h-6.156l-4.82-6.296L5.5 21H3l6.978-7.97L2 3h6.31l4.36 5.77L18.244 3Zm-2.157 16.2h1.706L7.99 4.71H6.16L16.087 19.2Z" />
                </svg>
              </SocialButton>
              <SocialButton label="Instagram" href="#">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="1" />
                  <circle cx="12" cy="12" r="3.8" />
                  <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
                </svg>
              </SocialButton>
              <SocialButton label="LinkedIn" href="#">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5C4.98 4.881 3.87 6 2.5 6S0 4.881 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5ZM.22 8h4.56v14H.22V8Zm7.46 0h4.37v1.92h.06c.61-1.15 2.1-2.36 4.32-2.36 4.62 0 5.47 3.04 5.47 6.99V22h-4.56v-6.18c0-1.47-.03-3.36-2.05-3.36-2.06 0-2.37 1.6-2.37 3.25V22H7.68V8Z" />
                </svg>
              </SocialButton>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-2 border-t border-white/[0.06] pt-6 text-xs text-white/40 sm:flex-row sm:items-center">
          <p>© 2026 WeShare. All rights reserved.</p>
          <p>v1.0</p>
        </div>
      </div>
    </footer>
  );
}

function SocialButton({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      aria-label={label}
      href={href}
      className="inline-flex h-9 w-9 items-center justify-center border border-white/12 bg-white/[0.03] text-white/65 transition-colors hover:border-white/25 hover:text-white"
    >
      {children}
    </a>
  );
}

export default SiteFooter;
