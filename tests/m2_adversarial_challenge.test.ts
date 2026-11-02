import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { horizonAssetSchema, type HorizonAsset, LUNAR_MEAN_RADIUS_KM } from '../packages/contracts/src/terrain';

const HORIZONS_PATH = path.resolve(__dirname, '../data/curated-horizons.json');
const REGISTRY_PATH = path.resolve(__dirname, '../data/sites-registry.json');
const NON_POLAR_SITES = new Set(['firefly-blue-ghost', 'apollo-11', 'apollo-17', 'change-6']);
const MAST_HEIGHTS = ['1.0', '2.0', '5.0', '10.0'] as const;
const EXTREME_AZIMUTHS = [0, 89, 90, 180, 270, 359] as const;
const R_MOON_METERS = LUNAR_MEAN_RADIUS_KM * 1000.0; // 1,737,400.0 m

describe('Milestone M2: Adversarial Challenge & Data Integrity Audit', () => {
  const horizonsRaw = fs.readFileSync(HORIZONS_PATH, 'utf-8');
  const horizons: Record<string, HorizonAsset> = JSON.parse(horizonsRaw);
  const registryRaw = fs.readFileSync(REGISTRY_PATH, 'utf-8');
  const registry = JSON.parse(registryRaw);
  const siteIds: string[] = registry.sites.map((s: { id: string }) => s.id);

  test('Suite 1: Catalog Completeness & Exact 20-Site Coverage', () => {
    expect(siteIds.length).toBe(20);
    expect(Object.keys(horizons).length).toBe(20);
    for (const id of siteIds) {
      expect(horizons[id]).toBeDefined();
      expect(horizons[id].siteId).toBe(id);
    }
  });

  test('Suite 2: Strict Zod Contract Conformance & Metadata Audit', () => {
    for (const [id, asset] of Object.entries(horizons)) {
      const parsed = horizonAssetSchema.safeParse(asset);
      expect(parsed.success).toBe(true);
      expect(asset.azimuthBinsCount).toBe(360);
      expect(asset.stepDeg).toBe(1.0);
      expect(asset.mastHeightsMeters).toEqual([1.0, 2.0, 5.0, 10.0]);
      expect(asset.provenance).toBeDefined();
      expect(asset.provenance?.dataset).toBe('NASA_LOLA_PGDA');
      expect(typeof asset.provenance?.z0_observer_m).toBe('number');
      expect(Number.isFinite(asset.provenance?.z0_observer_m as number)).toBe(true);
    }
  });

  test('Suite 3: Deep Numeric Cleanliness Audit (Zero NaN, Null, Undefined, Inf Across 28,800 Points)', () => {
    let auditedPoints = 0;
    for (const [siteId, asset] of Object.entries(horizons)) {
      for (const mh of MAST_HEIGHTS) {
        const p = asset.profiles[mh];
        expect(p).toBeDefined();
        expect(p.elevationNominalDeg.length).toBe(360);
        expect(p.thetaLowDeg.length).toBe(360);
        expect(p.thetaHighDeg.length).toBe(360);
        expect(p.blockerDistanceKm.length).toBe(360);
        expect(p.blockerElevationMeters.length).toBe(360);
        expect(p.binStatus.length).toBe(360);

        for (let az = 0; az < 360; az++) {
          auditedPoints++;
          const nom = p.elevationNominalDeg[az];
          const low = p.thetaLowDeg[az];
          const high = p.thetaHighDeg[az];
          const dist = p.blockerDistanceKm[az];
          const elev = p.blockerElevationMeters[az];
          const status = p.binStatus[az];

          // Finiteness
          expect(typeof nom).toBe('number');
          expect(Number.isFinite(nom)).toBe(true);
          expect(typeof low).toBe('number');
          expect(Number.isFinite(low)).toBe(true);
          expect(typeof high).toBe('number');
          expect(Number.isFinite(high)).toBe(true);
          expect(typeof dist).toBe('number');
          expect(Number.isFinite(dist)).toBe(true);
          expect(typeof elev).toBe('number');
          expect(Number.isFinite(elev)).toBe(true);

          // Physical Value Range Limits
          expect(nom).toBeGreaterThanOrEqual(-15.0);
          expect(nom).toBeLessThanOrEqual(45.0);
          expect(dist).toBeGreaterThanOrEqual(0.0);
          expect(dist).toBeLessThanOrEqual(150.0);
          expect(elev).toBeGreaterThanOrEqual(-10000.0);
          expect(elev).toBeLessThanOrEqual(11000.0);
          expect(['valid', 'incomplete_range_truncated', 'nodata']).toContain(status);
        }
      }
    }
    expect(auditedPoints).toBe(28800);
  });

  test('Suite 4: Perturbation Envelope Invariant (thetaLow <= thetaNom <= thetaHigh)', () => {
    const eps = 1e-4;
    for (const [, asset] of Object.entries(horizons)) {
      for (const mh of MAST_HEIGHTS) {
        const p = asset.profiles[mh];
        for (let az = 0; az < 360; az++) {
          const nom = p.elevationNominalDeg[az];
          const low = p.thetaLowDeg[az];
          const high = p.thetaHighDeg[az];

          expect(low).toBeLessThanOrEqual(nom + eps);
          expect(nom).toBeLessThanOrEqual(high + eps);
          expect(high - low).toBeGreaterThanOrEqual(0.0);
        }
      }
    }
  });

  test('Suite 5: Mast Height Monotonicity (10m <= 5m <= 2m <= 1m & 10m <= 1m)', () => {
    const eps = 1e-4;
    for (const [, asset] of Object.entries(horizons)) {
      const p1 = asset.profiles['1.0'];
      const p2 = asset.profiles['2.0'];
      const p5 = asset.profiles['5.0'];
      const p10 = asset.profiles['10.0'];

      for (let az = 0; az < 360; az++) {
        // Direct 10m vs 1m
        expect(p10.elevationNominalDeg[az]).toBeLessThanOrEqual(p1.elevationNominalDeg[az] + eps);
        // Pairwise consecutive monotonicity
        expect(p10.elevationNominalDeg[az]).toBeLessThanOrEqual(p5.elevationNominalDeg[az] + eps);
        expect(p5.elevationNominalDeg[az]).toBeLessThanOrEqual(p2.elevationNominalDeg[az] + eps);
        expect(p2.elevationNominalDeg[az]).toBeLessThanOrEqual(p1.elevationNominalDeg[az] + eps);

        // Upper perturbation bound monotonicity
        expect(p10.thetaHighDeg[az]).toBeLessThanOrEqual(p1.thetaHighDeg[az] + eps);
      }
    }
  });

  test('Suite 6: Extreme Azimuths & Azimuth Seam Continuity (0, 89, 90, 180, 270, 359 deg)', () => {
    for (const [siteId, asset] of Object.entries(horizons)) {
      for (const mh of MAST_HEIGHTS) {
        const p = asset.profiles[mh];

        for (const az of EXTREME_AZIMUTHS) {
          expect(Number.isFinite(p.elevationNominalDeg[az])).toBe(true);
          expect(Number.isFinite(p.blockerDistanceKm[az])).toBe(true);
          expect(p.blockerDistanceKm[az]).toBeGreaterThanOrEqual(0.0);
        }

        // Seam continuity (359° to 0° azimuth jump <= 2.0°)
        const seamJump = Math.abs(p.elevationNominalDeg[359] - p.elevationNominalDeg[0]);
        expect(seamJump).toBeLessThanOrEqual(2.0);

        // Quadrant continuity (89° to 90° azimuth jump <= 2.0°)
        const quadJump = Math.abs(p.elevationNominalDeg[90] - p.elevationNominalDeg[89]);
        expect(quadJump).toBeLessThanOrEqual(2.0);
      }
    }
  });

  test('Suite 7: Non-Polar vs Polar Baseline Science Discrimination', () => {
    for (const [siteId, asset] of Object.entries(horizons)) {
      const isNonPolar = NON_POLAR_SITES.has(siteId);

      if (isNonPolar) {
        // Non-polar sites must have 100% incomplete_range_truncated and match analytical dip
        for (const mh of MAST_HEIGHTS) {
          const mhVal = parseFloat(mh);
          const expectedDip = -(Math.acos(R_MOON_METERS / (R_MOON_METERS + mhVal)) * 180.0) / Math.PI;
          const expectedDist = Math.sqrt(2.0 * R_MOON_METERS * mhVal) / 1000.0;
          const p = asset.profiles[mh];

          for (let az = 0; az < 360; az++) {
            expect(p.binStatus[az]).toBe('incomplete_range_truncated');
            expect(Math.abs(p.elevationNominalDeg[az] - expectedDip)).toBeLessThan(0.005);
            expect(Math.abs(p.blockerDistanceKm[az] - expectedDist)).toBeLessThan(0.005);
          }
        }
      } else {
        // Polar sites must feature real topographic variation
        const p1 = asset.profiles['1.0'];
        const minEl = Math.min(...p1.elevationNominalDeg);
        const maxEl = Math.max(...p1.elevationNominalDeg);
        expect(maxEl - minEl).toBeGreaterThan(0.2); // Significant relief

        if (siteId !== 'im-1-odysseus') {
          // Deep polar sites have 100% valid bins
          expect(p1.binStatus.every((s) => s === 'valid')).toBe(true);
        } else {
          // IM-1 at -80.13°S has valid south bins and truncated north bins
          expect(p1.binStatus.some((s) => s === 'valid')).toBe(true);
          expect(p1.binStatus.some((s) => s === 'incomplete_range_truncated')).toBe(true);
        }
      }
    }
  });
});
