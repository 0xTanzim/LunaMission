import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_SITES } from '@luna/contracts';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';
import type { CelestialGeometryResult } from '@/domain/celestial/geometryResult';
import type { ResultAvailability } from '@/domain/celestial/availability';
import {
  asTopocentricAzimuthDeg,
  asTopocentricElevationDeg,
} from '@/domain/coordinates/frames';
import type {
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
} from '@/domain/coordinates/frames';
import {
  clearanceVerdict,
  markerReadout,
  readLocalSky,
} from '@/features/passport/model/localSkyReadouts';

/**
 * The readouts module is the single flatten point for both local-sky views, so
 * its job is to (1) never invent a number for an unavailable result and (2) derive
 * clearance and illumination exactly once. These tests pin both properties.
 */

const SITE = CANDIDATE_SITES[0];
const EPOCH = new Date('2026-10-21T12:00:00Z');

function available<T extends number>(value: T, unit: string): ResultAvailability<T> {
  return { kind: 'available', value, unit };
}

/**
 * Availability fixtures are written inline so each override is checked against
 * the exact field type it replaces.
 */
function elevation(value: number | null, reason = 'terrain mask unavailable'): ResultAvailability<TopocentricElevationDeg> {
  return value === null
    ? { kind: 'unavailable', reason }
    : { kind: 'available', value: asTopocentricElevationDeg(value), unit: '°' };
}

function azimuth(value: number | null, reason = 'ephemeris unavailable'): ResultAvailability<TopocentricAzimuthDeg> {
  return value === null
    ? { kind: 'unavailable', reason }
    : { kind: 'available', value: asTopocentricAzimuthDeg(value), unit: '°' };
}

/** A real scenario result, so the fixture cannot drift from the domain contract. */
function baseConditions(): CelestialGeometryResult {
  return calculateSiteConditions(SITE, EPOCH, 'terrain-aware');
}

function conditionsWith(
  overrides: Partial<CelestialGeometryResult>,
): CelestialGeometryResult {
  return { ...baseConditions(), ...overrides };
}

test('readLocalSky flattens available results to their values without coercion', () => {
  const conditions = conditionsWith({
    sunElevationDeg: elevation(2.5),
    sunAzimuthDeg: azimuth(135),
    earthElevationDeg: elevation(-1.25),
    earthAzimuthDeg: azimuth(288),
    localTerrainElevationAtSunAzimuthDeg: elevation(0.75),
    localTerrainElevationAtEarthAzimuthDeg: elevation(3.5),
    solarIlluminationFraction: available(0.5, 'fraction (0-1)'),
    theoreticalOneWayLightTimeSeconds: available(1.2821, 's'),
  });
  const readouts = readLocalSky(conditions, SITE);

  assert.equal(readouts.sunElevationDeg, 2.5);
  assert.equal(readouts.sunAzimuthDeg, 135);
  assert.equal(readouts.earthElevationDeg, -1.25);
  assert.equal(readouts.earthAzimuthDeg, 288);
  assert.equal(readouts.terrainAtSunAzimuthDeg, 0.75);
  assert.equal(readouts.terrainAtEarthAzimuthDeg, 3.5);
  assert.equal(readouts.illuminationPercent, 50);
  assert.equal(readouts.lightTimeSeconds, 1.2821);
  assert.equal(readouts.canPlotSun, true);
  assert.equal(readouts.canPlotEarth, true);
});

test('terrain clearance is elevation minus the mask sampled at that bearing', () => {
  const readouts = readLocalSky(
    conditionsWith({
      sunElevationDeg: elevation(2.5),
      sunAzimuthDeg: azimuth(135),
      earthElevationDeg: elevation(-1.25),
      earthAzimuthDeg: azimuth(288),
      localTerrainElevationAtSunAzimuthDeg: elevation(0.75),
      localTerrainElevationAtEarthAzimuthDeg: elevation(3.5),
    }),
    SITE,
  );
  assert.equal(readouts.sunClearanceDeg, 1.75);
  assert.equal(readouts.earthClearanceDeg, -4.75);
});

test('an indeterminate terrain mask keeps clearance unknown instead of zero', () => {
  const readouts = readLocalSky(
    conditionsWith({
      sunElevationDeg: elevation(2.5),
      sunAzimuthDeg: azimuth(135),
      localTerrainElevationAtSunAzimuthDeg: { kind: 'indeterminate', reason: 'DEM tile not loaded' },
    }),
    SITE,
  );
  assert.equal(readouts.terrainAtSunAzimuthDeg, null);
  assert.equal(readouts.sunClearanceDeg, null);
  assert.equal(clearanceVerdict(readouts.sunClearanceDeg), 'indeterminate');
});

test('an unavailable elevation stays null and disables plotting', () => {
  const readouts = readLocalSky(
    conditionsWith({
      sunElevationDeg: elevation(null, 'no solar ephemeris'),
      sunAzimuthDeg: azimuth(135),
      earthElevationDeg: elevation(-1.25),
      earthAzimuthDeg: azimuth(null, 'no lunar libration solution'),
    }),
    SITE,
  );
  assert.equal(readouts.sunElevationDeg, null);
  assert.equal(readouts.sunClearanceDeg, null);
  assert.equal(readouts.canPlotSun, false);
  assert.equal(readouts.canPlotEarth, false);
  // The other body is unaffected.
  assert.equal(readouts.earthElevationDeg, -1.25);
});

test('Earth falls back to the Sun-bearing mask when no Earth mask is published', () => {
  const readouts = readLocalSky(
    conditionsWith({
      sunElevationDeg: elevation(2.5),
      sunAzimuthDeg: azimuth(135),
      earthElevationDeg: elevation(1.0),
      earthAzimuthDeg: azimuth(288),
      localTerrainElevationAtSunAzimuthDeg: elevation(0.75),
      localTerrainElevationAtEarthAzimuthDeg: {
        kind: 'unavailable',
        reason: 'earth bearing mask not sampled',
      },
    }),
    SITE,
  );
  assert.equal(readouts.terrainAtEarthAzimuthDeg, 0.75);
  assert.equal(readouts.earthClearanceDeg, 0.25);
});

test('unavailable illumination and light time stay null rather than 0%', () => {
  const readouts = readLocalSky(
    conditionsWith({
      solarIlluminationFraction: { kind: 'unavailable', reason: 'disk geometry not solved' },
      theoreticalOneWayLightTimeSeconds: { kind: 'unavailable', reason: 'range not solved' },
    }),
    SITE,
  );
  assert.equal(readouts.illuminationPercent, null);
  assert.equal(readouts.lightTimeSeconds, null);
});

test('site terrain profile constants are carried through for the mask drawing', () => {
  const readouts = readLocalSky(baseConditions(), {
    ...SITE,
    meanTerrainHorizonDeg: -0.42,
    maxTerrainObstructionDeg: 5.75,
  });
  assert.equal(readouts.meanTerrainHorizonDeg, -0.42);
  assert.equal(readouts.maxTerrainObstructionDeg, 5.75);
});

test('markerReadout selects the per-body field set', () => {
  const readouts = readLocalSky(
    conditionsWith({
      sunElevationDeg: elevation(2.5),
      sunAzimuthDeg: azimuth(135),
      earthElevationDeg: elevation(-1.25),
      earthAzimuthDeg: azimuth(288),
      localTerrainElevationAtSunAzimuthDeg: elevation(0.75),
      localTerrainElevationAtEarthAzimuthDeg: elevation(3.5),
    }),
    SITE,
  );
  assert.deepEqual(markerReadout(readouts, 'sun'), {
    elevationDeg: 2.5,
    azimuthDeg: 135,
    terrainDeg: 0.75,
    clearanceDeg: 1.75,
  });
  assert.deepEqual(markerReadout(readouts, 'earth'), {
    elevationDeg: -1.25,
    azimuthDeg: 288,
    terrainDeg: 3.5,
    clearanceDeg: -4.75,
  });
});

test('clearance verdicts treat zero as obscured, not clear', () => {
  assert.equal(clearanceVerdict(0.01), 'clear');
  assert.equal(clearanceVerdict(0), 'obscured');
  assert.equal(clearanceVerdict(-0), 'obscured');
  assert.equal(clearanceVerdict(-4.75), 'obscured');
  assert.equal(clearanceVerdict(null), 'indeterminate');
});

test('readLocalSky agrees with the real scenario result for every site', () => {
  for (const site of CANDIDATE_SITES) {
    for (const mode of ['geometry-only', 'terrain-aware'] as const) {
      const conditions = calculateSiteConditions(site, EPOCH, mode);
      const readouts = readLocalSky(conditions, site);
      if (readouts.canPlotSun && readouts.terrainAtSunAzimuthDeg !== null) {
        assert.equal(
          readouts.sunClearanceDeg,
          (readouts.sunElevationDeg as TopocentricElevationDeg) - readouts.terrainAtSunAzimuthDeg,
          `${site.id}/${mode}: sun clearance drifted from the plotted values`,
        );
      }
      if (readouts.canPlotEarth && readouts.terrainAtEarthAzimuthDeg !== null) {
        assert.equal(
          readouts.earthClearanceDeg,
          (readouts.earthElevationDeg as TopocentricElevationDeg) - readouts.terrainAtEarthAzimuthDeg,
          `${site.id}/${mode}: earth clearance drifted from the plotted values`,
        );
      }
      if (readouts.illuminationPercent !== null) {
        assert.ok(
          readouts.illuminationPercent >= 0 && readouts.illuminationPercent <= 100,
          `${site.id}/${mode}: illumination escaped the percent band`,
        );
      }
      assert.equal(readouts.meanTerrainHorizonDeg, site.meanTerrainHorizonDeg);
      assert.equal(readouts.maxTerrainObstructionDeg, site.maxTerrainObstructionDeg);
    }
  }
});
