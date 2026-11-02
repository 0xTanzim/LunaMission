/**
 * Dual-Slope Piecewise Elevation Scale for 360° Sky-Ribbon Canvas
 * Governed by docs/phase-3/INTERACTION_SPEC.md § 3.1 and FRONTEND_ARCHITECTURE.md § 4.2.
 * Strictly maps [-3.0°, +25.0°] into [0, 272px] with 6x magnified grazing precision.
 */

export const MIN_ELEVATION_DEG = -3.0;
export const MAX_ELEVATION_DEG = 25.0;
export const SEAM_ELEVATION_DEG = 5.0;

export const CANVAS_HEIGHT_PX = 272.0;
export const SEAM_Y_PX = 80.0;
export const HORIZON_0_Y_PX = 200.0;

export const GRAZING_SCALE_PX_PER_DEG = 24.0; // [-3°, +5°] (192px / 8°)
export const HIGH_SKY_SCALE_PX_PER_DEG = 4.0;  // [+5°, +25°] (80px / 20°)

/**
 * Transforms topocentric elevation angle in degrees to vertical canvas pixel Y.
 * Y=0 at +25°, Y=80 at +5°, Y=200 at 0°, Y=272 at -3°.
 */
export function elevationToPixelY(elevationDeg: number): number {
  const clamped = Math.max(MIN_ELEVATION_DEG, Math.min(MAX_ELEVATION_DEG, elevationDeg));
  if (clamped >= SEAM_ELEVATION_DEG) {
    return (MAX_ELEVATION_DEG - clamped) * HIGH_SKY_SCALE_PX_PER_DEG;
  }
  return SEAM_Y_PX + (SEAM_ELEVATION_DEG - clamped) * GRAZING_SCALE_PX_PER_DEG;
}

/**
 * Inverts vertical canvas pixel Y coordinate back to topocentric elevation angle in degrees.
 */
export function pixelYToElevation(pixelY: number): number {
  const clampedY = Math.max(0.0, Math.min(CANVAS_HEIGHT_PX, pixelY));
  if (clampedY <= SEAM_Y_PX) {
    return MAX_ELEVATION_DEG - clampedY / HIGH_SKY_SCALE_PX_PER_DEG;
  }
  return SEAM_ELEVATION_DEG - (clampedY - SEAM_Y_PX) / GRAZING_SCALE_PX_PER_DEG;
}

/**
 * Normalizes an azimuth angle in degrees into strictly [0.0, 360.0).
 */
export function normalizeAzimuthDeg(azimuthDeg: number): number {
  return ((azimuthDeg % 360.0) + 360.0) % 360.0;
}

/**
 * Transforms azimuth in degrees into horizontal canvas pixel X across canvas width.
 */
export function azimuthToPixelX(azimuthDeg: number, canvasWidth: number): number {
  const norm = normalizeAzimuthDeg(azimuthDeg);
  return (norm / 360.0) * canvasWidth;
}

/**
 * Inverts horizontal canvas pixel X back to azimuth in degrees [0.0, 360.0).
 */
export function pixelXToAzimuth(pixelX: number, canvasWidth: number): number {
  if (canvasWidth <= 0) return 0.0;
  const ratio = Math.max(0.0, Math.min(1.0, pixelX / canvasWidth));
  return normalizeAzimuthDeg(ratio * 360.0);
}
