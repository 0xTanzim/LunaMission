import { ResultAvailability } from '@/domain/celestial/availability';

/**
 * Presentation helpers for scientific results that carry an explicit
 * availability state. An unavailable value renders as an em dash and never
 * as a fabricated 0.
 */

export const UNAVAILABLE_PLACEHOLDER = '—';

/** Returns the numeric value, or null when the result is not available. */
export function availableValue<T extends number>(result: ResultAvailability<T>): T | null {
  return result.kind === 'available' ? result.value : null;
}

/** Why a result could not be computed. Null for available results. */
export function unavailableReason<T extends number>(result: ResultAvailability<T>): string | null {
  return result.kind === 'available' ? null : result.reason;
}

/** Subtraction that stays unknown when either operand is unavailable. */
export function differenceOrNull(minuend: number | null, subtrahend: number | null): number | null {
  return minuend === null || subtrahend === null ? null : minuend - subtrahend;
}

/**
 * Formats a degree measurement that may be unavailable, e.g. `+0.45°` or `—`.
 */
export function formatAvailableAngle(
  result: ResultAvailability<number>,
  decimals = 1,
  signed = false
): string {
  const value = availableValue(result);
  if (value === null) return UNAVAILABLE_PLACEHOLDER;
  const { sign, digits, unit } = angleParts(value, decimals, signed);
  return `${sign}${digits}${unit}`;
}

export interface AngleParts {
  sign: string;
  digits: string;
  unit: string;
}

/**
 * Same formatting as formatAvailableAngle, split into nodes so markup can keep
 * the sign, digits and degree symbol as separate runs.
 */
export function angleParts(value: number, decimals = 1, signed = false): AngleParts {
  const sign = signed && value >= 0 ? '+' : value < 0 ? '-' : '';
  return { sign, digits: Math.abs(value).toFixed(decimals), unit: '°' };
}
