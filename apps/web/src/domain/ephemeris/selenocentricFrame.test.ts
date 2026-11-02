import { describe, expect, test } from 'bun:test';
import {
  getSelenocentricEulerMatrix,
  transformPaToMeVector,
  calculateFrameAlignmentResidualArcsec,
  SELENOCENTRIC_EULER_ANGLES,
} from './selenocentricFrame';

describe('Selenocentric R_PA->ME Euler Frame Transformation (Task 1.1)', () => {
  test('exposes exact NAIF Lunar Frame Kernel Euler angles in arcseconds and degrees', () => {
    expect(SELENOCENTRIC_EULER_ANGLES.phiArcsec).toBeCloseTo(67.8, 1);
    expect(SELENOCENTRIC_EULER_ANGLES.thetaArcsec).toBeCloseTo(-78.6, 1);
    expect(SELENOCENTRIC_EULER_ANGLES.psiArcsec).toBeCloseTo(0.3, 1);
  });

  test('constructs exact 3D orthonormal transformation matrix with determinant 1.0', () => {
    const R = getSelenocentricEulerMatrix();
    expect(R.length).toBe(3);
    expect(R[0].length).toBe(3);

    // Compute determinant
    const det =
      R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
      R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
      R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
    expect(det).toBeCloseTo(1.0, 7);

    // Check row orthogonality
    const row0Norm = Math.hypot(R[0][0], R[0][1], R[0][2]);
    const row1Norm = Math.hypot(R[1][0], R[1][1], R[1][2]);
    const row2Norm = Math.hypot(R[2][0], R[2][1], R[2][2]);
    expect(row0Norm).toBeCloseTo(1.0, 7);
    expect(row1Norm).toBeCloseTo(1.0, 7);
    expect(row2Norm).toBeCloseTo(1.0, 7);
  });

  test('bounds inverse round-trip frame alignment residual error strictly below 0.001 arcseconds', () => {
    const testVector = { x: 1250000, y: -450000, z: -1150000 };
    const residualArcsec = calculateFrameAlignmentResidualArcsec(testVector);
    expect(residualArcsec).toBeLessThan(0.001);
  });

  test('transforms vector preserving metric magnitude', () => {
    const vPa = { x: 1737400, y: 0, z: 0 };
    const vMe = transformPaToMeVector(vPa);
    const magPa = Math.hypot(vPa.x, vPa.y, vPa.z);
    const magMe = Math.hypot(vMe.x, vMe.y, vMe.z);
    expect(magMe).toBeCloseTo(magPa, 4);
  });
});
