/**
 * NASA Landing Safety Index & Hazard Scoring Model
 *
 * Evaluates candidate site landing viability against 5 physical factors:
 * slope, illumination, direct-to-Earth visibility, volatiles, and Beckmann roughness.
 */

import {
  type LandingSafetyEvaluationInput,
  type LandingSafetyBreakdown,
  type LandingSafetyEvaluationResult,
  SAFETY_WEIGHTS,
} from '@luna/contracts';

export type {
  LandingSafetyEvaluationInput,
  LandingSafetyBreakdown,
  LandingSafetyEvaluationResult,
};
export { SAFETY_WEIGHTS };

export function calculateSlopeFactorScore(slopeDeg: number): number {
  if (slopeDeg >= 15.0) return 0;
  if (slopeDeg <= 5.0) return 100;
  const score = (100 * (15.0 - slopeDeg)) / 10.0;
  return Number(Math.max(0, Math.min(100, score)).toFixed(1));
}

export function calculateIlluminationFactorScore(illuminationPct: number): number {
  return Number(Math.max(0, Math.min(100, illuminationPct)).toFixed(1));
}

export function calculateEarthVisibilityFactorScore(earthVisibilityPct: number): number {
  return Number(Math.max(0, Math.min(100, earthVisibilityPct)).toFixed(1));
}

export function calculateVolatilesFactorScore(volatilesScore: number): number {
  return Number(Math.max(0, Math.min(100, volatilesScore)).toFixed(1));
}

export function calculateRoughnessFactorScore(roughnessTheta0Deg: number): number {
  if (roughnessTheta0Deg >= 15.0) return 0;
  if (roughnessTheta0Deg <= 3.0) return 100;
  const score = (100 * (15.0 - roughnessTheta0Deg)) / 12.0;
  return Number(Math.max(0, Math.min(100, score)).toFixed(1));
}

export function evaluateLandingSafety(
  input: LandingSafetyEvaluationInput,
): LandingSafetyEvaluationResult {
  const slopeScore = calculateSlopeFactorScore(input.slopeDeg);
  const illuminationScore = calculateIlluminationFactorScore(input.illuminationPct);
  const earthVisibilityScore = calculateEarthVisibilityFactorScore(input.earthVisibilityPct);
  const volatilesScore = calculateVolatilesFactorScore(input.volatilesScore);
  const roughnessScore = calculateRoughnessFactorScore(input.roughnessTheta0Deg);

  const compositeScore = Number(
    (
      slopeScore * SAFETY_WEIGHTS.slope +
      illuminationScore * SAFETY_WEIGHTS.illumination +
      earthVisibilityScore * SAFETY_WEIGHTS.earthVisibility +
      volatilesScore * SAFETY_WEIGHTS.volatiles +
      roughnessScore * SAFETY_WEIGHTS.roughness
    ).toFixed(1),
  );

  const isTipOverHazard = input.slopeDeg >= 15.0;
  const hazardFlags: string[] = [];

  if (isTipOverHazard) {
    hazardFlags.push('TIP_OVER_HAZARD');
  }
  if (input.slopeDeg >= 10.0 && !isTipOverHazard) {
    hazardFlags.push('ELEVATED_SLOPE');
  }
  if (input.illuminationPct < 20.0) {
    hazardFlags.push('DEEP_SHADOW_RISK');
  }
  if (input.earthVisibilityPct < 25.0) {
    hazardFlags.push('DTE_COMMUNICATION_OUTAGE_RISK');
  }
  if (input.roughnessTheta0Deg >= 10.0) {
    hazardFlags.push('HIGH_SURFACE_ROUGHNESS');
  }

  let recommendation: 'GO' | 'CAUTION' | 'ABORT';
  if (isTipOverHazard || compositeScore < 50.0) {
    recommendation = 'ABORT';
  } else if (compositeScore >= 75.0 && input.slopeDeg < 10.0) {
    recommendation = 'GO';
  } else {
    recommendation = 'CAUTION';
  }

  return {
    compositeScore,
    breakdown: {
      slopeScore,
      illuminationScore,
      earthVisibilityScore,
      volatilesScore,
      roughnessScore,
    },
    recommendation,
    isTipOverHazard,
    hazardFlags,
  };
}

export const calculateLandingSafetyIndex = evaluateLandingSafety;
