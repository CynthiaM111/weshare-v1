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
    const onScroll = () => setScrolled(window.scrollY > 48);
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
        scrolled ? "ws-nav-solid" : "ws-nav-transparent"
      }`}
    >
      <nav className="ws-container flex h-16 items-center justify-between">
        <Logo size={32} />

        <div className="hidden items-center gap-8 md:flex">
          <ul className="flex items-center gap-7">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="ws-nav-link">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <span aria-hidden="true" className="h-4 w-px bg-white/10" />
          <Link href="/admin/verify-drivers" className="ws-nav-link text-white/45 hover:text-teal">
            Admin
          </Link>
          <a href="#download" className="ws-btn-primary !py-2.5 !px-4 !text-[13px]">
            Download
          </a>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <a href="#download" className="ws-btn-primary !py-2 !px-3.5 !text-xs">
            Download
          </a>
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex h-9 w-9 items-center justify-center border border-white/15 bg-white/[0.03] text-white transition-colors hover:border-white/30"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="square"
            >
              {open ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="6" y1="18" x2="18" y2="6" />
                </>
              ) : (
                <>
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={`md:hidden overflow-hidden border-t border-white/[0.06] bg-black transition-[max-height,opacity] duration-300 ${
          open ? "max-h-[420px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="ws-container flex flex-col py-3">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="border-b border-white/[0.06] px-1 py-3.5 font-medium text-white/75 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
          <Link
            href="/admin/verify-drivers"
            onClick={() => setOpen(false)}
            className="px-1 py-3.5 font-medium text-teal/80 hover:text-teal"
          >
            Admin — verify drivers
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
