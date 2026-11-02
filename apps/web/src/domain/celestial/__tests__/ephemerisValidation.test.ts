import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLunarEphemeris, computeTopocentricAngles } from '@/domain/celestial/ephemeris';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';
import { CANDIDATE_SITES } from '@luna/contracts';
import { getJulianDate } from '@/domain/time/julianDate';
import { SPEED_OF_LIGHT_KM_S } from '@/domain/constants/astronomy';

/**
 * Independent verification suite for lunar celestial geometry and ephemeris.
 * Tests physical invariants, seasonal limits, libration boundaries, and topocentric frame math.
 */

test('Independent Ephemeris: Lunar axial obliquity and seasonal solar illumination extremes', () => {
  // Test seasonal cycle across 2026:
  // Southern summer solstice on Moon (~May 2026): Sun reaches maximum southern latitude (~ -1.54°)
  const summerJd = getJulianDate(new Date('2026-05-15T12:00:00Z'));
  const summerEph = calculateLunarEphemeris(summerJd);
  assert.ok(
    summerEph.subSolarLatDeg < -1.0,
    `Expected sub-solar latitude < -1.0° at southern summer, got ${summerEph.subSolarLatDeg}°`
  );
  assert.ok(
    summerEph.subSolarLatDeg >= -1.55,
    `Sub-solar latitude ${summerEph.subSolarLatDeg}° must not exceed physical obliquity 1.5424°`
  );

  // Southern winter solstice on Moon (~Nov 2026): Sun reaches maximum northern latitude (~ +1.54°)
  const winterJd = getJulianDate(new Date('2026-11-15T12:00:00Z'));
  const winterEph = calculateLunarEphemeris(winterJd);
  assert.ok(
    winterEph.subSolarLatDeg > 1.0,
    `Expected sub-solar latitude > +1.0° at southern winter, got ${winterEph.subSolarLatDeg}°`
  );
  assert.ok(
    winterEph.subSolarLatDeg <= 1.55,
    `Sub-solar latitude ${winterEph.subSolarLatDeg}° must not exceed physical obliquity 1.5424°`
  );
});

test('Independent Ephemeris: Optical libration in latitude and longitude stays within theoretical bounds', () => {
  // Sample 60 dates across 2 lunar nodal periods (~54 days)
  const baseMs = new Date('2026-01-01T00:00:00Z').getTime();
  const dayMs = 86400000;

  let minLat = 0;
  let maxLat = 0;
  let minLon = 0;
  let maxLon = 0;

  for (let i = 0; i < 60; i++) {
    const jd = getJulianDate(new Date(baseMs + i * dayMs));
    const eph = calculateLunarEphemeris(jd);

    minLat = Math.min(minLat, eph.subEarthLatDeg);
    maxLat = Math.max(maxLat, eph.subEarthLatDeg);
    minLon = Math.min(minLon, eph.subEarthLonDeg);
    maxLon = Math.max(maxLon, eph.subEarthLonDeg);

    // Theoretical maximum optical librations: lat ~6.68°, lon ~7.92°
    assert.ok(Math.abs(eph.subEarthLatDeg) <= 6.70, `Latitude libration ${eph.subEarthLatDeg}° exceeded bound`);
    assert.ok(Math.abs(eph.subEarthLonDeg) <= 7.95, `Longitude libration ${eph.subEarthLonDeg}° exceeded bound`);
  }

  // Confirm that libration actually oscillates across both positive and negative values
  assert.ok(minLat < -3.0 && maxLat > 3.0, 'Expected latitude libration to span positive and negative values');
  assert.ok(minLon < -4.0 && maxLon > 4.0, 'Expected longitude libration to span positive and negative values');
});

test('Independent Topocentric Math: Cardinal observer positions yield exact analytical zenith/nadir angles', () => {
  // 1. Observer at Lunar Prime Meridian Equator (0°N, 0°E), target at (0°N, 0°E) -> Zenith (+90° elevation)
  const zenith = computeTopocentricAngles(0, 0, 0, 0);
  assert.ok(Math.abs(zenith.elevationDeg - 90) < 1e-4, `Expected 90° elevation, got ${zenith.elevationDeg}`);

  // 2. Observer at Lunar Far Side Equator (0°N, 180°E), target at (0°N, 0°E) -> Nadir (-90° elevation)
  const nadir = computeTopocentricAngles(0, 180, 0, 0);
  assert.ok(Math.abs(nadir.elevationDeg - (-90)) < 1e-4, `Expected -90° elevation, got ${nadir.elevationDeg}`);

  // 3. Observer at South Pole (-90°N, 0°E), target at Equator (0°N, 0°E) -> Horizon (0° elevation, azimuth 0°/North)
  const horizon = computeTopocentricAngles(-90, 0, 0, 0);
  assert.ok(Math.abs(horizon.elevationDeg) < 1e-4, `Expected 0° elevation, got ${horizon.elevationDeg}`);
  assert.ok(Math.abs(horizon.azimuthDeg) < 1e-4, `Expected 0° (North) azimuth from South Pole, got ${horizon.azimuthDeg}`);

  // 4. Observer at South Pole (-90°N, 0°E), target at Equator 90°E (0°N, 90°E) -> Horizon, azimuth 90° (East)
  const eastHorizon = computeTopocentricAngles(-90, 0, 0, 90);
  assert.ok(Math.abs(eastHorizon.elevationDeg) < 1e-4);
  assert.ok(Math.abs(eastHorizon.azimuthDeg - 90) < 1e-4);
});

test('Site Conditions: Calculation modes strictly preserve the distinction between geometry-only and terrain-aware', () => {
  const site = CANDIDATE_SITES[0]; // Shackleton Crater Rim (-89.9°S, 0°E)
  const date = new Date('2026-10-21T12:00:00Z');

  const geomResult = calculateSiteConditions(site, date, 'geometry-only');
  const terrainResult = calculateSiteConditions(site, date, 'terrain-aware');

  // Helper to safely extract available values in test
  const val = <T>(res: any): T => {
    assert.equal(res.kind, 'available');
    return res.value;
  };

  // Spherical geometry-only model MUST set local terrain horizon to exactly 0.00°
  assert.equal(geomResult.provenance.calculationMode, 'geometry-only');
  assert.equal(val(geomResult.localTerrainElevationAtSunAzimuthDeg), 0);
  assert.equal(val(geomResult.localTerrainElevationAtEarthAzimuthDeg), 0);

  // Terrain-aware model incorporates LOLA DEM horizon mask and dip angle
  assert.equal(terrainResult.provenance.calculationMode, 'terrain-aware');
  assert.notEqual(
    val(terrainResult.localTerrainElevationAtSunAzimuthDeg),
    0,
    'Expected non-zero terrain horizon elevation incorporating dip angle and relief for Shackleton rim'
  );
  assert.notEqual(
    val(terrainResult.localTerrainElevationAtEarthAzimuthDeg),
    0,
    'Expected non-zero terrain horizon elevation incorporating dip angle and relief for Shackleton rim'
  );

  // Topocentric angles of bodies relative to mean sphere must match regardless of calculation mode
  assert.equal(val(geomResult.sunElevationDeg), val(terrainResult.sunElevationDeg));
  assert.equal(val(geomResult.sunAzimuthDeg), val(terrainResult.sunAzimuthDeg));
  assert.equal(val(geomResult.earthElevationDeg), val(terrainResult.earthElevationDeg));
  assert.equal(val(geomResult.earthAzimuthDeg), val(terrainResult.earthAzimuthDeg));
});

test('Speed of Light: Theoretical vacuum one-way light time is consistent with instantaneous range', () => {
  const site = CANDIDATE_SITES[1]; // Connecting Ridge
  const date = new Date('2026-10-21T12:00:00Z');
  const conditions = calculateSiteConditions(site, date);

  if (conditions.rangeKm.kind === 'available' && conditions.theoreticalOneWayLightTimeSeconds.kind === 'available') {
    const range = conditions.rangeKm.value;
    const lightTime = conditions.theoreticalOneWayLightTimeSeconds.value;
    const computed = range / SPEED_OF_LIGHT_KM_S;

    // Tolerance within 0.005s
    assert.ok(Math.abs(lightTime - computed) < 0.005);
  }
});
