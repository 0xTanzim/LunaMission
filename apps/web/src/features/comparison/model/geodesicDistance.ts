/**
 * Spherical Geodesic Distance on Lunar Sphere (IAU MOON_ME)
 * Reference: docs/PRD.md § 4.1 & AGENTS.md § 4.1
 * Authoritative Lunar Radius R_MOON = 1,737,400.0 m (flattening f = 0.0)
 */

export const R_MOON_METERS = 1737400.0;
export const R_MOON_KM = 1737.4;

export interface LunarGeodesicResult {
  distanceMeters: number;
  distanceKm: number;
  angularSeparationDeg: number;
}

export interface GeodesicCoordinateInput {
  latitudeDeg: number;
  longitudeEastDeg?: number;
  longitudeDeg?: number;
}

const DEG2RAD = Math.PI / 180.0;
const RAD2DEG = 180.0 / Math.PI;

/**
 * Computes exact spherical geodesic arc separation between two points on the Moon.
 * Critical for lunar south-polar coordinates where longitude deltas are physically misleading.
 * Accepts either two coordinate objects or four numeric degrees.
 */
export function calculateLunarGeodesicDistance(
  coordAOrLat1: GeodesicCoordinateInput | number,
  coordBOrLon1: GeodesicCoordinateInput | number,
  lat2OrUndefined?: number,
  lon2OrUndefined?: number,
): LunarGeodesicResult {
  let lat1: number;
  let lon1: number;
  let lat2: number;
  let lon2: number;

  if (typeof coordAOrLat1 === 'object' && typeof coordBOrLon1 === 'object') {
    lat1 = coordAOrLat1.latitudeDeg;
    lon1 = coordAOrLat1.longitudeEastDeg ?? coordAOrLat1.longitudeDeg ?? 0;
    lat2 = coordBOrLon1.latitudeDeg;
    lon2 = coordBOrLon1.longitudeEastDeg ?? coordBOrLon1.longitudeDeg ?? 0;
  } else {
    lat1 = coordAOrLat1 as number;
    lon1 = coordBOrLon1 as number;
    lat2 = lat2OrUndefined ?? 0;
    lon2 = lon2OrUndefined ?? 0;
  }

  // Identical coordinate fast-path to prevent precision artifacts
  if (lat1 === lat2 && lon1 === lon2) {
    return {
      distanceMeters: 0,
      distanceKm: 0,
      angularSeparationDeg: 0,
    };
  }

  const phi1 = lat1 * DEG2RAD;
  const phi2 = lat2 * DEG2RAD;
  const deltaLambda = (lon2 - lon1) * DEG2RAD;

  const cosCentralAngle =
    Math.sin(phi1) * Math.sin(phi2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  // Strictly clamp numerical roundoff to [-1, 1] to guard against NaN from acos
  const clampedCos = Math.min(1.0, Math.max(-1.0, cosCentralAngle));
  const centralAngleRad = Math.acos(clampedCos);

  const distanceMeters = R_MOON_METERS * centralAngleRad;
  const distanceKm = distanceMeters / 1000.0;
  const angularSeparationDeg = centralAngleRad * RAD2DEG;

  return {
    distanceMeters,
    distanceKm,
    angularSeparationDeg,
  };
}
