import type { ReactNode } from "react";

/** Small teal label with a dash — no section numbering. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="ws-section-label">{children}</p>;
}

export default SectionLabel;
