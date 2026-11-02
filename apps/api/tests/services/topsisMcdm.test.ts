import { describe, expect, test } from 'bun:test';
import {
  evaluateCassaGates,
  computeTopsis,
  SHAP_WEIGHTS,
  GOLDEN_ARTEMIS_TOPSIS_BENCHMARK,
  type TopsisCandidateInput,
} from '@server/services/safety/topsisMcdm';

describe('NASA CASSA Engineering Viability Gating', () => {
  test('passes viable candidate with gentle slope and strong illumination & DTE', () => {
    const result = evaluateCassaGates({
      meanSlopeDeg: 3.2,
      avgIlluminationPct: 62.0,
      dteVisibilityPct: 78.0,
    });

    expect(result.viable).toBe(true);
    expect(result.slopeStatus).toBe('PASS');
    expect(result.illuminationStatus).toBe('PASS');
    expect(result.dteStatus).toBe('PASS');
    expect(result.violations).toHaveLength(0);
  });

  test('rejects candidate exceeding slope limit without 100m buffer', () => {
    const result = evaluateCassaGates({
      meanSlopeDeg: 9.2,
      avgIlluminationPct: 55.0,
      dteVisibilityPct: 80.0,
    });

    expect(result.viable).toBe(false);
    expect(result.slopeStatus).toBe('FAIL');
    expect(result.violations[0]).toContain('Mean slope exceeds 8.0° planning limit');
  });

  test('allows slope between 5° and 8° only when buffer >= 100m', () => {
    const marginalWithoutBuffer = evaluateCassaGates({
      meanSlopeDeg: 6.8,
      bufferDistanceM: 50,
      avgIlluminationPct: 45.0,
      dteVisibilityPct: 60.0,
    });
    expect(marginalWithoutBuffer.viable).toBe(false);
    expect(marginalWithoutBuffer.slopeStatus).toBe('FAIL');

    const marginalWithBuffer = evaluateCassaGates({
      meanSlopeDeg: 6.8,
      bufferDistanceM: 120,
      avgIlluminationPct: 45.0,
      dteVisibilityPct: 60.0,
    });
    expect(marginalWithBuffer.viable).toBe(true);
    expect(marginalWithBuffer.slopeStatus).toBe('MARGINAL_PASS');
  });

  test('enforces 33% standard illumination gate and 70% solar-only gate', () => {
    const passStandard = evaluateCassaGates({
      meanSlopeDeg: 4.0,
      avgIlluminationPct: 35.0,
      dteVisibilityPct: 55.0,
      solarOnly: false,
    });
    expect(passStandard.viable).toBe(true);

    const failSolarOnly = evaluateCassaGates({
      meanSlopeDeg: 4.0,
      avgIlluminationPct: 35.0,
      dteVisibilityPct: 55.0,
      solarOnly: true,
    });
    expect(failSolarOnly.viable).toBe(false);
    expect(failSolarOnly.illuminationStatus).toBe('FAIL');
  });

  test('enforces 50% minimum Direct-to-Earth visibility gate', () => {
    const result = evaluateCassaGates({
      meanSlopeDeg: 4.0,
      avgIlluminationPct: 60.0,
      dteVisibilityPct: 42.0,
    });
    expect(result.viable).toBe(false);
    expect(result.dteStatus).toBe('FAIL');
    expect(result.violations[0]).toContain('DTE visibility below 50.0% operational threshold');
  });
});

describe('TOPSIS Decision Solver & Golden Benchmark', () => {
  test('exposes empirical SHAP weights from Artemis III 315,034 cell analysis', () => {
    expect(SHAP_WEIGHTS.earthVisibility).toBe(3.39);
    expect(SHAP_WEIGHTS.slopeMean).toBe(2.08);
    expect(SHAP_WEIGHTS.avgIllumination).toBe(1.62);
    expect(SHAP_WEIGHTS.elevationStd).toBe(0.26);
  });

  test('computes golden benchmark: Point #358 in Site DM2 yields R = 0.6916 ± 0.005 and rank 1', () => {
    const { candidates, weights, isBenefit } = GOLDEN_ARTEMIS_TOPSIS_BENCHMARK;
    const results = computeTopsis(candidates, weights, isBenefit);

    expect(results).toHaveLength(4);
    const dm2 = results.find((r) => r.id === 'DM2-358');
    expect(dm2).toBeDefined();
    expect(dm2!.rank).toBe(1);
    expect(dm2!.relativeCloseness).toBeGreaterThanOrEqual(0.6866);
    expect(dm2!.relativeCloseness).toBeLessThanOrEqual(0.6966);
    expect(Math.abs(dm2!.relativeCloseness - 0.6916)).toBeLessThan(0.005);
  });

  test('correctly handles cost criteria and re-ranks dynamically', () => {
    const candidates: TopsisCandidateInput[] = [
      { id: 'A', name: 'Gentle Slope Site', values: [3.0, 85.0] },
      { id: 'B', name: 'Steep Slope Site', values: [12.0, 90.0] },
    ];
    const weights = [2.08, 3.39];
    const isBenefit = [false, true];

    const results = computeTopsis(candidates, weights, isBenefit);
    expect(results[0].id).toBe('A');
    expect(results[0].relativeCloseness).toBeGreaterThan(results[1].relativeCloseness);
  });
});
