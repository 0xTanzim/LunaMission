import { describe, expect, test } from 'bun:test';
import type { HorizonBinStatus, HorizonProfile } from '@luna/contracts';
import {
  azimuthFootprintHalfWidthDeg,
  horizonExtremaOverAzimuth,
  integrateVisibleSolarDisk,
} from '../../src/services/celestial/solarDiskIntegration';

const SUN_ANGULAR_RADIUS_DEG = 0.266;

function buildProfile(
  elevationForBin: (bin: number) => number,
  status: HorizonBinStatus = 'valid',
): HorizonProfile {
  const nominal = Array.from({ length: 360 }, (_, bin) => elevationForBin(bin));
  return {
    elevationNominalDeg: nominal,
    thetaLowDeg: nominal.map((value) => value - 0.5),
    thetaHighDeg: nominal.map((value) => value + 0.5),
    blockerDistanceKm: Array.from({ length: 360 }, () => 10.0),
    blockerElevationMeters: Array.from({ length: 360 }, () => 100.0),
    binStatus: Array.from({ length: 360 }, () => status),
  };
}

const flatProfile = (elevationDeg: number, status: HorizonBinStatus = 'valid') =>
  buildProfile(() => elevationDeg, status);

/**
 * Planar visible fraction of a disk above a line at `clearanceDeg` from its centre.
 * t = h/R: fraction = (acos t − t√(1 − t²)) / π, so t = 0 → 0.5, t = 1 → 0, t = −1 → 1.
 */
function circularSegmentFraction(clearanceDeg: number, radiusDeg: number): number {
  const t = Math.max(-1, Math.min(1, clearanceDeg / radiusDeg));
  return (Math.acos(t) - t * Math.sqrt(Math.max(0, 1 - t * t))) / Math.PI;
}

describe('integrateVisibleSolarDisk — analytic oracles', () => {
  test('an unobstructed disk integrates to its full solid angle', () => {
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(-10),
    });

    expect(result.geometricFraction).toBe(1);
    expect(result.irradianceFraction).toBe(1);
    expect(result.visibleSolidAngleSr).toBe(result.diskSolidAngleSr);
  });

  test('a disk entirely below the skyline contributes no solid angle', () => {
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(10),
    });

    expect(result.geometricFraction).toBe(0);
    expect(result.irradianceFraction).toBe(0);
    expect(result.visibleSolidAngleSr).toBe(0);
  });

  test('solid angle uses the exact spherical cap 2π(1 − cos R), not the flat π R²', () => {
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(-10),
    });

    const radiusRad = (SUN_ANGULAR_RADIUS_DEG * Math.PI) / 180;
    const exact = 2 * Math.PI * (1 - Math.cos(radiusRad));
    const flat = Math.PI * radiusRad ** 2;

    expect(result.diskSolidAngleSr).toBeCloseTo(exact, 12);
    expect(Math.abs(result.diskSolidAngleSr - flat) / exact).toBeLessThan(1e-4);
  });

  test('a skyline through the disk centre bisects the visible solid angle', () => {
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5),
    });

    expect(result.geometricFraction).toBeCloseTo(0.5, 3);
    expect(result.irradianceFraction).toBeCloseTo(0.5, 3);
  });

  test('a skyline at +R/2 reproduces the circular segment area', () => {
    const clearance = SUN_ANGULAR_RADIUS_DEG / 2;
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5 + clearance),
    });

    expect(result.geometricFraction).toBeCloseTo(
      circularSegmentFraction(clearance, SUN_ANGULAR_RADIUS_DEG),
      3,
    );
  });

  test('a skyline at −R/2 reproduces the complementary segment', () => {
    const clearance = -SUN_ANGULAR_RADIUS_DEG / 2;
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5 + clearance),
    });

    expect(result.geometricFraction).toBeCloseTo(
      circularSegmentFraction(clearance, SUN_ANGULAR_RADIUS_DEG),
      3,
    );
  });

  test('limb darkening weights the remaining crescent, not just its area', () => {
    const grazing = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5 + SUN_ANGULAR_RADIUS_DEG / 2),
    });
    const cleared = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5 - SUN_ANGULAR_RADIUS_DEG / 2),
    });

    // Visible crescent sits at the limb (dimmer) when the ridge is high.
    expect(grazing.irradianceFraction).toBeLessThan(grazing.geometricFraction);
    // Visible region includes the bright centre when the ridge is low.
    expect(cleared.irradianceFraction).toBeGreaterThan(cleared.geometricFraction);
  });
});

describe('integrateVisibleSolarDisk — azimuthal resolution', () => {
  test('samples the disk at δAz ≤ 0.05° as required by Masterplan §6.1', () => {
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5),
    });

    expect(result.azimuthColumns).toBeGreaterThanOrEqual(11);
    expect(result.azimuthStepDeg).toBeLessThanOrEqual(0.05);
  });

  test('a ridge on one flank is detected although the centre azimuth is clear', () => {
    // Skyline ramps from 4.9° at 180° up to 5.5° at 181°, so it crosses the disk
    // diagonally: the centre azimuth stays clear while the right flank is blocked.
    const ramp = buildProfile((bin) => (bin === 181 ? 5.5 : 4.9));
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180.7,
      centerElevationDeg: 5.4,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: ramp,
    });

    // The ramp crosses the disk close to its centre (centre clearance is only +0.08°),
    // so the blocked cap is larger than the visible remainder: F ≈ 0.66.
    expect(result.geometricFraction).toBeGreaterThan(0.55);
    expect(result.geometricFraction).toBeLessThan(0.75);
    expect(result.irradianceFraction).toBeGreaterThan(0);
    // A centre-azimuth flat-horizon test would instead report ≈0.31 for this geometry.
    expect(result.geometricFraction).toBeGreaterThan(
      circularSegmentFraction(0.08, SUN_ANGULAR_RADIUS_DEG) + 0.2,
    );
  });

  test('the visible fraction decreases monotonically as the skyline rises', () => {
    const fractions = Array.from({ length: 9 }, (_, index) => {
      const horizonDeg = 5 - SUN_ANGULAR_RADIUS_DEG + (index * 2 * SUN_ANGULAR_RADIUS_DEG) / 8;
      return integrateVisibleSolarDisk({
        centerAzimuthDeg: 180,
        centerElevationDeg: 5,
        angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
        horizonProfile: flatProfile(horizonDeg),
      }).geometricFraction;
    });

    for (let index = 1; index < fractions.length; index++) {
      expect(fractions[index]!).toBeLessThanOrEqual(fractions[index - 1]!);
    }
  });
});

describe('integrateVisibleSolarDisk — data integrity', () => {
  test('flags dataGap when the covered bins are truncated or nodata', () => {
    for (const status of ['incomplete_range_truncated', 'nodata'] as const) {
      const result = integrateVisibleSolarDisk({
        centerAzimuthDeg: 180,
        centerElevationDeg: 5,
        angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
        horizonProfile: flatProfile(5, status),
      });
      expect(result.dataGap).toBe(true);
    }
  });

  test('does not flag dataGap for valid bins', () => {
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5),
    });
    expect(result.dataGap).toBe(false);
  });

  test('routes the requested confidence profile', () => {
    const profile = buildProfile(() => 5);
    const low = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: profile,
      profileType: 'low',
    });
    const high = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: profile,
      profileType: 'high',
    });

    // thetaLow = h − 0.5° is less obstructive than thetaHigh = h + 0.5°.
    expect(low.geometricFraction).toBeGreaterThan(high.geometricFraction);
  });
});

describe('horizonExtremaOverAzimuth', () => {
  test('finds extrema at vertices and interval ends', () => {
    const profile = buildProfile((bin) => (bin === 42 ? 12 : bin === 44 ? -3 : 0));
    const extrema = horizonExtremaOverAzimuth(profile, 41.5, 4, 'nominal');
    expect(extrema.minDeg).toBe(-3);
    expect(extrema.maxDeg).toBe(12);
    expect(extrema.dataGap).toBe(false);
  });

  test('wraps across the 0°/360° seam', () => {
    const profile = buildProfile((bin) => (bin === 359 ? 7 : bin === 0 ? 9 : 1));
    const extrema = horizonExtremaOverAzimuth(profile, 359.4, 0.8, 'nominal');
    expect(extrema.maxDeg).toBe(9);
    // Only bins 359 and 0 are covered; the 1° background outside them is not.
    expect(extrema.minDeg).toBe(7);
  });
});

describe('integrateVisibleSolarDisk — tangency and quadrature convergence', () => {
  test('exact upper-limb tangency yields zero visible solid angle', () => {
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5 + SUN_ANGULAR_RADIUS_DEG),
    });

    expect(result.geometricFraction).toBeLessThan(1e-6);
    expect(result.visibleSolidAngleSr).toBeLessThan(1e-9);
  });

  test('exact lower-limb tangency leaves the whole disk visible', () => {
    const result = integrateVisibleSolarDisk({
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5 - SUN_ANGULAR_RADIUS_DEG),
    });

    expect(result.geometricFraction).toBeGreaterThan(0.9999);
  });

  test('the fraction converges as the azimuth quadrature is refined', () => {
    const options = {
      centerAzimuthDeg: 180,
      centerElevationDeg: 5,
      angularRadiusDeg: SUN_ANGULAR_RADIUS_DEG,
      horizonProfile: flatProfile(5 + SUN_ANGULAR_RADIUS_DEG / 2),
    };

    const coarse = integrateVisibleSolarDisk({ ...options, azimuthStepDeg: 0.05 });
    const fine = integrateVisibleSolarDisk({ ...options, azimuthStepDeg: 0.005 });

    expect(fine.azimuthColumns).toBeGreaterThan(coarse.azimuthColumns);
    expect(Math.abs(fine.geometricFraction - coarse.geometricFraction)).toBeLessThan(1e-3);
  });
});

describe('azimuthFootprintHalfWidthDeg', () => {
  test('widens with elevation and saturates when the disk encloses the zenith', () => {
    const atHorizon = azimuthFootprintHalfWidthDeg(0, SUN_ANGULAR_RADIUS_DEG);
    const at45 = azimuthFootprintHalfWidthDeg(45, SUN_ANGULAR_RADIUS_DEG);
    expect(at45).toBeGreaterThan(atHorizon);
    expect(azimuthFootprintHalfWidthDeg(89.99, 1)).toBe(180);
  });
});
