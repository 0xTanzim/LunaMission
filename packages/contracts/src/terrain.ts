import { z } from 'zod';
import { type CraterMorphologyDatum, LOLA_POLAR_CRATER_MORPHOLOGIES } from './craters';
import { evaluationStatusEnum } from './common';

export { type CraterMorphologyDatum, LOLA_POLAR_CRATER_MORPHOLOGIES };

export const LUNAR_MEAN_RADIUS_KM = 1737.4;

export const geologicalUnitCodeEnum = z.enum(['pNb', 'Nb', 'Im', 'Cc', 'PSR']);
export type GeologicalUnitCode = z.infer<typeof geologicalUnitCodeEnum>;

export const terrainElevationSampleSchema = z.object({
  elevationMeters: z.number(),
  elevationSceneUnits: z.number(),
  slopeDeg: z.number(),
  normalScene: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  hillshade: z.number(),
  geologicalUnitCode: geologicalUnitCodeEnum,
  geologicalUnitName: z.string(),
  isPermanentlyShadowed: z.boolean(),
  annualIlluminationPct: z.number(),
});
export type TerrainElevationSample = z.infer<typeof terrainElevationSampleSchema>;

export const roughnessHazardLevelEnum = z.enum(['SMOOTH', 'MODERATE', 'ROUGH', 'HAZARDOUS']);
export type RoughnessHazardLevel = z.infer<typeof roughnessHazardLevelEnum>;

export const terrainSafetyRecommendationEnum = z.enum(['GO', 'CAUTION', 'ABORT']);
export type TerrainSafetyRecommendation = z.infer<typeof terrainSafetyRecommendationEnum>;

export interface BeckmannRoughnessStats {
  rmsSlope_s: number;
  roughnessTheta0Deg: number;
  hazardLevel: RoughnessHazardLevel;
  recommendation: TerrainSafetyRecommendation;
  sigmaH: number;
  correlationLengthL: number;
  description: string;
}

export interface SlopeRoughnessResult {
  slopeDeg: number;
  rmsSlope_s: number;
  beckmannRoughnessTheta0Deg: number;
  isTipOverHazard: boolean;
  roughnessHazard: RoughnessHazardLevel;
  recommendation: TerrainSafetyRecommendation;
  elevationMeters: number;
}

export const slopeRoughnessQuerySchema = z.object({
  latDeg: z
    .number()
    .min(-90.0, 'Latitude cannot be less than -90.0°')
    .max(-80.0, 'Latitude must be in the South Pole region (<= -80.0°)'),
  lonDeg: z.number().min(-360).max(360),
  sampleRadiusMeters: z.number().positive().optional(),
});
export const SlopeRoughnessQuerySchema = slopeRoughnessQuerySchema;
export const TerrainRoughnessQuerySchema = slopeRoughnessQuerySchema;
export type SlopeRoughnessQueryInput = z.infer<typeof slopeRoughnessQuerySchema>;

export const slopeRoughnessResponseSchema = z.object({
  slopeDeg: z.number(),
  rmsSlope_s: z.number(),
  beckmannRoughnessTheta0Deg: z.number(),
  isTipOverHazard: z.boolean(),
  roughnessHazard: roughnessHazardLevelEnum,
  recommendation: terrainSafetyRecommendationEnum,
  elevationMeters: z.number(),
});
export const SlopeRoughnessResponseSchema = slopeRoughnessResponseSchema;
export const TerrainRoughnessSchema = slopeRoughnessResponseSchema;
export type SlopeRoughnessResponse = z.infer<typeof slopeRoughnessResponseSchema>;
export type TerrainRoughness = SlopeRoughnessResponse;

export const tieredElevationQuerySchema = z.object({
  latitudeDeg: z
    .number()
    .min(-90.0, 'Latitude must be >= -90.0°')
    .max(-80.0, 'Latitude must be <= -80.0°'),
  longitudeDeg: z.number(),
  preferredTier: z.number().int().min(1).max(4).optional(),
});
export const TieredElevationQuerySchema = tieredElevationQuerySchema;
export const TerrainElevationQuerySchema = tieredElevationQuerySchema;
export type TieredElevationQueryInput = z.infer<typeof tieredElevationQuerySchema>;

export const tieredElevationResponseSchema = z.object({
  latitudeDeg: z.number(),
  longitudeDeg: z.number(),
  elevationMeters: z.number(),
  slopeDeg: z.number(),
  activeTier: z.number().int().min(1).max(4),
  tierName: z.string(),
  resolutionMetersPerPx: z.number(),
  provenance: z.string(),
  resolutionSmoothingBiasWarning: z.boolean(),
  status: evaluationStatusEnum.optional(),
});
export const TieredElevationResponseSchema = tieredElevationResponseSchema;
export const TerrainElevationSchema = tieredElevationResponseSchema;
export type TieredElevationResponse = z.infer<typeof tieredElevationResponseSchema>;
export type TerrainElevation = TieredElevationResponse;

export const horizonBinStatusEnum = z.enum([
  'valid',
  'incomplete_range_truncated',
  'nodata',
]);
export type HorizonBinStatus = z.infer<typeof horizonBinStatusEnum>;

export const horizonProfileSchema = z.object({
  elevationNominalDeg: z.array(z.number()).length(360),
  thetaLowDeg: z.array(z.number()).length(360),
  thetaHighDeg: z.array(z.number()).length(360),
  blockerDistanceKm: z.array(z.number()).length(360),
  blockerElevationMeters: z.array(z.number()).length(360),
  binStatus: z.array(horizonBinStatusEnum).length(360),
});
export type HorizonProfile = z.infer<typeof horizonProfileSchema>;

export const horizonAssetSchema = z.object({
  siteId: z.string(),
  mastHeightsMeters: z.array(z.number()).default([1.0, 2.0, 5.0, 10.0]),
  azimuthBinsCount: z.literal(360),
  stepDeg: z.literal(1.0),
  profiles: z.record(z.string(), horizonProfileSchema),
  provenance: z.record(z.string(), z.unknown()).optional(),
});
export const HorizonAssetSchema = horizonAssetSchema;
export type HorizonAsset = z.infer<typeof horizonAssetSchema>;

/** Task 4.1/4.2: per-bin blocker record served by POST /api/v1/horizons. */
export const horizonBlockerSchema = z.object({
  azimuthDeg: z.number(),
  azimuthSectorDeg: z.tuple([z.number(), z.number()]),
  maskElevationDeg: z.number(),
  ridgeDistanceKm: z.number(),
  blockerElevationMeters: z.number(),
  binStatus: horizonBinStatusEnum,
});
export type HorizonBlocker = z.infer<typeof horizonBlockerSchema>;

export const horizonProfileResponseSchema = z.object({
  siteId: z.string(),
  mastHeightMeters: z.number(),
  azimuthBinsCount: z.number().int(),
  stepDeg: z.number(),
  bins: z.array(horizonBlockerSchema),
  provenance: z.object({
    dataset: z.string(),
    z0ObserverMeters: z.number(),
    rMaxMeters: z.number(),
    note: z.string().optional(),
  }),
  status: evaluationStatusEnum,
});
export type HorizonProfileResponse = z.infer<typeof horizonProfileResponseSchema>;

