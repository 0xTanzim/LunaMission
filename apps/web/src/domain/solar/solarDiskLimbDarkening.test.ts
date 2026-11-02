import { describe, expect, test } from 'bun:test';
import {
  calculateFiniteSolarDiskFraction,
  calculateMastDepressionDeg,
  calculatePenumbralSolarFluxWPerM2,
  SOLAR_DISK_ANGULAR_DIAMETER_DEG,
  EDDINGTON_LINEAR_COEFFICIENT,
} from './solarDiskLimbDarkening';

describe('Finite Solar Disk & Limb Darkening Horizon Masking (Task 1.2)', () => {
  test('defines solar angular diameter as 0.532 degrees and Eddington coefficient u = 0.60', () => {
    expect(SOLAR_DISK_ANGULAR_DIAMETER_DEG).toBeCloseTo(0.532, 3);
    expect(EDDINGTON_LINEAR_COEFFICIENT).toBeCloseTo(0.60, 2);
  });

  test('calculates mast height horizon depression angle across 2.0m to 40.0m', () => {
    const rangeMeters = 5000; // 5 km crater ridge
    const dep2m = calculateMastDepressionDeg(2.0, rangeMeters);
    const dep10m = calculateMastDepressionDeg(10.0, rangeMeters);
    const dep40m = calculateMastDepressionDeg(40.0, rangeMeters);

    expect(dep2m).toBeGreaterThan(0);
    expect(dep10m).toBeGreaterThan(dep2m);
    expect(dep40m).toBeGreaterThan(dep10m);
    expect(dep40m).toBeCloseTo((Math.atan(40 / 5000) * 180) / Math.PI, 3);
  });

  test('yields positive visible fraction f_sun in (0, 1) when sun center is below local obstacle horizon but top limb clears', () => {
    // Horizon obstacle at +1.0 deg elevation, Sun center at +0.9 deg (delta = -0.1 deg, which is within radius 0.266 deg)
    const fSun = calculateFiniteSolarDiskFraction(0.9, 1.0);
    expect(fSun).toBeGreaterThan(0.0);
    expect(fSun).toBeLessThan(0.5); // Center is below, so less than half disk is visible
  });

  test('generates positive penumbral flux at negative ground solar elevation when mast clears horizon', () => {
    // Ground solar elevation = -0.1 deg (below horizon 0.0 deg)
    // 20m mast provides depression of ~0.23 deg for obstacle at 5 km -> effective horizon = -0.23 deg
    // Effective sun delta = -0.1 - (-0.23) = +0.13 deg -> sun is partially visible!
    const flux = calculatePenumbralSolarFluxWPerM2({
      sunElevationDeg: -0.1,
      horizonElevationDeg: 0.0,
      obstacleRangeMeters: 5000,
      mastHeightMeters: 20.0,
      sunDistanceAu: 1.0,
    });

    expect(flux).toBeGreaterThan(500); // Significant flux generated
    expect(flux).toBeLessThan(1361);
  });
});
