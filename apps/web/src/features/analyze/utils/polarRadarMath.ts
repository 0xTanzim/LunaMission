/**
 * Polar Sky Radar Mathematical Transformations (R07 Reference Integration)
 *
 * Implements continuous dual-slope radial mapping for polar south-pole lunar geometry.
 * High angular resolution around the horizon grazing corridor [-5°, +10°] and
 * smooth compression for high zenith angles (+10°, +90°].
 */

export interface PolarCoordinate {
  azimuthDeg: number;
  elevationDeg: number;
}

export interface CartesianPoint {
  x: number;
  y: number;
}

/**
 * Maps topocentric elevation angle θ (deg) to canvas radial distance r (px).
 *
 * Continuity:
 * At θ = 10°, r(10°) = 0.45 * maxRadius on both branches.
 *
 * Invariant:
 * Radial distance r decreases monotonically as elevation θ increases.
 * Hence, e > h(Az) <=> r(e) < r(h(Az)) (inside skyline = clear sky).
 */
export function elevationToRadius(elevationDeg: number, maxRadius: number): number {
  if (elevationDeg <= -5.0) {
    return maxRadius;
  }
  if (elevationDeg <= 10.0) {
    // [-5°, 10°] maps to [maxRadius, 0.45 * maxRadius]
    const fraction = (elevationDeg + 5.0) / 15.0;
    return maxRadius - 0.55 * maxRadius * fraction;
  }
  if (elevationDeg >= 90.0) {
    return 0;
  }
  // (10°, 90°] maps to (0.45 * maxRadius, 0]
  const fraction = (90.0 - elevationDeg) / 80.0;
  return 0.45 * maxRadius * fraction;
}

/**
 * Inverts canvas radial distance r (px) back to topocentric elevation angle θ (deg).
 */
export function radiusToElevation(r: number, maxRadius: number): number {
  if (maxRadius <= 0) return 0;
  const clampedR = Math.max(0, Math.min(maxRadius, r));
  const thresholdR = 0.45 * maxRadius;

  if (clampedR >= thresholdR) {
    // Branch 1: [-5°, 10°]
    const fraction = (maxRadius - clampedR) / (0.55 * maxRadius);
    return -5.0 + fraction * 15.0;
  }
  // Branch 2: (10°, 90°]
  const fraction = clampedR / thresholdR;
  return 90.0 - fraction * 80.0;
}

/**
 * Converts topocentric (Azimuth, Elevation) to canvas (x, y) relative to center.
 * Azimuth = 0° (North) points UP (-Y).
 * Azimuth = 90° (East) points RIGHT (+X).
 */
export function polarToCartesian(
  coord: PolarCoordinate,
  center: CartesianPoint,
  maxRadius: number,
): CartesianPoint {
  const r = elevationToRadius(coord.elevationDeg, maxRadius);
  const azRad = (coord.azimuthDeg * Math.PI) / 180.0;
  return {
    x: center.x + r * Math.sin(azRad),
    y: center.y - r * Math.cos(azRad),
  };
}

/**
 * Inverts canvas (x, y) relative to center back to (Azimuth, Elevation).
 */
export function cartesianToPolar(
  point: CartesianPoint,
  center: CartesianPoint,
  maxRadius: number,
): PolarCoordinate {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  const r = Math.sqrt(dx * dx + dy * dy);

  // Azimuth from North (clockwise)
  let azRad = Math.atan2(dx, -dy);
  if (azRad < 0) azRad += 2 * Math.PI;
  const azimuthDeg = (azRad * 180.0) / Math.PI;

  const elevationDeg = radiusToElevation(r, maxRadius);
  return { azimuthDeg, elevationDeg };
}
