/** Julian Date conversion against the J2000 epoch. */

/**
 * Calculate Julian Date (JD) from Date object.
 * Standard astronomical formula for J2000 epoch reference.
 */
export function getJulianDate(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}

/**
 * Convert Julian Date back to UTC Date.
 */
export function julianDateToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * 86400000);
}
