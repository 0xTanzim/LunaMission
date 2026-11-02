import { z } from 'zod';
import type { DualEpochCatalogSite } from './sites';

export const safetyEvaluationQuerySchema = z.object({
  slopeDeg: z
    .number()
    .min(0, 'slopeDeg must be >= 0')
    .max(90, 'slopeDeg must be <= 90'),
  illuminationPct: z
    .number()
    .min(0, 'illuminationPct must be >= 0')
    .max(100, 'illuminationPct must be <= 100'),
  earthVisibilityPct: z
    .number()
    .min(0, 'earthVisibilityPct must be >= 0')
    .max(100, 'earthVisibilityPct must be <= 100'),
  volatilesScore: z
    .number()
    .min(0, 'volatilesScore must be >= 0')
    .max(100, 'volatilesScore must be <= 100'),
  roughnessTheta0Deg: z
    .number()
    .min(0, 'roughnessTheta0Deg must be >= 0')
    .max(90, 'roughnessTheta0Deg must be <= 90'),
});

export const landingSafetyRequestSchema = safetyEvaluationQuerySchema;
export const LandingSafetyRequestSchema = safetyEvaluationQuerySchema;

export type SafetyQuery = z.infer<typeof safetyEvaluationQuerySchema>;
export type LandingSafetyRequestInput = SafetyQuery;
export type LandingSafetyEvaluationInput = SafetyQuery;

export const landingSafetyBreakdownSchema = z.object({
  slopeScore: z.number(),
  illuminationScore: z.number(),
  earthVisibilityScore: z.number(),
  volatilesScore: z.number(),
  roughnessScore: z.number(),
});

export type LandingSafetyBreakdown = z.infer<typeof landingSafetyBreakdownSchema>;

export const safetyRecommendationEnum = z.enum(['GO', 'CAUTION', 'ABORT']);
export type SafetyRecommendation = z.infer<typeof safetyRecommendationEnum>;

export const landingSafetyEvaluationResponseSchema = z.object({
  compositeScore: z.number(),
  breakdown: landingSafetyBreakdownSchema,
  recommendation: safetyRecommendationEnum,
  isTipOverHazard: z.boolean(),
  hazardFlags: z.array(z.string()),
  source: z.string().optional(),
});

export const landingSafetyEvaluationResultSchema = landingSafetyEvaluationResponseSchema;
export const LandingSafetyEvaluationResponseSchema = landingSafetyEvaluationResponseSchema;

export type LandingSafetyEvaluationResponse = z.infer<
  typeof landingSafetyEvaluationResponseSchema
>;
export type LandingSafetyEvaluationResult = LandingSafetyEvaluationResponse;

// ==========================================
// CONSTANTS & CONFIGURATIONS
// ==========================================

export const SAFETY_WEIGHTS = {
  slope: 0.3,
  illumination: 0.25,
  earthVisibility: 0.2,
  volatiles: 0.15,
  roughness: 0.1,
} as const;

export const SHAP_WEIGHTS = Object.freeze({
  earthVisibility: 3.39,
  slopeMean: 2.08,
  avgIllumination: 1.62,
  elevationStd: 0.26,
});

// ==========================================
// CASSA GATES & TOPSIS CONTRACTS
// ==========================================

export interface CassaSiteConstraints {
  meanSlopeDeg: number;
  bufferDistanceM?: number;
  avgIlluminationPct: number;
  dteVisibilityPct: number;
  solarOnly?: boolean;
}

export type GateStatus = 'PASS' | 'MARGINAL_PASS' | 'FAIL';
export const gateStatusSchema = z.enum(['PASS', 'MARGINAL_PASS', 'FAIL']);

export const cassaEvaluationResultSchema = z.object({
  viable: z.boolean(),
  violations: z.array(z.string()),
  slopeStatus: gateStatusSchema,
  illuminationStatus: gateStatusSchema,
  dteStatus: gateStatusSchema,
});

export type CassaEvaluationResult = z.infer<typeof cassaEvaluationResultSchema>;

export const topsisCandidateInputSchema = z.object({
  id: z.string(),
  name: z.string(),
  values: z.array(z.number()),
});

export type TopsisCandidateInput = z.infer<typeof topsisCandidateInputSchema>;

export const topsisResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  positiveDistance: z.number(),
  negativeDistance: z.number(),
  relativeCloseness: z.number(),
  rank: z.number(),
});

export type TopsisResult = z.infer<typeof topsisResultSchema>;

export const GOLDEN_ARTEMIS_TOPSIS_BENCHMARK = Object.freeze({
  candidates: [
    {
      id: 'DM2-358',
      name: 'Site DM2 (Nobile Rim 2, Point 358)',
      values: [140592.7, 44.8, 76.5, 68.2, 4.0, 85.0],
    },
    {
      id: 'MM-01',
      name: 'Mons Mouton',
      values: [112400.0, 54.0, 82.0, 58.0, 5.0, 90.0],
    },
    {
      id: 'MAL-01',
      name: 'Malapert Massif',
      values: [175000.0, 31.4, 62.0, 61.0, 2.0, 65.0],
    },
    {
      id: 'SHK-01',
      name: 'Shackleton Ridge',
      values: [88400.0, 36.1, 89.0, 52.0, 2.0, 70.0],
    },
  ],
  weights: [1.2, 1.5, 1.62, 3.39, 0.8, 0.9],
  isBenefit: [true, true, true, true, true, true],
});

export interface EvaluatedCompareSite {
  site: DualEpochCatalogSite;
  rank: number;
  relativeCloseness: number;
  cassa: CassaEvaluationResult;
  meanSlopeDeg: number;
  avgIlluminationPct: number;
  dteVisibilityPct: number;
  normalizedCriteria: number[];
}

export const landingSafetyCompareSiteItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().default('Candidate Site'),
  epoch: z.enum(['2024-confirmed', '2022-legacy', 'clps-commercial', 'cls-wueller-2026']).default('2024-confirmed'),
  coordinates: z.object({
    latitudeDeg: z.number(),
    longitudeDeg: z.number(),
    convention: z.string().default('IAU/IAG Lunar Mean Earth/Polar Axis'),
  }).default({ latitudeDeg: -89.9, longitudeDeg: 0, convention: 'IAU/IAG Lunar Mean Earth/Polar Axis' }),
  elevationMeters: z.number().default(0),
  description: z.string().default('Candidate comparison site'),
  officialReference: z.string().default('Artemis Candidate Site'),
  siteDesignation: z.string().optional(),
  isPrimaryArtemisCandidate: z.boolean().optional(),
});

export const landingSafetyCompareRequestSchema = z
  .object({
    sites: z.array(landingSafetyCompareSiteItemSchema).optional(),
    siteIds: z.array(z.string().min(1)).optional(),
    weights: z.array(z.number()).optional(),
    epochMs: z.number().finite().optional(),
    mode: z.enum(['terrain-aware', 'geometry-only']).optional(),
  })
  .refine(
    (data) => (data.sites && data.sites.length > 0) || (data.siteIds && data.siteIds.length > 0),
    {
      message: 'Either sites or siteIds must contain at least one site for comparison',
      path: ['sites'],
    }
  );

export const LandingSafetyCompareRequestSchema = landingSafetyCompareRequestSchema;
export type LandingSafetyCompareRequest = z.infer<typeof landingSafetyCompareRequestSchema>;

