import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateLandingSafety,
  calculateSlopeFactorScore,
  calculateIlluminationFactorScore,
  calculateEarthVisibilityFactorScore,
  calculateVolatilesFactorScore,
  calculateRoughnessFactorScore,
} from '@server/services/safety/landingSafetyIndex';

test('Landing Safety Index: gives optimal scores and GO recommendation for benign high-illumination ridge sites', () => {
  const result = evaluateLandingSafety({
    slopeDeg: 3.2,
    illuminationPct: 88.0,
    earthVisibilityPct: 75.0,
    volatilesScore: 60.0,
    roughnessTheta0Deg: 2.8,
  });

  assert.ok(result.compositeScore > 75);
  assert.equal(result.recommendation, 'GO');
  assert.equal(result.isTipOverHazard, false);
  assert.equal(result.breakdown.slopeScore, 100);
  assert.equal(result.breakdown.roughnessScore, 100);
});

test('Landing Safety Index: triggers zero slope score and ABORT recommendation when slope reaches or exceeds 15 deg', () => {
  const result = evaluateLandingSafety({
    slopeDeg: 15.5,
    illuminationPct: 95.0,
    earthVisibilityPct: 90.0,
    volatilesScore: 80.0,
    roughnessTheta0Deg: 4.0,
  });

  assert.equal(result.breakdown.slopeScore, 0);
  assert.equal(result.recommendation, 'ABORT');
  assert.equal(result.isTipOverHazard, true);
  assert.ok(result.hazardFlags.includes('TIP_OVER_HAZARD'));
});

test('Landing Safety Index: calculates slope factor score penalties starting at 5 deg', () => {
  assert.equal(calculateSlopeFactorScore(0), 100);
  assert.equal(calculateSlopeFactorScore(4.9), 100);
  // at 10 deg: halfway between 5 and 15 -> 50
  assert.ok(Math.abs(calculateSlopeFactorScore(10.0) - 50) < 0.2);
  assert.equal(calculateSlopeFactorScore(15.0), 0);
  assert.equal(calculateSlopeFactorScore(22.0), 0);
});

test('Landing Safety Index: calculates roughness score penalties based on Beckmann theta0', () => {
  assert.equal(calculateRoughnessFactorScore(2.0), 100);
  assert.ok(Math.abs(calculateRoughnessFactorScore(9.0) - 50) < 0.2);
  assert.equal(calculateRoughnessFactorScore(15.0), 0);
  assert.equal(calculateRoughnessFactorScore(18.0), 0);
});

test('Landing Safety Index: computes transparent weighted contributions matching exact factor weights (30/25/20/15/10)', () => {
  const result = evaluateLandingSafety({
    slopeDeg: 0,
    illuminationPct: 100,
    earthVisibilityPct: 100,
    volatilesScore: 100,
    roughnessTheta0Deg: 0,
  });

  assert.equal(result.compositeScore, 100);
  assert.equal(result.recommendation, 'GO');
  assert.deepEqual(result.breakdown, {
    slopeScore: 100,
    illuminationScore: 100,
    earthVisibilityScore: 100,
    volatilesScore: 100,
    roughnessScore: 100,
  });
});

test('Landing Safety Index: returns CAUTION recommendation when intermediate scores or marginal slopes are observed', () => {
  const result = evaluateLandingSafety({
    slopeDeg: 8.5,
    illuminationPct: 50.0,
    earthVisibilityPct: 50.0,
    volatilesScore: 40.0,
    roughnessTheta0Deg: 8.0,
  });

  assert.ok(result.compositeScore >= 45);
  assert.ok(result.compositeScore < 75);
  assert.equal(result.recommendation, 'CAUTION');
});

test('Landing Safety Index: clamps invalid or boundary inputs cleanly into 0..100 domain', () => {
  assert.equal(calculateIlluminationFactorScore(-10), 0);
  assert.equal(calculateIlluminationFactorScore(120), 100);
  assert.equal(calculateEarthVisibilityFactorScore(-5), 0);
  assert.equal(calculateEarthVisibilityFactorScore(105), 100);
  assert.equal(calculateVolatilesFactorScore(-1), 0);
  assert.equal(calculateVolatilesFactorScore(150), 100);
});
