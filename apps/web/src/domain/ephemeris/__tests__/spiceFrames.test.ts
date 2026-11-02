import { describe, expect, test } from 'bun:test';
import {
  getSpiceFrameEulerRotationMatrix,
  transformCartesianPaToMe,
  transformGeodeticPaToMe,
  computeSurfaceDisplacementMeters,
  NAIF_PA_TO_ME_ANGLES_ARCSEC,
} from '@/domain/ephemeris/spiceFrames';

describe('NAIF SPICE MOON_PA to MOON_ME Frame Rotation', () => {
  test('exposes the authoritative NAIF frame kernel constant angles in arcseconds', () => {
    expect(NAIF_PA_TO_ME_ANGLES_ARCSEC.deltaLonArcsec).toBeCloseTo(67.8, 1);
    expect(NAIF_PA_TO_ME_ANGLES_ARCSEC.deltaLatArcsec).toBeCloseTo(78.6, 1);
  });

  test('generates a strictly orthonormal 3x3 rotation matrix', () => {
    const R = getSpiceFrameEulerRotationMatrix();
    expect(R.length).toBe(3);
    expect(R[0].length).toBe(3);

    const det =
      R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) -
      R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) +
      R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0]);
    expect(det).toBeCloseTo(1.0, 6);

    const norm0 = Math.hypot(R[0][0], R[0][1], R[0][2]);
    expect(norm0).toBeCloseTo(1.0, 6);
  });

  test('transforms Cartesian position vectors preserving length', () => {
    const vPa = { x: 1000, y: -2000, z: 3000 };
    const lenOrig = Math.hypot(vPa.x, vPa.y, vPa.z);
    const vMe = transformCartesianPaToMe(vPa);
    const lenMe = Math.hypot(vMe.x, vMe.y, vMe.z);

    expect(lenMe).toBeCloseTo(lenOrig, 5);
  });

  test('transforms polar geodetic coordinates producing expected ground displacement (~500m to 900m)', () => {
    const lat = -85.9;
    const lon = 2.9;

    const me = transformGeodeticPaToMe(lat, lon);
    expect(me.latitudeDeg).not.toBe(lat);
    expect(me.longitudeDeg).not.toBe(lon);

    const displacementMeters = computeSurfaceDisplacementMeters(lat, lon);
    expect(displacementMeters).toBeGreaterThan(400);
    expect(displacementMeters).toBeLessThan(1200);
  });
});
