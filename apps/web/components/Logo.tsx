import Link from "next/link";

type LogoProps = {
  /** Total height of the logo group in px. Defaults to 32. */
  size?: number;
  /** Hide the wordmark and show only the icon. */
  iconOnly?: boolean;
  /** Wrap with a link to "/". */
  asLink?: boolean;
  className?: string;
};

/**
 * WeShare logo — two overlapping map-pin teardrops (teal + orange) followed
 * by the wordmark "We" (white) + "Share" (#FF6B35).
 */
export function Logo({ size = 32, iconOnly = false, asLink = true, className }: LogoProps) {
  const iconSize = size;
  const fontSize = Math.round(size * 0.72);

  const inner = (
    <span
      className={`inline-flex items-center gap-2 leading-none ${className ?? ""}`}
      style={{ height: iconSize }}
    >
      <svg
        width={Math.round(iconSize * 1.4)}
        height={iconSize}
        viewBox="0 0 70 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Left teardrop — teal */}
        <path
          d="M22 2c-8.836 0-16 7.164-16 16 0 11 16 28 16 28s16-17 16-28C38 9.164 30.836 2 22 2Z"
          fill="#00C9B1"
        />
        <circle cx="22" cy="18" r="6" fill="#08111F" />
        {/* Right teardrop — orange (slightly overlapping) */}
        <path
          d="M48 2c-8.836 0-16 7.164-16 16 0 11 16 28 16 28s16-17 16-28C64 9.164 56.836 2 48 2Z"
          fill="#FF6B35"
        />
        <circle cx="48" cy="18" r="6" fill="#08111F" />
      </svg>
      {!iconOnly && (
        <span
          className="font-black tracking-tight"
          style={{ fontSize, lineHeight: 1 }}
        >
          <span className="text-white">We</span>
          <span className="text-accent">Share</span>
        </span>
      )}
      <span className="sr-only">WeShare</span>
    </span>
  );

  if (!asLink) return inner;
  return (
    <Link
      href="/"
      aria-label="WeShare home"
      className="inline-flex items-center transition-opacity hover:opacity-90"
    >
      {inner}
    </Link>
  );
}

export default Logo;
