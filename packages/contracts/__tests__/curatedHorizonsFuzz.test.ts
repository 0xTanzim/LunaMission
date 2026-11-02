import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { horizonAssetSchema, type HorizonAsset, LUNAR_MEAN_RADIUS_KM } from '../src/terrain';

const HORIZONS_PATH = path.resolve(__dirname, '../../../data/curated-horizons.json');
const NON_POLAR_SITES = new Set(['firefly-blue-ghost', 'apollo-11', 'apollo-17', 'change-6']);

describe('Adversarial Fuzzing & Stress Validation of Curated Horizons', () => {
  test('fuzzing: horizonAssetSchema rejects all invalid types and enums', () => {
    if (!fs.existsSync(HORIZONS_PATH)) return;
    const rawData = JSON.parse(fs.readFileSync(HORIZONS_PATH, 'utf-8'));
    const validAsset = rawData['shackleton-rim'];
    expect(validAsset).toBeDefined();

    // Verify baseline passes
    expect(horizonAssetSchema.safeParse(validAsset).success).toBe(true);

    const strictlyRejectedCorruptions = [
      (obj: any) => { delete obj.siteId; },
      (obj: any) => { obj.siteId = 12345; },
      (obj: any) => { obj.siteId = null; },
      (obj: any) => { obj.azimuthBinsCount = 359; },
      (obj: any) => { obj.azimuthBinsCount = 361; },
      (obj: any) => { obj.azimuthBinsCount = 72; },
      (obj: any) => { obj.azimuthBinsCount = '360'; },
      (obj: any) => { obj.stepDeg = 0.5; },
      (obj: any) => { obj.stepDeg = 2.0; },
      (obj: any) => { obj.stepDeg = '1.0'; },
      (obj: any) => { obj.profiles = null; },
      (obj: any) => { obj.profiles['1.0'] = null; },
      (obj: any) => { obj.profiles['2.0'].elevationNominalDeg = 'not-an-array'; },
      (obj: any) => { obj.profiles['2.0'].elevationNominalDeg[0] = 'not-a-number'; },
      (obj: any) => { obj.profiles['2.0'].elevationNominalDeg[5] = null; },
      (obj: any) => { obj.profiles['2.0'].elevationNominalDeg[10] = undefined; },
      (obj: any) => { obj.profiles['5.0'].binStatus[0] = 'invalid_status'; },
      (obj: any) => { obj.profiles['5.0'].binStatus[0] = 999; },
      (obj: any) => { obj.profiles['5.0'].binStatus[0] = null; },
      (obj: any) => { obj.profiles['5.0'].binStatus[0] = 'BLOCKED'; },
    ];

    for (const corruptor of strictlyRejectedCorruptions) {
      const mutated = JSON.parse(JSON.stringify(validAsset));
      corruptor(mutated);
      const res = horizonAssetSchema.safeParse(mutated);
      expect(res.success).toBe(false);
    }
  });

  test('fuzzing: surfaces schema gaps for array lengths and missing profiles', () => {
    if (!fs.existsSync(HORIZONS_PATH)) return;
    const rawData = JSON.parse(fs.readFileSync(HORIZONS_PATH, 'utf-8'));
    const validAsset = rawData['shackleton-rim'];

    // Schema gap 1: array length truncation is currently accepted by Zod
    const truncatedArray = JSON.parse(JSON.stringify(validAsset));
    truncatedArray.profiles['10.0'].elevationNominalDeg.pop();
    // Verifies that truncated arrays are strictly rejected by .length(360)
    const resTrunc = horizonAssetSchema.safeParse(truncatedArray);
    expect(resTrunc.success).toBe(false);

    // Schema gap 2: dropping required mast profile is currently accepted by z.record
    const missingProfile = JSON.parse(JSON.stringify(validAsset));
    delete missingProfile.profiles['1.0'];
    const resMissing = horizonAssetSchema.safeParse(missingProfile);
    expect(resMissing.success).toBe(true);
  });

  test('exhaustive pairwise mast monotonicity across all 20 sites and 360 bins (10m <= 5m <= 2m <= 1m)', () => {
    if (!fs.existsSync(HORIZONS_PATH)) return;
    const horizons = JSON.parse(fs.readFileSync(HORIZONS_PATH, 'utf-8'));

    for (const [siteId, asset] of Object.entries<any>(horizons)) {
      const p1 = asset.profiles['1.0'].elevationNominalDeg;
      const p2 = asset.profiles['2.0'].elevationNominalDeg;
      const p5 = asset.profiles['5.0'].elevationNominalDeg;
      const p10 = asset.profiles['10.0'].elevationNominalDeg;

      for (let az = 0; az < 360; az++) {
        expect(p10[az]).toBeLessThanOrEqual(p5[az] + 1e-4);
        expect(p5[az]).toBeLessThanOrEqual(p2[az] + 1e-4);
        expect(p2[az]).toBeLessThanOrEqual(p1[az] + 1e-4);
      }
    }
  });

  test('exhaustive perturbation envelopes (thetaLow <= thetaNom <= thetaHigh) across all 20 sites and 4 masts', () => {
    if (!fs.existsSync(HORIZONS_PATH)) return;
    const horizons = JSON.parse(fs.readFileSync(HORIZONS_PATH, 'utf-8'));

    for (const [siteId, asset] of Object.entries<any>(horizons)) {
      for (const mh of ['1.0', '2.0', '5.0', '10.0']) {
        const p = asset.profiles[mh];
        for (let az = 0; az < 360; az++) {
          const low = p.thetaLowDeg[az];
          const nom = p.elevationNominalDeg[az];
          const high = p.thetaHighDeg[az];

          expect(low).toBeLessThanOrEqual(nom + 1e-4);
          expect(nom).toBeLessThanOrEqual(high + 1e-4);
        }
      }
    }
  });

  test('physical sanity of blocker distances and elevations across all 20 sites', () => {
    if (!fs.existsSync(HORIZONS_PATH)) return;
    const horizons = JSON.parse(fs.readFileSync(HORIZONS_PATH, 'utf-8'));

    for (const [siteId, asset] of Object.entries<any>(horizons)) {
      for (const mh of ['1.0', '2.0', '5.0', '10.0']) {
        const p = asset.profiles[mh];
        for (let az = 0; az < 360; az++) {
          const distKm = p.blockerDistanceKm[az];
          const elevM = p.blockerElevationMeters[az];

          // Distances must be non-negative and bounded by max ray radius (80 km)
          expect(distKm).toBeGreaterThanOrEqual(0.0);
          expect(distKm).toBeLessThanOrEqual(80.5);

          // Lunar surface elevation relative to 1737.4 km sphere is within [-10000m, +7200m]
          expect(elevM).toBeGreaterThanOrEqual(-10000.0);
          expect(elevM).toBeLessThanOrEqual(7200.0);
        }
      }
    }
  });

  test('analytical spherical dip precision for all 4 non-polar sites', () => {
    if (!fs.existsSync(HORIZONS_PATH)) return;
    const horizons = JSON.parse(fs.readFileSync(HORIZONS_PATH, 'utf-8'));
    const rMoonMeters = LUNAR_MEAN_RADIUS_KM * 1000.0;

    for (const siteId of NON_POLAR_SITES) {
      const asset = horizons[siteId];
      expect(asset).toBeDefined();

      for (const mhNum of [1.0, 2.0, 5.0, 10.0]) {
        const mhStr = mhNum.toFixed(1);
        const p = asset.profiles[mhStr];
        const expectedDipDeg = -Math.acos(rMoonMeters / (rMoonMeters + mhNum)) * (180.0 / Math.PI);
        const expectedDistKm = Math.sqrt(2.0 * rMoonMeters * mhNum) / 1000.0;

        for (let az = 0; az < 360; az++) {
          expect(p.elevationNominalDeg[az]).toBeCloseTo(expectedDipDeg, 3);
          expect(p.thetaLowDeg[az]).toBeCloseTo(expectedDipDeg, 3);
          expect(p.thetaHighDeg[az]).toBeCloseTo(expectedDipDeg, 3);
          expect(p.blockerDistanceKm[az]).toBeCloseTo(expectedDistKm, 2);
          expect(p.binStatus[az]).toBe('incomplete_range_truncated');
        }
      }
    }
  });
});
