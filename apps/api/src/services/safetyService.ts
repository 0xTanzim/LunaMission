import {
  evaluateLandingSafety,
  type LandingSafetyEvaluationResult,
} from './safety/landingSafetyIndex';
import {
  evaluateCompareSites,
  type EvaluatedCompareSite,
} from './safety/compareSiteEvaluator';
import type { LandingSafetyRequestInput } from '../schemas/safetySchemas';
import type { DualEpochCatalogSite, CalculationMode } from '@luna/contracts';

export interface LandingSafetyResponse {
  compositeScore: number;
  breakdown: {
    slopeScore: number;
    illuminationScore: number;
    earthVisibilityScore: number;
    volatilesScore: number;
    roughnessScore: number;
  };
  recommendation: 'GO' | 'CAUTION' | 'ABORT';
  isTipOverHazard?: boolean;
  hazardFlags?: string[];
}

export class SafetyService {
  evaluate(input: LandingSafetyRequestInput): LandingSafetyResponse {
    const result: LandingSafetyEvaluationResult = evaluateLandingSafety(input);

    return {
      compositeScore: result.compositeScore,
      breakdown: result.breakdown,
      recommendation: result.recommendation,
      isTipOverHazard: result.isTipOverHazard,
      hazardFlags: result.hazardFlags,
    };
  }

  compareSites(
    sites: readonly DualEpochCatalogSite[],
    weights: number[],
    epochMs: number,
    mode: CalculationMode = 'terrain-aware'
  ): EvaluatedCompareSite[] {
    return evaluateCompareSites(sites, weights, epochMs, mode);
  }
}

export const safetyService = new SafetyService();
