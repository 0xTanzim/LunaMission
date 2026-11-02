/** Explicit result availability: a value is never silently coerced to zero. */

export type ResultAvailability<T = number> =
  | { kind: 'available'; value: T; unit: string; qualityNote?: string }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'indeterminate'; reason: string };
