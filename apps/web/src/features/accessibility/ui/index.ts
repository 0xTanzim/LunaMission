/**
 * Accessibility feature UI root: cross-feature consumers import from here only
 * (architecture guard: feature→feature imports go through the target's ui/ root).
 */
export { usePrefersReducedMotion } from '../usePrefersReducedMotion';
export { getPrefersReducedMotion } from '../usePrefersReducedMotion';
