/**
 * Dynamic Multi-Criteria TOPSIS & NASA CASSA Engineering Gates Engine
 *
 * Implements:
 * 1. NASA CASSA binary engineering gates (slope, buffer, illumination, DTE)
 * 2. 6-Criterion TOPSIS ranking with vector normalization and Euclidean distance to ideal solutions
 * 3. Artemis golden TOPSIS benchmarks and SHAP sensitivity weights
 */

import {
  type CassaSiteConstraints,
  type GateStatus,
  type CassaEvaluationResult,
  type TopsisCandidateInput,
  type TopsisResult,
  SHAP_WEIGHTS,
  GOLDEN_ARTEMIS_TOPSIS_BENCHMARK,
} from '@luna/contracts';

export type {
  CassaSiteConstraints,
  GateStatus,
  CassaEvaluationResult,
  TopsisCandidateInput,
  TopsisResult,
};

export { SHAP_WEIGHTS, GOLDEN_ARTEMIS_TOPSIS_BENCHMARK };

/**
 * Evaluates a candidate site against NASA CASSA engineering gates.
 */
export function evaluateCassaGates(constraints: CassaSiteConstraints): CassaEvaluationResult {
  const violations: string[] = [];
  let slopeStatus: GateStatus = 'PASS';
  let illuminationStatus: GateStatus = 'PASS';
  let dteStatus: GateStatus = 'PASS';

  if (constraints.meanSlopeDeg > 8.0) {
    slopeStatus = 'FAIL';
    violations.push(`Mean slope exceeds 8.0° planning limit (${constraints.meanSlopeDeg.toFixed(1)}°)`);
  } else if (constraints.meanSlopeDeg > 5.0) {
    const buffer = constraints.bufferDistanceM ?? 0;
    if (buffer >= 100) {
      slopeStatus = 'MARGINAL_PASS';
    } else {
      slopeStatus = 'FAIL';
      violations.push(`Mean slope ${constraints.meanSlopeDeg.toFixed(1)}° requires >= 100m buffer from >10° terrain`);
    }
  }

  const minIllum = constraints.solarOnly ? 70.0 : 33.0;
  if (constraints.avgIlluminationPct < minIllum) {
    illuminationStatus = 'FAIL';
    violations.push(
      `Illumination ${constraints.avgIlluminationPct.toFixed(1)}% below required ${minIllum.toFixed(1)}% threshold`,
    );
  }

  if (constraints.dteVisibilityPct < 50.0) {
    dteStatus = 'FAIL';
    violations.push(
      `DTE visibility below 50.0% operational threshold (${constraints.dteVisibilityPct.toFixed(1)}%)`,
    );
  }

  const viable = slopeStatus !== 'FAIL' && illuminationStatus !== 'FAIL' && dteStatus !== 'FAIL';

  return {
    viable,
    violations,
    slopeStatus,
    illuminationStatus,
    dteStatus,
  };
}

/**
 * Computes Technique for Order Preference by Similarity to Ideal Solution (TOPSIS).
 */
export function computeTopsis(
  candidates: TopsisCandidateInput[],
  weights: number[],
  isBenefit: boolean[],
): TopsisResult[] {
  if (candidates.length === 0) return [];
  const m = weights.length;

  const weightSum = weights.reduce((acc, val) => acc + val, 0);
  const normalizedWeights = weights.map((w) => (weightSum > 0 ? w / weightSum : 1 / m));

  const colNorms = new Array<number>(m).fill(0);
  for (let j = 0; j < m; j++) {
    let sumSq = 0;
    for (let i = 0; i < candidates.length; i++) {
      sumSq += (candidates[i].values[j] ?? 0) ** 2;
    }
    colNorms[j] = Math.sqrt(sumSq);
  }

  const v: number[][] = candidates.map((candidate) =>
    candidate.values.map((val, j) => {
      const norm = colNorms[j];
      const r_ij = norm > 0 ? val / norm : 0;
      return normalizedWeights[j] * r_ij;
    }),
  );

  const idealBest = new Array<number>(m).fill(0);
  const idealWorst = new Array<number>(m).fill(0);

  for (let j = 0; j < m; j++) {
    const colValues = v.map((row) => row[j]);
    const minVal = Math.min(...colValues);
    const maxVal = Math.max(...colValues);

    if (isBenefit[j]) {
      idealBest[j] = maxVal;
      idealWorst[j] = minVal;
    } else {
      idealBest[j] = minVal;
      idealWorst[j] = maxVal;
    }
  }

  const unranked = candidates.map((candidate, i) => {
    let sumSqBest = 0;
    let sumSqWorst = 0;

    for (let j = 0; j < m; j++) {
      sumSqBest += (v[i][j] - idealBest[j]) ** 2;
      sumSqWorst += (v[i][j] - idealWorst[j]) ** 2;
    }

    const dBest = Math.sqrt(sumSqBest);
    const dWorst = Math.sqrt(sumSqWorst);
    const denominator = dBest + dWorst;
    const relativeCloseness = denominator > 0 ? dWorst / denominator : 0;

    return {
      id: candidate.id,
      name: candidate.name,
      positiveDistance: dBest,
      negativeDistance: dWorst,
      relativeCloseness,
      rank: 0,
    };
  });

  unranked.sort((a, b) => b.relativeCloseness - a.relativeCloseness);
  return unranked.map((res, index) => ({
    ...res,
    rank: index + 1,
  }));
}
