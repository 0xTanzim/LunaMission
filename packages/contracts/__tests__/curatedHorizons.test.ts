import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { horizonAssetSchema, type HorizonAsset } from '../src/terrain';

const HORIZONS_PATH = path.resolve(__dirname, '../../../data/curated-horizons.json');
const REGISTRY_PATH = path.resolve(__dirname, '../../../data/sites-registry.json');
const NON_POLAR_SITES = new Set(['firefly-blue-ghost', 'apollo-11', 'apollo-17', 'change-6']);

describe('Milestone M2: Curated Horizons Asset Batch Validation', () => {
  test('curated-horizons.json exists and contains valid JSON', () => {
    expect(fs.existsSync(HORIZONS_PATH)).toBe(true);
    const raw = fs.readFileSync(HORIZONS_PATH, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  test('covers all 20 candidate sites from sites-registry.json (Invariant 1)', () => {
    if (!fs.existsSync(HORIZONS_PATH)) return;
    const horizons = JSON.parse(fs.readFileSync(HORIZONS_PATH, 'utf-8'));
    const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    const expectedIds: string[] = registry.sites.map((s: { id: string }) => s.id);

    expect(expectedIds.length).toBe(20);
    expect(Object.keys(horizons).length).toBe(20);
    for (const id of expectedIds) {
      expect(horizons[id]).toBeDefined();
      expect(horizons[id].siteId).toBe(id);
    }
  });

  test('validates schema, profiles, bounds, monotonicity, and provenance (Invariants 2-7)', () => {
    if (!fs.existsSync(HORIZONS_PATH)) return;
    const horizons = JSON.parse(fs.readFileSync(HORIZONS_PATH, 'utf-8'));

    for (const [siteId, rawAsset] of Object.entries(horizons)) {
      // Invariant 2: horizonAssetSchema.parse() passes 100%
      const asset = horizonAssetSchema.parse(rawAsset) as HorizonAsset;
      expect(asset.siteId).toBe(siteId);
      expect(asset.azimuthBinsCount).toBe(360);
      expect(asset.stepDeg).toBe(1.0);
      expect(asset.mastHeightsMeters).toEqual([1.0, 2.0, 5.0, 10.0]);

      // Invariant 7: Provenance present
      expect(asset.provenance).toBeDefined();
      expect(asset.provenance?.dataset).toBe('NASA_LOLA_PGDA');
      expect(typeof asset.provenance?.z0_observer_m).toBe('number');

      // Invariant 3: Exactly 360 bins for all 4 mast heights
      for (const mh of ['1.0', '2.0', '5.0', '10.0']) {
        const p = asset.profiles[mh];
        expect(p).toBeDefined();
        expect(p.elevationNominalDeg.length).toBe(360);
        expect(p.thetaLowDeg.length).toBe(360);
        expect(p.thetaHighDeg.length).toBe(360);
        expect(p.blockerDistanceKm.length).toBe(360);
        expect(p.blockerElevationMeters.length).toBe(360);
        expect(p.binStatus.length).toBe(360);

        const isNonPolar = NON_POLAR_SITES.has(siteId);

        for (let az = 0; az < 360; az++) {
          // Invariant 4: Bin status validation
          if (isNonPolar) {
            expect(p.binStatus[az]).toBe('incomplete_range_truncated');
          } else {
            expect(['valid', 'incomplete_range_truncated', 'nodata']).toContain(p.binStatus[az]);
          }

          // Invariant 5: Perturbation envelope ordering
          expect(p.thetaLowDeg[az]).toBeLessThanOrEqual(p.elevationNominalDeg[az] + 1e-4);
          expect(p.elevationNominalDeg[az]).toBeLessThanOrEqual(p.thetaHighDeg[az] + 1e-4);
          expect(p.blockerDistanceKm[az]).toBeGreaterThanOrEqual(0.0);
        }
      }

      // Invariant 6: Mast height monotonicity (10m mast sees <= 1m mast horizon angle)
      const p1m = asset.profiles['1.0'];
      const p10m = asset.profiles['10.0'];
      for (let az = 0; az < 360; az++) {
        expect(p10m.elevationNominalDeg[az]).toBeLessThanOrEqual(p1m.elevationNominalDeg[az] + 1e-4);
      }
    }
  });
});
