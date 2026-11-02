import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSiteTransect } from '../lolaTransectSampler';

test('Dynamic LOLA Transect Sampler: generates continuous 24 km topographic profile', () => {
  const transect = generateSiteTransect('shackleton-rim', -89.90, 0.0, 24.0, 48);

  assert.equal(transect.siteId, 'shackleton-rim');
  assert.equal(transect.totalDistanceKm, 24.0);
  assert.equal(transect.points.length, 48);
  assert.ok(transect.summitElevationMeters > 3000, 'Shackleton summit should exceed 3000m');
  assert.ok(transect.minElevationMeters < transect.summitElevationMeters);
  assert.ok(transect.reliefSpanMeters > 1000);
  assert.ok(transect.meanSlopeDeg > 0);
  assert.ok(transect.traversablePct >= 0 && transect.traversablePct <= 100);
});

test('Dynamic LOLA Transect Sampler: evaluates high elevation on Mons Mouton', () => {
  const transect = generateSiteTransect('mons-mouton', -84.40, 33.70, 24.0, 48);

  assert.equal(transect.siteId, 'mons-mouton');
  assert.ok(transect.summitElevationMeters > 2000, 'Mons Mouton summit should exceed 2000m');
  assert.ok(transect.points.every((p) => Number.isFinite(p.elevationMeters)));
  assert.ok(transect.points.every((p) => Number.isFinite(p.slopeDeg)));
});
