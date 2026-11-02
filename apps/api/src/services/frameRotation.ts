/**
 * Server-side Selenocentric Frame Rotation Service
 *
 * Provides high-precision R_{PA->ME} Euler rotation matrix calculations
 * for ephemeris matching and LOLA cartographic coordinate reconciliation.
 */

const ARCSEC_TO_RAD = Math.PI / (180 * 3600);

export const SPICE_LUNAR_OFFSETS = {
  phiArcsec: 67.8,
  thetaArcsec: -78.6,
  psiArcsec: 0.3,
} as const;

/**
 * Computes the 3x3 orthonormal Euler rotation matrix R_{PA->ME}.
 */
export function computeSelenocentricFrameRotation(): number[][] {
  const phi = SPICE_LUNAR_OFFSETS.phiArcsec * ARCSEC_TO_RAD;
  const theta = SPICE_LUNAR_OFFSETS.thetaArcsec * ARCSEC_TO_RAD;
  const psi = SPICE_LUNAR_OFFSETS.psiArcsec * ARCSEC_TO_RAD;

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
 * Verifies that the matrix is strictly orthonormal:
 * det(R) ≈ 1.0 and R * R^T ≈ I
 */
export function verifyRotationOrthogonality(R: number[][]): boolean {
  if (R.length !== 3 || R[0].length !== 3) return false;

  const det =
    R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
    R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
    R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);

  if (Math.abs(det - 1.0) > 1e-6) return false;

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let dot = 0;
      for (let k = 0; k < 3; k++) {
        dot += R[i][k] * R[j][k];
      }
      const expected = i === j ? 1.0 : 0.0;
      if (Math.abs(dot - expected) > 1e-6) return false;
    }
  }

  return true;
}
