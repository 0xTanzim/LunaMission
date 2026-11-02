import { z } from 'zod';
import { frequencyBandKeyEnum } from './telecom';
import {
  summaryMetricsSchema,
  uncertaintyEnvelopeSchema,
  blockerMetadataSchema,
} from './scenarioEvaluation';

export const dossierQuerySchema = z.object({
  targetName: z.string().min(1, 'targetName is required'),
  catalogId: z.string().optional(),
  latitudeDeg: z.number().min(-90.0, 'Latitude cannot be less than -90.0°').max(-70.0, 'South-polar latitude must be between -90.0° and -70.0°'),
  longitudeDeg: z.number().finite('longitudeDeg must be a finite number'),
  elevationKm: z.number().finite('elevationKm must be finite').optional(),
  epochMs: z.number().finite('epochMs must be a finite number').default(() => Date.now()),
  telecomBand: frequencyBandKeyEnum.optional(),
  roverDestination: z.object({
    name: z.string(),
    latitudeDeg: z.number(),
    longitudeDeg: z.number(),
  }).optional(),
  siteId: z.string().optional(),
  calculationId: z.string().optional(),
  startUtc: z.string().datetime().optional(),
  stopUtc: z.string().datetime().optional(),
  observerMastHeightM: z.number().positive().optional(),
  launchSlipOffsetDays: z.number().min(0.0).max(28.0).optional(),
  sunVisibilityCriterion: z.enum(['upperLimb', 'fullDisk']).optional(),
  earthVisibilityCriterion: z.enum(['center', 'fullDisk', 'anyLimb']).optional(),
});

export const dossierGenerateSchema = dossierQuerySchema;
export const DossierSchema = dossierQuerySchema;
export const DossierRequestSchema = dossierQuerySchema;

export type DossierQuery = z.infer<typeof dossierQuerySchema>;
export type DossierInput = DossierQuery;
export type DossierGeneratePayload = DossierQuery;
export type DossierRequest = DossierQuery;

export const dossierScenarioTelemetrySchema = z.object({
  calculationId: z.string(),
  startUtc: z.string().optional(),
  stopUtc: z.string().optional(),
  effectiveStartUtc: z.string().optional(),
  effectiveStopUtc: z.string().optional(),
  launchSlipOffsetDays: z.number().optional(),
  observerMastHeightM: z.number().optional(),
  totalEvaluationHours: z.number().optional(),
  lolaHorizonProfile: z.object({
    bins: z.number(),
    minElevationDeg: z.number(),
    maxElevationDeg: z.number(),
    meanElevationDeg: z.number(),
    binStatus: z.string().optional(),
  }).optional(),
  illuminationWindows: z.object({
    totalIlluminatedHours: z.number(),
    maxContinuousSunlightHours: z.number(),
    fractionalSunlightPct: z.number(),
  }).optional(),
  earthLoSWindows: z.object({
    totalEarthLoSHours: z.number(),
    maxContinuousEarthLoSHours: z.number(),
    fractionalEarthLoSPct: z.number(),
  }).optional(),
  eventWhiskers: z.array(z.object({
    eventType: z.string(),
    nominalUtc: z.string(),
    tLowUtc: z.string(),
    tHighUtc: z.string(),
    whiskerSpanHours: z.number().optional(),
    sensitivityRating: z.string().optional(),
  })).optional(),
  tier1Gating: z.object({
    passed: z.boolean(),
    reasons: z.array(z.string()),
  }).optional(),
  metrics: summaryMetricsSchema.optional(),
  uncertaintyEnvelopes: uncertaintyEnvelopeSchema.optional(),
  horizonSummary: z.object({
    minElevationDeg: z.number(),
    maxElevationDeg: z.number(),
    meanElevationDeg: z.number(),
    prominentBlocker: blockerMetadataSchema.nullable().optional(),
  }).optional(),
  provenance: z.object({
    cacheStatus: z.enum(['HIT', 'MISS']),
    generatedAt: z.string(),
  }).optional(),
  casCacheHit: z.boolean().optional(),
});

export type DossierScenarioTelemetry = z.infer<typeof dossierScenarioTelemetrySchema>;

export const missionDossierSchema = z.object({
  id: z.string(),
  generatedAtEpochMs: z.number(),
  targetEpochMs: z.number(),
  site: z.object({
    name: z.string(),
    catalogId: z.string().optional(),
    latitudeDeg: z.number(),
    longitudeDeg: z.number(),
    elevationKm: z.number(),
    demSource: z.string(),
    iauFrame: z.string(),
    usgsAcc6: z.string().optional(),
  }),
  illumination: z.object({
    sunElevationDeg: z.number(),
    sunAzimuthDeg: z.number(),
    continuousSunlightHours: z.number(),
    solarIncidenceAngleDeg: z.number(),
    isIlluminated: z.boolean(),
    solarGrazingWarning: z.boolean(),
  }),
  telecom: z.object({
    earthElevationDeg: z.number(),
    earthAzimuthDeg: z.number(),
    isEarthVisible: z.boolean(),
    carrierBand: z.string(),
    frequencyGhz: z.number(),
    freeSpacePathLossDb: z.number(),
    linkMarginDb: z.number(),
    activeDsnStation: z.string(),
    activeDsnStationCountry: z.string(),
    multipathRisk: z.boolean(),
    diffractionLossDb: z.number().optional(),
  }),
  volatiles: z.object({
    lendNeutronSuppressionScore: z.number(),
    hydrogenWeightPct: z.number(),
    divinerTempKelvin: z.number(),
    isPermanentColdTrap: z.boolean(),
    waterIceYieldKgPerM3: z.number(),
    metricTonsPerHectare: z.number(),
    isruViabilityTier: z.enum(['High', 'Moderate', 'Marginal', 'None']),
  }),
  benchmark: z.object({
    nearestCandidateId: z.string(),
    nearestCandidateName: z.string(),
    distanceKm: z.number(),
    deltaSunElevationDeg: z.number(),
    deltaEarthElevationDeg: z.number(),
    deltaHydrogenWtPct: z.number(),
    feasibilityScore: z.number(),
    feasibilityGrade: z.string(),
  }).optional(),
  decisionScience: z.object({
    topsisScore: z.number(),
    cassaViable: z.boolean(),
    rank: z.number().optional(),
  }).optional(),
  traversal: z.object({
    destinationName: z.string(),
    totalDistanceKm: z.number(),
    averageSlopeDeg: z.number(),
    maxSlopeDeg: z.number(),
    isTraversable: z.boolean(),
    estimatedBatteryWh: z.number(),
    hazardLevel: z.string(),
  }).optional(),
  scenario: dossierScenarioTelemetrySchema.optional(),
  provenance: z.object({
    softwareVersion: z.string(),
    coordinateSystem: z.string(),
    lolaModel: z.string(),
    ephemerisEngine: z.string(),
    calculationId: z.string().optional(),
  }),
});

export type MissionDossier = z.infer<typeof missionDossierSchema>;

export const missionDossierResponseSchema = z.object({
  dossier: missionDossierSchema,
  markdown: z.string(),
  jsonTelemetry: z.string(),
  provenance: z.object({
    generator: z.string(),
    runtime: z.string(),
    generatedAt: z.string(),
  }),
  source: z.string().optional(),
});

export const MissionDossierResponseSchema = missionDossierResponseSchema;
export const DossierResponseSchema = missionDossierResponseSchema;

export type MissionDossierResponse = z.infer<typeof missionDossierResponseSchema>;
export type DossierResponse = MissionDossierResponse;
