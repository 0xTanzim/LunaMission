/**
 * Horizon feature UI root (task 6.2 boundary fix): cross-feature consumers
 * import from here only — the architecture guard allows feature→feature
 * imports exclusively through the target feature's ui/ root.
 */
export { useHorizonProfile } from '../hooks/useHorizonProfile';
export type { UseHorizonProfileResult } from '../hooks/useHorizonProfile';
