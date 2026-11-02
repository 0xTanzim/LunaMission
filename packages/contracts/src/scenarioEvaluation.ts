import { z } from 'zod';
import { evaluationStatusEnum } from './common';

export const sixStateResultStatusSchema = evaluationStatusEnum;
export type SixStateResultStatus = z.infer<typeof sixStateResultStatusSchema>;

export const siteEntityTypeEnum = z.enum([
  'candidate_region', 'research_candidate_point', 'historical_touchdown', 'negative_control', 'custom_coordinate',
]);
export type SiteEntityType = z.infer<typeof siteEntityTypeEnum>;

export const scenarioCoordinatesSchema = z.object({
  latitudeDeg: z.number(),
  longitudeEastDeg: z.number(),
  elevationMeters: z.number(),
  referenceDatum: z.string().default('IAU_MOON_ME'),
  referenceRadiusKm: z.number().default(1737.4),
});
export type ScenarioCoordinates = z.infer<typeof scenarioCoordinatesSchema>;

export const siteInfoSchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  entityType: siteEntityTypeEnum,
  coordinates: scenarioCoordinatesSchema,
  landmark: z.string(),
  dipAngleDeg: z.number(),
  officialRegionReference: z.string().optional(),
  provenanceCitations: z.array(z.string()),
});
export type SiteInfo = z.infer<typeof siteInfoSchema>;

/**
 * ## C14 — Manifest supplements for third-party reconstruction
 *
 * Additive and optional: a manifest written before these blocks existed still validates, and a
 * reader that ignores them loses no previously published information. Everything here is a pure
 * function of the checked-in repository state or of `process.env` read once at startup, so the
 * run fingerprint stays reproducible: no wall clock, no host name, no request identifier enters
 * any of these fields.
 */

/** SHA-256 of a checked-in dataset file, so a reader can prove it has the same bytes. */
export const analysisRunDatasetChecksumSchema = z.object({
  datasetId: z.string(),
  role: z.enum(['terrain_horizon', 'site_registry']),
  /** Repository-relative path, so the file can be located without guessing. */
  path: z.string(),
  sha256: z.string().length(64),
  bytes: z.number().int().nonnegative(),
});
export type AnalysisRunDatasetChecksum = z.infer<typeof analysisRunDatasetChecksumSchema>;

/** A dataset/model identifier that actually entered the computation. */
export const analysisRunKernelSchema = z.object({
  role: z.enum(['ephemeris', 'terrain', 'frame', 'time_scale', 'solver']),
  identifier: z.string(),
  provider: z.string(),
  note: z.string().optional(),
});
export type AnalysisRunKernel = z.infer<typeof analysisRunKernelSchema>;

/**
 * The numerical knobs a third party must match to reproduce the numbers. These are the solver
 * and integration resolutions, not physical accuracy claims (skill ref 07 § 4: root-solver
 * tolerance is not physical event-time accuracy).
 */
export const analysisRunNumericalTolerancesSchema = z.object({
  rootBracketToleranceSec: z.number().positive(),
  tangentialGrazeToleranceDeg: z.number().positive(),
  azimuthBins: z.number().int().positive(),
  azimuthStepDeg: z.number().positive(),
  /**
   * Azimuth quadrature of the finite-disk solid-angle integration (masterplan § 6.1). Reproducing
   * the run means calling `integrateVisibleSolarDisk` with exactly these two options: the
   * integrator's internal column floor is then part of the code under the recorded commit.
   */
  solarDiskQuadrature: z.object({
    azimuthStepDeg: z.number().positive(),
    limbDarkeningCoefficient: z.number().min(0).max(1),
  }),
  /** Ephemeris sampling cadence supplied to the visibility solver. */
  ephemerisSampleIntervalSec: z.number().int().positive().optional(),
});
export type AnalysisRunNumericalTolerances = z.infer<typeof analysisRunNumericalTolerancesSchema>;

export const analysisRunManifestSchema = z.object({
  manifestVersion: z.literal('1.0.0'),
  canonicalization: z.literal('recursively-key-sorted-json'),
  /** SHA-256 over the canonicalized scenario inputs plus the full provenance contract. */
  runFingerprintSha256: z.string().length(64),
  /** SHA-256 over the canonicalized deterministic outputs of the evaluation. */
  outputFingerprintSha256: z.string().length(64),
  algorithmVersion: z.string(),
  solverConfig: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])),
  ephemerisSource: z.string(),
  ephemerisDataset: z.string(),
  terrainProductId: z.string(),
  terrainSpatialResolutionM: z.number(),
  horizonGrid: z.object({
    azimuthBins: z.number().int().positive(),
    stepDeg: z.number().positive(),
  }),
  scenarioInputs: z.record(z.string(), z.unknown()),
  /** Commit of the application code that produced this run; `"unknown"` when not injected. */
  applicationCommit: z.string().optional(),
  /** Content digests of the checked-in datasets that fed this run, sorted by `datasetId`. */
  datasetChecksums: z.array(analysisRunDatasetChecksumSchema).optional(),
  /** Ephemeris, terrain, frame and solver identifiers actually used. */
  kernelVersions: z.array(analysisRunKernelSchema).optional(),
  numericalTolerances: analysisRunNumericalTolerancesSchema.optional(),
});
export type AnalysisRunManifest = z.infer<typeof analysisRunManifestSchema>;

export const provenanceManifestSchema = z.object({
  calculationId: z.string(),
  engineVersion: z.string(),
  timestampUtc: z.string(),
  ephemerisSource: z.string(),
  ephemerisDataset: z.string(),
  timeScaleOffsetTtMinusUtcSec: z.number(),
  terrainModelSource: z.string(),
  terrainSpatialResolutionM: z.number(),
  horizonProfileAzimuthBins: z.number(),
  solverAlgorithm: z.string(),
  rootBracketToleranceSec: z.number(),
  tangentialGrazeToleranceDeg: z.number(),
  casCacheHit: z.boolean(),
  analysisRunManifest: analysisRunManifestSchema.optional(),
});
export type ProvenanceManifest = z.infer<typeof provenanceManifestSchema>;

export const solarIntervalStatusEnum = z.enum(['full_sun', 'partial_limb', 'terrain_shadow', 'sub_horizon']);
export type SolarIntervalStatus = z.infer<typeof solarIntervalStatusEnum>;

export const earthIntervalStatusEnum = z.enum([
  'visible', 'terrain_blocked', 'sub_horizon', 'earth_direct', 'earth_occluded', 'earth_sub_horizon',
]);
export type EarthIntervalStatus = z.infer<typeof earthIntervalStatusEnum>;

export const overlapIntervalStatusEnum = z.enum([
  'sun_and_earth', 'sun_only', 'earth_only', 'dark_and_blocked', 'overlap_active', 'overlap_inactive',
]);
export type OverlapIntervalStatus = z.infer<typeof overlapIntervalStatusEnum>;

export const blockerMetadataSchema = z.object({
  azimuthDeg: z.number(),
  distanceKm: z.number(),
  elevationMeters: z.number(),
  featureName: z.string().optional(),
});
export type BlockerMetadata = z.infer<typeof blockerMetadataSchema>;

export const evaluatedSubIntervalSchema = z.object({
  startEpochMs: z.number(),
  endEpochMs: z.number(),
  startDateUtc: z.string(),
  endDateUtc: z.string(),
  durationHours: z.number(),
  sun: z.object({
    status: solarIntervalStatusEnum,
    fractionalSolarDiskVisibility: z.number(),
    /** Limb-darkened visible irradiance fraction; the correct solar flux proxy for power. */
    irradianceWeightedDiskFraction: z.number().optional(),
    meanElevationDeg: z.number(),
    meanAzimuthDeg: z.number(),
    meanHorizonMaskDeg: z.number(),
    clearanceDeg: z.number(),
    blocker: blockerMetadataSchema.nullable(),
  }),
  earth: z.object({
    status: earthIntervalStatusEnum,
    meanElevationDeg: z.number(),
    meanAzimuthDeg: z.number(),
    meanHorizonMaskDeg: z.number(),
    clearanceDeg: z.number(),
  }),
  overlap: z.object({
    status: overlapIntervalStatusEnum,
    isMissionCriticalWindow: z.boolean(),
  }),
});
export type EvaluatedSubInterval = z.infer<typeof evaluatedSubIntervalSchema>;

export const summaryMetricsSchema = z.object({
  totalEvaluationHours: z.number(),
  cumulativeSunlitHours: z.number(),
  solarAccessPercentage: z.number(),
  longestContinuousSunlitWindowHours: z.number(),
  longestContinuousDarkWindowHours: z.number(),
  cumulativeDteHours: z.number(),
  dteAccessPercentage: z.number(),
  longestDteGapHours: z.number(),
  cumulativeOverlapHours: z.number(),
  overlapPercentage: z.number(),
  topographicShadowPenaltyHours: z.number(),
});
export type SummaryMetrics = z.infer<typeof summaryMetricsSchema>;

export const eventWhiskerSchema = z.object({
  eventEpochMs: z.number(),
  eventDateUtc: z.string(),
  eventType: z.enum(['SUNRISE', 'SUNSET', 'EARTH_RISE', 'EARTH_SET']),
  azimuthDeg: z.number(),
  tLowDateUtc: z.string(),
  tNominalDateUtc: z.string(),
  tHighDateUtc: z.string(),
  whiskerSpanHours: z.number(),
  sensitivityRating: z.enum(['LOW', 'MODERATE', 'HIGH']),
});
export type EventWhisker = z.infer<typeof eventWhiskerSchema>;

export const uncertaintyEnvelopeSchema = z.object({
  nominalMetrics: summaryMetricsSchema,
  thetaLowMetrics: summaryMetricsSchema,
  thetaHighMetrics: summaryMetricsSchema,
  eventWhiskers: z.array(eventWhiskerSchema),
});
export type UncertaintyEnvelope = z.infer<typeof uncertaintyEnvelopeSchema>;

export const scenarioEvaluateRequestSchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  startUtc: z.string().datetime().default('2026-11-01T00:00:00.000Z'),
  stopUtc: z.string().datetime().default('2026-11-15T00:00:00.000Z'),
  observerMastHeightM: z.union([z.literal(1.0), z.literal(2.0), z.literal(5.0), z.literal(10.0)]).default(2.0),
  sunVisibilityCriterion: z.enum(['upperLimb', 'fullDisk']).default('upperLimb'),
  earthVisibilityCriterion: z.enum(['center', 'fullDisk', 'anyLimb']).default('center'),
  launchSlipOffsetDays: z.number().min(0.0).max(28.0).default(0.0),
  sampleIntervalSec: z.number().int().min(60).max(3600).default(600),
  calculationMode: z.string().optional(),
  observerHeightMeters: z.number().optional(),
}).refine((d) => new Date(d.stopUtc).getTime() > new Date(d.startUtc).getTime(), {
  message: 'stopUtc must be strictly greater than startUtc', path: ['stopUtc'],
}).refine((d) => (new Date(d.stopUtc).getTime() - new Date(d.startUtc).getTime()) <= 28 * 86400000, {
  message: 'Scenario evaluation window cannot exceed 28 days (672 hours)', path: ['stopUtc'],
});
export type ScenarioEvaluateRequest = z.infer<typeof scenarioEvaluateRequestSchema>;
export const ScenarioEvaluateRequestSchema = scenarioEvaluateRequestSchema;

export const horizonProfileBinSchema = z.object({
  azimuthDeg: z.number(),
  thetaNomDeg: z.number().optional(),
  thetaLowDeg: z.number().optional(),
  thetaHighDeg: z.number().optional(),
  elevationDeg: z.number().optional(),
  featureName: z.string().optional(),
});
export type HorizonProfileBin = z.infer<typeof horizonProfileBinSchema>;

export const canonicalScenarioEvaluateResponseSchema = z.object({
  calculationId: z.string(),
  status: sixStateResultStatusSchema,
  siteId: z.string().optional(),
  siteName: z.string().optional(),
  siteInfo: siteInfoSchema,
  scenarioConfig: z.object({
    requestedStartUtc: z.string(),
    requestedStopUtc: z.string(),
    effectiveStartUtc: z.string(),
    effectiveStopUtc: z.string(),
    launchSlipOffsetDays: z.number(),
    observerMastHeightM: z.number(),
    sunVisibilityCriterion: z.enum(['upperLimb', 'fullDisk']),
    earthVisibilityCriterion: z.enum(['center', 'fullDisk', 'anyLimb']),
    sampleIntervalSec: z.number(),
  }),
  metrics: summaryMetricsSchema,
  intervals: z.array(evaluatedSubIntervalSchema),
  uncertaintyEnvelopes: uncertaintyEnvelopeSchema,
  provenance: provenanceManifestSchema,
  horizonProfile: z.array(horizonProfileBinSchema).optional(),
});

export const legacyScenarioEvaluateResponseSchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  coordinates: z.record(z.string(), z.unknown()),
  epochIso: z.string().optional(),
  epochMs: z.number().optional(),
  calculationMode: z.string().optional(),
  status: sixStateResultStatusSchema,
  solarElevationDeg: z.number().nullable().optional(),
  solarAzimuthDeg: z.number().nullable().optional(),
  earthElevationDeg: z.number().nullable().optional(),
  earthAzimuthDeg: z.number().nullable().optional(),
  isSolarBlockedByTerrain: z.boolean().optional(),
  isEarthBlockedByTerrain: z.boolean().optional(),
});

export const scenarioEvaluateResponseSchema = canonicalScenarioEvaluateResponseSchema;
export type ScenarioEvaluateResponse = z.infer<typeof canonicalScenarioEvaluateResponseSchema>;
export const ScenarioEvaluateResponseSchema = scenarioEvaluateResponseSchema;
export const EvaluationResponseSchema = legacyScenarioEvaluateResponseSchema;
export type EvaluationResponse = ScenarioEvaluateResponse;
