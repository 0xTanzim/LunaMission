import { describe, expect, test } from 'bun:test';
import {
  computeSelenocentricFrameRotation,
  verifyRotationOrthogonality,
} from '../src/services/frameRotation';

describe('Server Selenocentric Frame Rotation Service (Task 1.1)', () => {
  test('returns 3x3 orthonormal rotation matrix R_PA->ME', () => {
    const matrix = computeSelenocentricFrameRotation();
    expect(matrix.length).toBe(3);
    expect(matrix[0].length).toBe(3);
    expect(verifyRotationOrthogonality(matrix)).toBe(true);
  });

  test('reconciles ~600m to ~700m physical libration offset at south pole latitude', () => {
    const matrix = computeSelenocentricFrameRotation();
    // South pole vector in PA (approx -89 deg)
    const latRad = (-89.0 * Math.PI) / 180;
    const rMoon = 1737400; // meters
    const vPa = [rMoon * Math.cos(latRad), 0, rMoon * Math.sin(latRad)];

    // vMe = R * vPa
    const vMe = [
      matrix[0][0] * vPa[0] + matrix[0][1] * vPa[1] + matrix[0][2] * vPa[2],
      matrix[1][0] * vPa[0] + matrix[1][1] * vPa[1] + matrix[1][2] * vPa[2],
      matrix[2][0] * vPa[0] + matrix[2][1] * vPa[1] + matrix[2][2] * vPa[2],
    ];

    const dx = vMe[0] - vPa[0];
    const dy = vMe[1] - vPa[1];
    const dz = vMe[2] - vPa[2];
    const displacement = Math.hypot(dx, dy, dz);

    expect(displacement).toBeGreaterThan(500);
    expect(displacement).toBeLessThan(900);
  });
});
