import { useEffect, useState } from 'react';

/** Minimum time the branded splash stays visible (ms). */
const MIN_SPLASH_MS = 2000;

/**
 * Keeps the splash on screen until auth has initialized and a minimum duration
 * has passed — otherwise session restore finishes in ~50ms and the splash never appears.
 */
export function useSplashReady(sessionLoading: boolean): boolean {
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, []);

  return sessionLoading || !minElapsed;
}
