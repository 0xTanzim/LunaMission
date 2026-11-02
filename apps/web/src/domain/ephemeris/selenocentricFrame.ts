/**
 * Selenocentric Reference Frame Transformations
 *
 * Implements exact 3D Euler rotations between:
 * - MOON_PA: Lunar Principal Axes of Inertia (dynamic ephemerides DE421/DE440)
 * - MOON_ME: Mean Earth/Polar Axis (cartographic LOLA DEM, LROC, USGS)
 *
 * Reconciles the physical libration angular offset:
 * - phi (longitude offset): +67.8 arcseconds
 * - theta (latitude obliquity): -78.6 arcseconds
 * - psi (roll offset): +0.3 arcseconds
 *
 * Reference: NAIF SPICE Frame Kernels (moon_080317.tf, moon_assoc_me.tf)
 */

export interface Vector3D {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export const SELENOCENTRIC_EULER_ANGLES = {
  phiArcsec: 67.8,
  thetaArcsec: -78.6,
  psiArcsec: 0.3,
} as const;

const ARCSEC_TO_RAD = Math.PI / (180 * 3600);
const RAD_TO_ARCSEC = (180 * 3600) / Math.PI;

/**
 * Computes the exact 3x3 direction cosine rotation matrix R_{PA->ME}.
 * Sequence: R_z(psi) * R_x(theta) * R_z(phi)
 */
export function getSelenocentricEulerMatrix(): number[][] {
  const phi = SELENOCENTRIC_EULER_ANGLES.phiArcsec * ARCSEC_TO_RAD;
  const theta = SELENOCENTRIC_EULER_ANGLES.thetaArcsec * ARCSEC_TO_RAD;
  const psi = SELENOCENTRIC_EULER_ANGLES.psiArcsec * ARCSEC_TO_RAD;

  const cp = Math.cos(psi);
  const sp = Math.sin(psi);
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ch = Math.cos(phi);
  const sh = Math.sin(phi);

  return [
    [cp * ch - sp * ct * sh, -cp * sh - sp * ct * ch, sp * st],
    [sp * ch + cp * ct * sh, -sp * sh + cp * ct * ch, -cp * st],
    [st * sh, st * ch, ct],
  ];
}

/**
 * Computes the inverse transpose matrix R_{ME->PA} = R^T.
 */
export function getInverseEulerMatrix(): number[][] {
  const R = getSelenocentricEulerMatrix();
  return [
    [R[0][0], R[1][0], R[2][0]],
    [R[0][1], R[1][1], R[2][1]],
    [R[0][2], R[1][2], R[2][2]],
  ];
}

/**
 * Transforms a Cartesian 3D vector from MOON_PA to MOON_ME.
 */
export function transformPaToMeVector(v: Vector3D): Vector3D {
  const R = getSelenocentricEulerMatrix();
  return {
    x: R[0][0] * v.x + R[0][1] * v.y + R[0][2] * v.z,
    y: R[1][0] * v.x + R[1][1] * v.y + R[1][2] * v.z,
    z: R[2][0] * v.x + R[2][1] * v.y + R[2][2] * v.z,
  };
}

/**
 * Transforms a Cartesian 3D vector from MOON_ME to MOON_PA.
 */
export function transformMeToPaVector(v: Vector3D): Vector3D {
  const Rinv = getInverseEulerMatrix();
  return {
    x: Rinv[0][0] * v.x + Rinv[0][1] * v.y + Rinv[0][2] * v.z,
    y: Rinv[1][0] * v.x + Rinv[1][1] * v.y + Rinv[1][2] * v.z,
    z: Rinv[2][0] * v.x + Rinv[2][1] * v.y + Rinv[2][2] * v.z,
  };
}

/**
 * Calculates the angular frame alignment residual error in arcseconds
 * following a forward and inverse transformation round-trip.
 */
export function calculateFrameAlignmentResidualArcsec(v: Vector3D): number {
  const vMe = transformPaToMeVector(v);
  const vPaRoundTrip = transformMeToPaVector(vMe);

  const magOrig = Math.hypot(v.x, v.y, v.z);
  const magRound = Math.hypot(vPaRoundTrip.x, vPaRoundTrip.y, vPaRoundTrip.z);
  if (magOrig === 0 || magRound === 0) return 0;

  const dot = (v.x * vPaRoundTrip.x + v.y * vPaRoundTrip.y + v.z * vPaRoundTrip.z) / (magOrig * magRound);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, dot)));
  return angleRad * RAD_TO_ARCSEC;
}
