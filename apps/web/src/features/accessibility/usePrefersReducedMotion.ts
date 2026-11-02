import { useState, useEffect } from 'react';

/**
 * Hook to detect operator's prefers-reduced-motion preference.
 * Governed by WCAG 2.2 AA and docs/phase-3/ACCESSIBILITY_PLAN.md § 4.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReducedMotion;
}

/**
 * Module-level read (task 3.5 scene integration): non-hook consumers — the globe
 * animator and camera transitioner — poll this instead of subscribing. Safe
 * headless (no window) — degrades to false so tests and SSR keep motion.
 */
let reducedMotionQuery: MediaQueryList | null = null;
export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  if (!reducedMotionQuery) {
    reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  return reducedMotionQuery.matches;
}
