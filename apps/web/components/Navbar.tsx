"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "The app", href: "#app" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Our Story", href: "#our-story" },
  { label: "Team", href: "#team" },
  { label: "Download", href: "#download" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b ws-nav ${
        scrolled ? "ws-nav-glass" : "ws-nav-transparent"
      }`}
    >
      <nav className="ws-container flex h-[72px] items-center justify-between">
        <Logo size={36} />

        {/* Desktop: links + divider + CTA */}
        <div className="hidden items-center gap-7 md:flex">
          <ul className="flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-[14px] font-semibold transition-colors duration-200"
                  style={{ color: "rgba(255,255,255,0.70)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "rgba(255,255,255,0.70)")
                  }
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <span
            aria-hidden="true"
            className="h-5 w-px"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
          />
          <Link
            href="/admin/verify-drivers"
            className="text-[13px] font-semibold transition-colors duration-200"
            style={{ color: "rgba(255,255,255,0.45)" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#00C9B1")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "rgba(255,255,255,0.45)")
            }
          >
            Admin
          </Link>
          <a
            href="#download"
            className="ws-btn-primary"
            style={{ padding: "10px 20px", fontSize: 14 }}
          >
            Download App
          </a>
        </div>

        {/* Mobile: CTA + hamburger */}
        <div className="flex items-center gap-2 md:hidden">
          <a
            href="#download"
            className="ws-btn-primary"
            style={{ padding: "8px 14px", fontSize: 13 }}
          >
            Download
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white transition-colors duration-200 hover:bg-white/10"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile menu panel */}
      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden border-t border-white/5 transition-[max-height,opacity] duration-300 ease-out ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
        style={{ backgroundColor: "rgba(8,17,31,0.96)" }}
      >
        <div className="ws-container flex flex-col gap-1 py-4">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-semibold text-white/80 transition-colors hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/admin/verify-drivers"
            onClick={() => setOpen(false)}
            className="rounded-lg px-3 py-3 text-base font-semibold text-teal/80 transition-colors hover:bg-white/5 hover:text-teal"
          >
            Admin — verify drivers
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
