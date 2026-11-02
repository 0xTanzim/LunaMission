import { MS_PER_MINUTE } from './astronomyConstants';

/**
 * Relativistic Terrestrial Time (TT) minus Coordinated Universal Time (UTC) offset.
 * Delta_T = (TAI - UTC) + (TT - TAI) = 37.0s + 32.184s = 69.184s.
 * Grounded in IERS Bulletin A and JPL Planetary Ephemeris (DE421/DE440).
 */
export const TT_MINUS_UTC_SECONDS = 69.184;
export const TT_MINUS_UTC_DAYS = TT_MINUS_UTC_SECONDS / 86400.0;

const MONTH_ABBREVIATIONS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/**
 * Standard UTC Julian Date from a JavaScript Date object.
 */
export function getJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Convert UTC Julian Date back to JavaScript Date.
 */
export function julianDateToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}

/**
 * Ephemeris Julian Date (Terrestrial Time / TDB scale).
 * JD_TT = JD_UTC + Delta_T_days.
 */
export function getEphemerisJulianDate(date: Date): number {
  return (date.getTime() / 1000 + TT_MINUS_UTC_SECONDS) / 86400.0 + 2440587.5;
}

/**
 * Convert Ephemeris Julian Date (TT) back to UTC JavaScript Date.
 */
export function ephemerisJulianDateToDate(jdEphem: number): Date {
  const epochSecondsUtc = (jdEphem - 2440587.5) * 86400.0 - TT_MINUS_UTC_SECONDS;
  return new Date(epochSecondsUtc * 1000.0);
}

/**
 * Format date for NASA JPL Horizons API UTC queries (e.g., '2026-May-15 12:00').
 */
export function formatHorizonsDateUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = MONTH_ABBREVIATIONS[date.getUTCMonth()];
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

export function formatIsoUtc(date: Date): string {
  const y = String(date.getUTCFullYear()).padStart(4, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
}

export function stepEpochMs(epochMs: number, deltaMinutes: number): number {
  return epochMs + deltaMinutes * MS_PER_MINUTE;
}

export function stepUtc(isoString: string, deltaMinutes: number): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return formatIsoUtc(new Date(stepEpochMs(d.getTime(), deltaMinutes)));
}
