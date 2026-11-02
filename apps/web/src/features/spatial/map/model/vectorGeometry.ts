import { ProjectedPoint } from '@/domain/coordinates/projection';
import { ResultAvailability } from '@/domain/celestial/availability';
import { availableValue } from '@/shared/formatting/availability';
import {
  ScreenAngleRad,
  SelenographicLongitudeDeg,
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
  asScreenAngleRad,
} from '@/domain/coordinates/frames';

/**
 * Calculates the exact ray intersection with the outer boundary circle of the map.
 * Given ray origin sitePos, direction angle screenAngleRad, and boundary circle radius R.
 */
export function calculateRayBoundaryEndpoint(
  origin: ProjectedPoint,
  screenAngleRad: number,
  boundaryRadius: number,
  center: number
): ProjectedPoint {
  const dx = origin.x - center;
  const dy = origin.y - center;
  const dirX = Math.cos(screenAngleRad);
  const dirY = Math.sin(screenAngleRad);

  // Line: p(t) = origin + t * dir
  // Circle: (p(t).x - center)^2 + (p(t).y - center)^2 = boundaryRadius^2
  // Let d_origin = origin - center = (dx, dy)
  // (dx + t*dirX)^2 + (dy + t*dirY)^2 = R^2
  // t^2 + 2*(dx*dirX + dy*dirY)*t + (dx^2 + dy^2 - R^2) = 0
  const b = dx * dirX + dy * dirY;
  const c = dx * dx + dy * dy - boundaryRadius * boundaryRadius;
  const discriminant = b * b - c;
  const t = Math.max(0, -b + Math.sqrt(Math.max(0, discriminant)));

  return {
    x: origin.x + t * dirX,
    y: origin.y + t * dirY,
  };
}

/**
 * Topocentric azimuth -> map screen angle. Input frame: the observer's
 * horizon frame (degrees clockwise from local north, 0=N, 90=E) plus the
 * observer's selenographic longitude (degrees east, 0..360). Output frame:
 * screen space of the polar stereographic map, radians, 0 pointing up (-y)
 * with east clockwise. The projection is conformal, so the horizontal angle
 * is preserved and only the local meridian offset (siteLonDeg - 90) is added.
 */
export function computeScreenAngleRad(
  siteLonDeg: SelenographicLongitudeDeg,
  azimuthDeg: TopocentricAzimuthDeg
): ScreenAngleRad {
  return asScreenAngleRad(((siteLonDeg - 90 + azimuthDeg) * Math.PI) / 180);
}

/**
 * Screen endpoint of the vector pointing at a target, or null when the
 * ephemeris produced no bearing. A missing azimuth draws nothing rather than
 * a ray in an invented direction.
 */
export function resolveRayEndpoint(
  origin: ProjectedPoint,
  siteLonDeg: SelenographicLongitudeDeg,
  azimuthDeg: ResultAvailability<TopocentricAzimuthDeg>,
  boundaryRadius: number,
  center: number
): ProjectedPoint | null {
  const azimuth = availableValue(azimuthDeg);
  if (azimuth === null) return null;
  return calculateRayBoundaryEndpoint(
    origin,
    computeScreenAngleRad(siteLonDeg, azimuth),
    boundaryRadius,
    center
  );
}

/**
 * Horizon side of a target, or null when the elevation is unknown. Styling
 * that asserts "below horizon" needs a known value first.
 */
export function isAtOrAboveHorizon(
  elevationDeg: ResultAvailability<TopocentricElevationDeg>
): boolean | null {
  const value = availableValue(elevationDeg);
  return value === null ? null : value >= 0;
}

export function isAtOrBelowHorizon(
  elevationDeg: ResultAvailability<TopocentricElevationDeg>
): boolean | null {
  const value = availableValue(elevationDeg);
  return value === null ? null : value <= 0;
}
