/** Categorical assessments that sit alongside the numeric results. */

export type ValidationState = 'passed' | 'pending' | 'failed' | 'not-assessed';
export type EarthVisibilityState = 'visible' | 'sub-horizon' | 'indeterminate' | 'unavailable';
export type IlluminationState = 'illuminated' | 'partial-penumbra' | 'shadowed' | 'indeterminate';
