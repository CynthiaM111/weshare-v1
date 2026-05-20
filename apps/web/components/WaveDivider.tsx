type Props = {
  /** Flip the wave vertically so the peak points up vs down. */
  flip?: boolean;
  /** Override the fill color/opacity. Defaults to teal at low opacity. */
  fill?: string;
  /** Height in px (mobile baseline; scales up on md). */
  height?: number;
};

/**
 * A subtle wavy SVG band that ties two adjacent sections together. The
 * wave is intentionally low-contrast so it blends into the surrounding
 * navy without becoming a hard horizontal line.
 */
export function WaveDivider({
  flip = false,
  fill = "rgba(0, 201, 177, 0.08)",
  height = 80,
}: Props) {
  return (
    <div
      aria-hidden="true"
      className="relative w-full overflow-hidden"
      style={{ height, lineHeight: 0 }}
    >
      <svg
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 h-full w-full"
        style={{ transform: flip ? "scaleY(-1)" : undefined }}
      >
        {/* Soft echo wave (very faint) */}
        <path
          d="M0,55 C220,15 420,85 720,55 C1020,25 1240,75 1440,45 L1440,100 L0,100 Z"
          fill={fill}
          opacity="0.55"
        />
        {/* Primary wave */}
        <path
          d="M0,65 C260,105 520,15 820,55 C1100,90 1280,30 1440,60 L1440,100 L0,100 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}

export default WaveDivider;
