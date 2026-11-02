/**
 * Readout formatting and value normalisation for the Dual-Panel Sky-Ribbon.
 *
 * Pure string/number handling of values the backend supplied. Used by both the
 * canvas renderers and the DOM readouts so the two can never disagree.
 */

export const EMPTY_VALUE = '—';

/** Narrows a possibly-null/undefined/NaN number to `number | null`. */
export function finiteOrNull(value: number | undefined | null): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function formatSignedDeg(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EMPTY_VALUE;
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(digits)}°`;
}

export function formatDeg(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EMPTY_VALUE;
  return `${value.toFixed(digits)}°`;
}

/** Accepts a 0…1 fraction (the API's `fractionalSolarDiskVisibility`). */
export function formatPercent(fraction: number | null | undefined, digits = 1): string {
  if (typeof fraction !== 'number' || !Number.isFinite(fraction)) return EMPTY_VALUE;
  return `${(Math.min(1, Math.max(0, fraction)) * 100).toFixed(digits)}%`;
}

export function formatDegPerHour(value: number | null | undefined, digits = 3): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return EMPTY_VALUE;
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${Math.abs(value).toFixed(digits)} °/h`;
}

export function formatUtcMinute(iso: string | null | undefined): string {
  if (!iso) return EMPTY_VALUE;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return EMPTY_VALUE;
  return `${new Date(ms).toISOString().slice(0, 16).replace('T', ' ')}Z`;
}
