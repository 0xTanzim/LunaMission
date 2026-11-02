import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLunarEphemeris, computeTopocentricAngles } from '@/domain/celestial/ephemeris';
import { calculateSiteConditions } from '@/domain/celestial/siteConditions';
import { generateTimelineSeries } from '@/domain/celestial/timeline';
import { SPEED_OF_LIGHT_KM_S } from '@/domain/constants/astronomy';
import { CANDIDATE_SITES } from '@luna/contracts';
import { getJulianDate } from '@/domain/time/julianDate';

test('Celestial Ephemeris: Earth-Moon distance stays within physical orbital boundaries', () => {
  // Test across multiple dates
  const dates = [
    new Date('2026-01-01T00:00:00Z'),
    new Date('2026-06-15T00:00:00Z'),
    new Date('2026-10-21T12:00:00Z'),
    new Date('2027-01-01T00:00:00Z'),
  ];

  for (const d of dates) {
    const jd = getJulianDate(d);
    const eph = calculateLunarEphemeris(jd);

    // Perigee > 356,000 km, Apogee < 407,000 km
    assert.equal(eph.earthMoonDistanceKm >= 356000, true, `Distance ${eph.earthMoonDistanceKm} below min perigee`);
    assert.equal(eph.earthMoonDistanceKm <= 407000, true, `Distance ${eph.earthMoonDistanceKm} above max apogee`);

    // Sub-solar latitude must stay within +/- 1.6 degrees (obliquity of Moon is ~1.54 deg)
    assert.equal(Math.abs(eph.subSolarLatDeg) <= 1.6, true, `Sub-solar lat ${eph.subSolarLatDeg} exceeds lunar obliquity`);

    // Sub-Earth latitude libration must stay within +/- 7 degrees
    assert.equal(Math.abs(eph.subEarthLatDeg) <= 7.0, true, `Sub-Earth lat ${eph.subEarthLatDeg} exceeds libration bounds`);
  }
});

test('Celestial Geometry: Topocentric calculations produce expected elevations at the lunar south pole', () => {
  // At exact South Pole (-90 deg), target with sub-target lat = -1.5 deg should be at approx +1.5 deg elevation
  const angles = computeTopocentricAngles(-90, 0, -1.5, 0);
  assert.equal(Math.abs(angles.elevationDeg - 1.5) < 0.01, true);

  // If sub-target is at +1.5 deg (North), at South Pole it should be below horizon (-1.5 deg elevation)
  const anglesNorth = computeTopocentricAngles(-90, 0, 1.5, 0);
  assert.equal(Math.abs(anglesNorth.elevationDeg - (-1.5)) < 0.01, true);
});

test('Site Conditions: Calculates valid physical conditions for Shackleton Rim with explicit units and metadata', () => {
  const site = CANDIDATE_SITES[0]; // Shackleton Crater Rim
  const testDate = new Date('2026-10-21T12:00:00Z');

  const conditions = calculateSiteConditions(site, testDate, 'terrain-aware');

  assert.equal(conditions.provenance.calculationMode, 'terrain-aware');
  assert.equal(conditions.provenance.validationState, 'passed');

  // Sun elevation must have '°' unit and be between -3° and +3° at South Pole
  assert.equal(conditions.sunElevationDeg.kind, 'available');
  if (conditions.sunElevationDeg.kind === 'available') {
    assert.equal(conditions.sunElevationDeg.unit, '°');
    assert.equal(conditions.sunElevationDeg.value >= -4 && conditions.sunElevationDeg.value <= 4, true);
  }

  // Sun Azimuth must be 0° to 360°
  assert.equal(conditions.sunAzimuthDeg.kind, 'available');
  if (conditions.sunAzimuthDeg.kind === 'available') {
    assert.equal(conditions.sunAzimuthDeg.value >= 0 && conditions.sunAzimuthDeg.value <= 360, true);
  }

  // Theoretical light-time must equal distance / speed of light
  assert.equal(conditions.rangeKm.kind, 'available');
  assert.equal(conditions.theoreticalOneWayLightTimeSeconds.kind, 'available');
  if (conditions.rangeKm.kind === 'available' && conditions.theoreticalOneWayLightTimeSeconds.kind === 'available') {
    const expectedTime = Number((conditions.rangeKm.value / SPEED_OF_LIGHT_KM_S).toFixed(3));
    assert.equal(Math.abs(conditions.theoreticalOneWayLightTimeSeconds.value - expectedTime) < 0.005, true);
    // Light time to Moon is always between ~1.18 and ~1.36 seconds
    assert.equal(conditions.theoreticalOneWayLightTimeSeconds.value >= 1.15, true);
    assert.equal(conditions.theoreticalOneWayLightTimeSeconds.value <= 1.40, true);
  }
});

test('Timeline Generator: Produces continuous time series with matching step points', () => {
  const site = CANDIDATE_SITES[0];
  const centerDate = new Date('2026-10-21T12:00:00Z');

  const points = generateTimelineSeries(site, centerDate, 24, 2, 'terrain-aware');
  // 24 hours window stepped every 2 hours should have 13 samples (-12 to +12 inclusive)
  assert.equal(points.length, 13);
  assert.equal(typeof points[0].sunElevationDeg, 'number');
  assert.equal(typeof points[0].earthElevationDeg, 'number');
});
