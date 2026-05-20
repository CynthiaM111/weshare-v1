"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ElementType, ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  /** Delay before the reveal animation starts, in ms. */
  delay?: number;
  /** Render as a different HTML tag (e.g. "li", "article"). */
  as?: ElementType;
  /** Visibility threshold (0-1). Defaults to 0.12. */
  threshold?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Reveals its children with an opacity + translateY transition when they
 * scroll into view. Honors prefers-reduced-motion (shows children immediately).
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  threshold = 0.12,
  className,
  style,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion — reveal instantly.
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setVisible(true);
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  const TagAny = Tag as ElementType;

  return (
    <TagAny
      ref={ref as unknown as React.Ref<HTMLElement>}
      className={`reveal${visible ? " is-visible" : ""}${className ? " " + className : ""}`}
      style={{
        transitionDelay: visible && delay ? `${delay}ms` : undefined,
        ...style,
      }}
    >
      {children}
    </TagAny>
  );
}

export default Reveal;
