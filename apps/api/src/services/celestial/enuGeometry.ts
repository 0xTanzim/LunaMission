/**
 * Standard IAU Lunar Reference Sphere Radius (MOON_ME datum).
 * R_MOON = 1,737,400.0 meters. (Flattening f = 0.0).
 */
export const LUNAR_SPHERE_RADIUS_METERS = 1737400.0;

export interface LocalEnuAngles {
  azimuthDeg: number;
  elevationDeg: number;
  rangeKm: number;
}

/**
 * Reconciles observer physical distance from lunar center in meters:
 * r0 = R_MOON + z0 + h_obs
 */
export function computeObserverRadiusMeters(
  elevationMeters: number,
  mastHeightMeters = 2.0,
): number {
  return LUNAR_SPHERE_RADIUS_METERS + elevationMeters + mastHeightMeters;
}

/**
 * Computes topocentric East-North-Up (ENU) elevation and azimuth from a target
 * state vector in the IAU MOON_ME Cartesian frame (km).
 */
export function computeLocalEnuAngles(
  targetVectorKm: [number, number, number],
  latitudeDeg: number,
  longitudeDeg: number,
  observerRadiusMeters: number,
): LocalEnuAngles {
  const phi = latitudeDeg * (Math.PI / 180.0);
  const lambda = longitudeDeg * (Math.PI / 180.0);
  const rObsKm = observerRadiusMeters / 1000.0;

  // Observer Cartesian position in MOON_ME frame (km)
  const obsX = rObsKm * Math.cos(phi) * Math.cos(lambda);
  const obsY = rObsKm * Math.cos(phi) * Math.sin(lambda);
  const obsZ = rObsKm * Math.sin(phi);

  // Topocentric relative vector: rho = target - observer (km)
  const rhoX = targetVectorKm[0] - obsX;
  const rhoY = targetVectorKm[1] - obsY;
  const rhoZ = targetVectorKm[2] - obsZ;
  const rangeKm = Math.hypot(rhoX, rhoY, rhoZ);

  if (rangeKm === 0) {
    return { azimuthDeg: 0, elevationDeg: 90, rangeKm: 0 };
  }

  // Local ENU unit basis vectors in MOON_ME frame
  // East = [-sin(lambda), cos(lambda), 0]
  // North = [-sin(phi)*cos(lambda), -sin(phi)*sin(lambda), cos(phi)]
  // Up = [cos(phi)*cos(lambda), cos(phi)*sin(lambda), sin(phi)]
  const rhoEast = -Math.sin(lambda) * rhoX + Math.cos(lambda) * rhoY;
  const rhoNorth =
    -Math.sin(phi) * Math.cos(lambda) * rhoX -
    Math.sin(phi) * Math.sin(lambda) * rhoY +
    Math.cos(phi) * rhoZ;
  const rhoUp =
    Math.cos(phi) * Math.cos(lambda) * rhoX +
    Math.cos(phi) * Math.sin(lambda) * rhoY +
    Math.sin(phi) * rhoZ;

  const elevationRad = Math.asin(Math.max(-1.0, Math.min(1.0, rhoUp / rangeKm)));
  const elevationDeg = elevationRad * (180.0 / Math.PI);

  let azimuthDeg = Math.atan2(rhoEast, rhoNorth) * (180.0 / Math.PI);
  azimuthDeg = ((azimuthDeg % 360) + 360) % 360;

  return { azimuthDeg, elevationDeg, rangeKm };
}
