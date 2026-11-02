import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBeckmannFromStats,
  calculateBeckmannFromElevations,
  calculateSlopeRoughnessAtCoordinates,
  evaluateRoughnessHazard,
} from '@server/services/terrain/beckmannRoughness';

test('Beckmann Roughness: computes RMS slope parameter s and angle theta0 from stats', () => {
  const result = calculateBeckmannFromStats(1.0, 25.0);
  assert.ok(Math.abs(result.rmsSlope_s - 0.0566) < 0.005);
  assert.ok(Math.abs(result.roughnessTheta0Deg - 3.24) < 0.2);
  assert.equal(result.hazardLevel, 'SMOOTH');
  assert.equal(result.recommendation, 'GO');
});

test('Beckmann Roughness: computes higher roughness for steep crater ejecta', () => {
  const result = calculateBeckmannFromStats(4.0, 20.0);
  assert.ok(result.rmsSlope_s > 0.25);
  assert.ok(result.roughnessTheta0Deg > 15.0);
  assert.equal(result.hazardLevel, 'HAZARDOUS');
  assert.equal(result.recommendation, 'ABORT');
});

test('Beckmann Roughness: calculates roughness from an array of 1D elevation profile points', () => {
  const profile = [100.0, 100.5, 99.8, 101.2, 100.2, 99.5, 100.8, 100.0];
  const result = calculateBeckmannFromElevations(profile, 5.0);
  assert.ok(result.rmsSlope_s > 0);
  assert.ok(result.roughnessTheta0Deg > 0);
  assert.ok(Number.isFinite(result.rmsSlope_s));
  assert.ok(Number.isFinite(result.roughnessTheta0Deg));
});

test('Beckmann Roughness: evaluates roughness hazard levels correctly across the spectrum', () => {
  assert.deepEqual(evaluateRoughnessHazard(2.5), {
    hazardLevel: 'SMOOTH',
    recommendation: 'GO',
  });
  assert.deepEqual(evaluateRoughnessHazard(7.5), {
    hazardLevel: 'MODERATE',
    recommendation: 'GO',
  });
  assert.deepEqual(evaluateRoughnessHazard(12.0), {
    hazardLevel: 'ROUGH',
    recommendation: 'CAUTION',
  });
  assert.deepEqual(evaluateRoughnessHazard(16.5), {
    hazardLevel: 'HAZARDOUS',
    recommendation: 'ABORT',
  });
});

test('Beckmann Roughness: calculates slope and Beckmann roughness at lunar polar coordinates', () => {
  const result = calculateSlopeRoughnessAtCoordinates(-89.44, 222.5, 50);
  assert.ok(Number.isFinite(result.slopeDeg));
  assert.ok(Number.isFinite(result.rmsSlope_s));
  assert.ok(Number.isFinite(result.beckmannRoughnessTheta0Deg));
  assert.equal(result.isTipOverHazard, result.slopeDeg >= 15.0);
  assert.ok(['SMOOTH', 'MODERATE', 'ROUGH', 'HAZARDOUS'].includes(result.roughnessHazard));
});

test('Beckmann Roughness: identifies tip-over hazard at slopes >= 15 degrees', () => {
  const result = calculateSlopeRoughnessAtCoordinates(-89.9, 0.0, 50);
  assert.equal(typeof result.isTipOverHazard, 'boolean');
  if (result.slopeDeg >= 15.0) {
    assert.equal(result.isTipOverHazard, true);
    assert.equal(result.recommendation, 'ABORT');
  }
});
