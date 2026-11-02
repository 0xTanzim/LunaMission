/**
 * Single documented topocentric azimuth basis.
 *
 * Project convention: azimuth is **north = 0°, east-positive, clockwise**, the same
 * convention used by the JPL Horizons `coord@301` observer tables, the curated horizon
 * arrays and the map.
 *
 * Local frame: x = east, y = north, z = up. A direction is therefore
 *   c = (cos El · sin Az, cos El · cos Az, sin El)
 * which is *not* the mathematical `(cos Az, sin Az)` convention. Every boundary that
 * converts between azimuth and a vector must use this module, so the choice is made once.
 */

const DEG = Math.PI / 180;

export interface UnitVector {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export function normaliseAzimuthDeg(azimuthDeg: number): number {
  return ((azimuthDeg % 360) + 360) % 360;
}

export function directionFromAzEl(azimuthDeg: number, elevationDeg: number): UnitVector {
  const az = azimuthDeg * DEG;
  const el = elevationDeg * DEG;
  const cosEl = Math.cos(el);
  return { x: cosEl * Math.sin(az), y: cosEl * Math.cos(az), z: Math.sin(el) };
}

export function azElFromDirection(vector: UnitVector): { azimuthDeg: number; elevationDeg: number } {
  const azimuthDeg = normaliseAzimuthDeg(Math.atan2(vector.x, vector.y) / DEG);
  const elevationDeg = Math.asin(Math.max(-1, Math.min(1, vector.z))) / DEG;
  return { azimuthDeg, elevationDeg };
}

/** Compass label for a cardinal/boundary azimuth, used by tests and diagnostics. */
export function compassLabel(azimuthDeg: number): string {
  const az = normaliseAzimuthDeg(azimuthDeg);
  if (az === 0) return 'N';
  if (az === 90) return 'E';
  if (az === 180) return 'S';
  if (az === 270) return 'W';
  return `${az.toFixed(1)}°`;
}
