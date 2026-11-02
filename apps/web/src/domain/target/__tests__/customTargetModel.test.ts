import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeTargetComparisonDeltas,
  createCustomLandingTarget,
  evaluateCustomTargetConditions,
  findNearestCatalogCandidate,
  validateCustomTargetCoordinates,
} from '../customTargetModel';

const TEST_EPOCH = Date.parse('2026-10-21T12:00:00Z');

test('validateCustomTargetCoordinates accepts valid south-polar coordinates', () => {
  const valid = validateCustomTargetCoordinates(-88.5, 120.0);
  assert.equal(valid.isValid, true);
  assert.ok(Math.abs(valid.normalizedLon - 120.0) < 0.0001);
});

test('validateCustomTargetCoordinates normalizes negative longitudes to [0, 360)', () => {
  const valid = validateCustomTargetCoordinates(-85.0, -45.0);
  assert.equal(valid.isValid, true);
  assert.ok(Math.abs(valid.normalizedLon - 315.0) < 0.0001);
});

test('validateCustomTargetCoordinates rejects coordinates outside lunar south polar region', () => {
  const equat = validateCustomTargetCoordinates(0.0, 50.0);
  assert.equal(equat.isValid, false);
  assert.ok(equat.error?.includes('South-polar region'));

  const north = validateCustomTargetCoordinates(85.0, 50.0);
  assert.equal(north.isValid, false);
});

test('validateCustomTargetCoordinates rejects non-finite or NaN coordinates', () => {
  assert.equal(validateCustomTargetCoordinates(NaN, 50.0).isValid, false);
  assert.equal(validateCustomTargetCoordinates(-85.0, Infinity).isValid, false);
});

test('createCustomLandingTarget creates a canonical custom landing target with valid id', () => {
  const target = createCustomLandingTarget({
    name: 'Artemis Sub-Ridge Beta',
    latitudeDeg: -89.2,
    longitudeDeg: -130.0,
    elevationKm: -1.2,
  });

  assert.match(target.id, /^custom-[a-z0-9-]+$/);
  assert.equal(target.name, 'Artemis Sub-Ridge Beta');
  assert.ok(Math.abs(target.latitudeDeg - -89.2) < 0.0001);
  assert.ok(Math.abs(target.longitudeDeg - 230.0) < 0.0001);
  assert.ok(Math.abs(target.elevationKm - -1.2) < 0.0001);
  assert.equal(typeof target.createdAt, 'number');
});

test('createCustomLandingTarget falls back to default naming when name is omitted or whitespace', () => {
  const target = createCustomLandingTarget({
    name: '   ',
    latitudeDeg: -88.0,
    longitudeDeg: 45.0,
  });
  assert.match(target.name, /^Custom Target \(-88\.00°, \+45\.00°\)$/);
});

test('findNearestCatalogCandidate correctly identifies Shackleton Crater Rim for 89.9°S, 0°E', () => {
  const match = findNearestCatalogCandidate(-89.9, 0.0);
  assert.ok(match);
  assert.equal(match.candidate.id, 'shackleton-rim');
  assert.equal(match.candidate.code, 'SITE-001');
  assert.ok(match.distanceKm < 15.0);
});

test('findNearestCatalogCandidate correctly identifies Mons Mouton for 84.4°S, 33.7°E', () => {
  const match = findNearestCatalogCandidate(-84.42, 33.75);
  assert.ok(match);
  assert.equal(match.candidate.id, 'mons-mouton');
  assert.equal(match.candidate.code, 'SITE-009');
  assert.ok(match.distanceKm < 5.0);
});

test('evaluateCustomTargetConditions evaluates Sun, Earth, Telecom, and Volatiles', () => {
  const target = createCustomLandingTarget({
    name: 'Ridge Alpha',
    latitudeDeg: -89.4,
    longitudeDeg: 222.0,
  });

  const evaluation = evaluateCustomTargetConditions(target, TEST_EPOCH);

  assert.ok(Number.isFinite(evaluation.sunElevationDeg));
  assert.ok(Number.isFinite(evaluation.sunAzimuthDeg));
  assert.ok(Number.isFinite(evaluation.earthElevationDeg));
  assert.ok(Number.isFinite(evaluation.earthAzimuthDeg));
  assert.ok(Number.isFinite(evaluation.telecom.linkMarginDb) || evaluation.telecom.linkMarginDb === -Infinity);
  assert.ok(Number.isFinite(evaluation.volatiles.hydrogenWeightPercent));
  assert.ok(evaluation.volatiles.divinerTempKelvin > 0);
  assert.ok(evaluation.slopeGradientDeg >= 0);
});

test('computeTargetComparisonDeltas computes accurate deltas and feasibility score', () => {
  const target = createCustomLandingTarget({
    name: 'Evaluation Site',
    latitudeDeg: -89.4,
    longitudeDeg: 222.0,
  });

  const targetEval = evaluateCustomTargetConditions(target, TEST_EPOCH);
  const nearestMatch = findNearestCatalogCandidate(target.latitudeDeg, target.longitudeDeg);

  const deltas = computeTargetComparisonDeltas(targetEval, nearestMatch.candidate, TEST_EPOCH);

  assert.equal(deltas.nearestSiteId, nearestMatch.candidate.id);
  assert.ok(Math.abs(deltas.distanceKm - nearestMatch.distanceKm) < 0.1);
  assert.ok(Number.isFinite(deltas.deltaSunElevationDeg));
  assert.ok(Number.isFinite(deltas.deltaEarthElevationDeg));
  assert.ok(Number.isFinite(deltas.deltaMarginDb));
  assert.ok(deltas.feasibilityScore >= 0 && deltas.feasibilityScore <= 100);
  assert.ok(['EXCELLENT', 'VIABLE', 'CONSTRAINED', 'HAZARDOUS'].includes(deltas.feasibilityGrade));
});
