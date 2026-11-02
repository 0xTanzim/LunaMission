import test from 'node:test';
import assert from 'node:assert/strict';
import { generateTopocentricHorizonRadar } from '@/domain/celestial/horizonProfile';
import { getSiteById } from '@/domain/sites/catalog';

test('Topocentric Horizon Profile: generates complete 360-degree terrain horizon for Shackleton Rim', () => {
  const site = getSiteById('shackleton-rim')!;
  assert.ok(site);

  const testDate = new Date('2026-10-21T12:00:00Z');
  const radar = generateTopocentricHorizonRadar(site, testDate, 'terrain-aware');

  assert.equal(radar.siteId, 'shackleton-rim');
  assert.equal(radar.terrainProfile.length, 73); // 0° to 360° in 5° steps (closed loop)
  assert.equal(radar.terrainProfile[0].azimuthDeg, 0);
  assert.equal(radar.terrainProfile[72].azimuthDeg, 360);

  // Rim summit has negative dip base with massif peaks
  for (const point of radar.terrainProfile) {
    assert.ok(Number.isFinite(point.horizonElevationDeg));
    assert.ok(point.horizonElevationDeg > -5);
    assert.ok(point.horizonElevationDeg < 10);
  }
});

test('Topocentric Horizon Profile: generates Sun diurnal wave and Earth libration ellipse', () => {
  const site = getSiteById('malapert-massif')!;
  assert.ok(site);

  const testDate = new Date('2026-10-21T12:00:00Z');
  const radar = generateTopocentricHorizonRadar(site, testDate, 'terrain-aware');

  assert.ok(radar.sunPath.length >= 24);
  assert.ok(radar.earthLibrationLoop.length >= 24);

  // Verify instantaneous positions
  assert.ok(Number.isFinite(radar.currentSun.azimuthDeg));
  assert.ok(Number.isFinite(radar.currentSun.elevationDeg));
  assert.ok(Number.isFinite(radar.currentSun.clearanceDeg));

  assert.ok(Number.isFinite(radar.currentEarth.azimuthDeg));
  assert.ok(Number.isFinite(radar.currentEarth.elevationDeg));
  assert.ok(Number.isFinite(radar.currentEarth.clearanceDeg));

  // Malapert Mountain is high elevation (+5,100 m) with outstanding Earth line-of-sight
  assert.equal(radar.currentEarth.isObstructed, false);
});
