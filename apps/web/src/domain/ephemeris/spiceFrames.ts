/**
 * NAIF SPICE Frame Transformations (MOON_PA to MOON_ME)
 *
 * Grounded in NAIF SPICE lunar frame kernels:
 * - moon_080317.tf
 * - moon_assoc_me.tf
 *
 * Solves the critical ~600m surface displacement between:
 * - MOON_PA: Principal Axes of inertia (used by dynamic numerical ephemerides DE421/DE440)
 * - MOON_ME: Mean Earth/Polar Axis (used by cartographic products: LOLA DEMs, USGS LPS, LROC)
 */

export const NAIF_PA_TO_ME_ANGLES_ARCSEC = {
  deltaLonArcsec: 67.8,  // Delta longitude (psi / node rotation)
  deltaLatArcsec: 78.6,  // Delta latitude (theta / obliquity rotation)
  deltaRollArcsec: -0.3, // Delta roll (phi)
};

const LUNAR_MEAN_RADIUS_METERS = 1737400;

export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface GeodeticCoords {
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
}

/**
 * Returns the 3x3 orthonormal Euler rotation matrix R_{PA -> ME}.
 */
export function getSpiceFrameEulerRotationMatrix(): number[][] {
  const arcsecToRad = Math.PI / (180 * 3600);
  const psi = NAIF_PA_TO_ME_ANGLES_ARCSEC.deltaLonArcsec * arcsecToRad;
  const theta = NAIF_PA_TO_ME_ANGLES_ARCSEC.deltaLatArcsec * arcsecToRad;
  const phi = NAIF_PA_TO_ME_ANGLES_ARCSEC.deltaRollArcsec * arcsecToRad;

  const cp = Math.cos(psi);
  const sp = Math.sin(psi);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ch = Math.cos(phi);
  const sh = Math.sin(phi);

  // 3-1-3 Euler rotation matrix R_z(psi) * R_x(theta) * R_z(phi)
  return [
    [cp * ch - sp * ct * sh, -cp * sh - sp * ct * ch, sp * st],
    [sp * ch + cp * ct * sh, -sp * sh + cp * ct * ch, -cp * st],
    [st * sh, st * ch, ct],
  ];
}

/**
 * Transforms a 3D Cartesian vector from MOON_PA to MOON_ME.
 */
export function transformCartesianPaToMe(v: Vector3D): Vector3D {
  const R = getSpiceFrameEulerRotationMatrix();
  return {
    x: R[0][0] * v.x + R[0][1] * v.y + R[0][2] * v.z,
    y: R[1][0] * v.x + R[1][1] * v.y + R[1][2] * v.z,
    z: R[2][0] * v.x + R[2][1] * v.y + R[2][2] * v.z,
  };
}

/**
 * Transforms polar geodetic coordinates from MOON_PA to MOON_ME.
 */
export function transformGeodeticPaToMe(latitudeDeg: number, longitudeDeg: number): GeodeticCoords {
  const latRad = (latitudeDeg * Math.PI) / 180;
  const lonRad = (longitudeDeg * Math.PI) / 180;

  const vPa: Vector3D = {
    x: Math.cos(latRad) * Math.cos(lonRad),
    y: Math.cos(latRad) * Math.sin(lonRad),
    z: Math.sin(latRad),
  };

  const vMe = transformCartesianPaToMe(vPa);

  const meLatRad = Math.asin(Math.max(-1, Math.min(1, vMe.z)));
  let meLonRad = Math.atan2(vMe.y, vMe.x);
  let meLonDeg = (meLonRad * 180) / Math.PI;
  if (meLonDeg < 0) {
    meLonDeg += 360;
  }

  return {
    latitudeDeg: (meLatRad * 180) / Math.PI,
    longitudeDeg: meLonDeg % 360,
  };
}

/**
 * Computes the metric surface ground displacement caused by the PA -> ME frame offset.
 */
export function computeSurfaceDisplacementMeters(latitudeDeg: number, longitudeDeg: number): number {
  const latRad = (latitudeDeg * Math.PI) / 180;
  const lonRad = (longitudeDeg * Math.PI) / 180;

  const rPa: Vector3D = {
    x: LUNAR_MEAN_RADIUS_METERS * Math.cos(latRad) * Math.cos(lonRad),
    y: LUNAR_MEAN_RADIUS_METERS * Math.cos(latRad) * Math.sin(lonRad),
    z: LUNAR_MEAN_RADIUS_METERS * Math.sin(latRad),
  };

  const rMe = transformCartesianPaToMe(rPa);

  const dx = rMe.x - rPa.x;
  const dy = rMe.y - rPa.y;
  const dz = rMe.z - rPa.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
