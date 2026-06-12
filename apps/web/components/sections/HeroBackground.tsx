"use client";

import { useEffect, useRef, useState } from "react";

const HERO_POSTER =
  "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=1600&q=80";

type Props = {
  src?: string;
  poster?: string;
};

export function HeroBackground({
  src = "/media/videos/hero-road.mp4",
  poster = HERO_POSTER,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || useFallback) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyMotionPreference = () => {
      if (motion.matches) {
        video.pause();
      } else {
        void video.play().catch(() => setUseFallback(true));
      }
    };

    applyMotionPreference();
    motion.addEventListener("change", applyMotionPreference);
    return () => motion.removeEventListener("change", applyMotionPreference);
  }, [useFallback]);

  if (useFallback) {
    return (
      <div
        className="hero-bg-fallback absolute inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${poster})` }}
        aria-hidden="true"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      className="hero-bg-video"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={poster}
      aria-hidden="true"
      onError={() => setUseFallback(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export { HERO_POSTER };
