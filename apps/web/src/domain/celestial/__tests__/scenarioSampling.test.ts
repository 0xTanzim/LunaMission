import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_SITES } from '@luna/contracts';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';
import { CalculationMode } from '@/domain/celestial/calculationMode';
import { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import { ResultAvailability } from '@/domain/celestial/availability';

/**
 * Characterization test for the pre-refactor scientific contract.
 *
 * Every `ResultAvailability` field of a site condition is sampled across the full
 * candidate-site set, both calculation modes, and a spread of epochs that covers
 * lunar summer, winter, and equinox geometry. The refactor relies on this matrix to
 * prove that removing the `kind === 'available' ? value : 0` fallbacks at component
 * boundaries cannot change any number rendered today.
 */
const SAMPLE_EPOCH_ISO = [
  '2026-10-21T12:00:00Z', // default scenario epoch
  '2026-06-18T00:00:00Z', // south-winter minimum
  '2026-12-14T00:00:00Z', // south-summer solstice
  '2026-11-05T06:00:00Z', // VIPER candidate phase
  '2027-03-20T18:30:00Z',
];

const MODES: CalculationMode[] = ['geometry-only', 'terrain-aware'];

const AVAILABILITY_FIELDS: (keyof CelestialGeometryResult)[] = [
  'sunElevationDeg',
  'sunAzimuthDeg',
  'solarIlluminationFraction',
  'earthElevationDeg',
  'earthAzimuthDeg',
  'rangeKm',
  'theoreticalOneWayLightTimeSeconds',
  'localTerrainElevationAtSunAzimuthDeg',
  'localTerrainElevationAtEarthAzimuthDeg',
];

function isAvailability(value: unknown): value is ResultAvailability<number> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    ((value as ResultAvailability).kind === 'available' ||
      (value as ResultAvailability).kind === 'unavailable' ||
      (value as ResultAvailability).kind === 'indeterminate')
  );
}

test('Characterization: every availability field is available for all sites, modes and sampled epochs', () => {
  for (const site of CANDIDATE_SITES) {
    for (const mode of MODES) {
      for (const iso of SAMPLE_EPOCH_ISO) {
        const conditions = calculateSiteConditions(site, new Date(iso), mode);
        for (const field of AVAILABILITY_FIELDS) {
          const value = conditions[field];
          assert.ok(isAvailability(value), `${site.id}/${mode}/${iso}: ${field} lost its availability wrapper`);
          assert.equal(
            value.kind,
            'available',
            `${site.id}/${mode}/${iso}: ${field} is ${value.kind}, so a UI fallback default is reachable`,
          );
        }
      }
    }
  }
});

test('Characterization: no field is ever reported unavailable or indeterminate', () => {
  const seen = new Set<string>();
  for (const site of CANDIDATE_SITES) {
    for (const mode of MODES) {
      for (const iso of SAMPLE_EPOCH_ISO) {
        const conditions = calculateSiteConditions(site, new Date(iso), mode);
        for (const [key, value] of Object.entries(conditions)) {
          if (isAvailability(value) && value.kind !== 'available') seen.add(`${key}:${value.kind}`);
        }
      }
    }
  }
  assert.deepEqual([...seen], [], 'new non-available kinds appeared');
});

test('Characterization: provenance metadata is always attached to a result', () => {
  for (const site of CANDIDATE_SITES) {
    for (const mode of MODES) {
      const conditions = calculateSiteConditions(site, new Date(SAMPLE_EPOCH_ISO[0]), mode);
      assert.equal(conditions.provenance.calculationMode, mode);
      assert.equal(conditions.provenance.timeSystem, 'UTC (Coordinated Universal Time)');
      assert.ok(conditions.provenance.ephemerisSource.length > 0);
      assert.ok(conditions.provenance.coordinateSystem.length > 0);
      assert.ok(conditions.provenance.terrainSource.length > 0);
    }
  }
});
