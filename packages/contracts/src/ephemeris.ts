import { z } from 'zod';
import { lunarCoordinatesSchema } from './sites';

export const calculationModeSchema = z.enum(['geometry-only', 'terrain-aware']);
export type CalculationMode = z.infer<typeof calculationModeSchema>;

export type ValidationState = 'passed' | 'pending' | 'failed' | 'not-assessed';
export type EarthVisibilityState = 'visible' | 'sub-horizon' | 'indeterminate' | 'unavailable';
export type IlluminationState = 'illuminated' | 'partial-penumbra' | 'shadowed' | 'indeterminate';

export const ephemerisQuerySchema = z.object({
  siteId: z.string().min(1, 'siteId is required'),
  epochMs: z.number().finite('epochMs must be a finite number'),
  calculationMode: calculationModeSchema.default('geometry-only'),
});

export const EphemerisConditionsRequestSchema = ephemerisQuerySchema;
export type EphemerisQuery = z.infer<typeof ephemerisQuerySchema>;
export type EphemerisQueryPayload = EphemerisQuery;
export type EphemerisConditionsRequest = EphemerisQuery;

export const solarIlluminationSchema = z
  .object({
    fractionalIllumination: z.number().optional(),
    solarElevationDeg: z.number().nullable().optional(),
    solarAzimuthDeg: z.number().nullable().optional(),
    isIlluminated: z.boolean().optional(),
    directSolarFluxWattsPerM2: z.number().optional(),
    solarDiskFraction: z.number().optional(),
    limbDarkenedFluxFraction: z.number().optional(),
    effectiveSolarFluxWm2: z.number().optional(),
    occultationState: z.string().optional(),
    localTerrainElevationDeg: z.number().optional(),
    terrainObstructionDeg: z.number().optional(),
    geometricSunVisible: z.boolean().optional(),
    apparentSubtenseArcmin: z.number().optional(),
    grazingAngleThresholdDeg: z.number().optional(),
    isGrazingIncidence: z.boolean().optional(),
    earthElevationDeg: z.number().nullable().optional(),
    earthAzimuthDeg: z.number().nullable().optional(),
  })
  .passthrough();

export type SolarIllumination = z.infer<typeof solarIlluminationSchema>;

export const ephemerisConditionsResponseSchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  coordinates: lunarCoordinatesSchema,
  epochIso: z.string(),
  epochMs: z.number(),
  calculationMode: calculationModeSchema,
  solarElevationDeg: z.number().nullable(),
  solarAzimuthDeg: z.number().nullable(),
  solarIllumination: solarIlluminationSchema,
  earthElevationDeg: z.number().nullable(),
  earthAzimuthDeg: z.number().nullable(),
  earthDistanceKm: z.number(),
  lightTimeSeconds: z.number(),
  provenance: z.record(z.string(), z.any()).optional(),
  source: z.string().optional(),
});

export const EphemerisConditionsResponseSchema = ephemerisConditionsResponseSchema;
export type EphemerisConditionsResponse = z.infer<typeof ephemerisConditionsResponseSchema>;

export const ephemerisHorizonsRequestSchema = z.object({
  epochMs: z.number().finite().optional(),
});
export const EphemerisHorizonsRequestSchema = ephemerisHorizonsRequestSchema;
export type EphemerisHorizonsRequest = z.infer<typeof ephemerisHorizonsRequestSchema>;

export const ephemerisHorizonsResponseSchema = z.object({
  epochMs: z.number(),
  earthMoonDistanceKm: z.number(),
  subSolarLatDeg: z.number(),
  subSolarLonDeg: z.number(),
  subEarthLatDeg: z.number(),
  subEarthLonDeg: z.number(),
  source: z.string().optional(),
  cached: z.boolean().optional(),
});
export const EphemerisHorizonsResponseSchema = ephemerisHorizonsResponseSchema;
export type EphemerisHorizonsResponse = z.infer<typeof ephemerisHorizonsResponseSchema>;

export interface LunarEphemerisVectors {
  subSolarLatDeg: number;
  subSolarLonDeg: number;
  subEarthLatDeg: number;
  subEarthLonDeg: number;
  earthMoonDistanceKm: number;
}

/**
 * Topocentric Ephemeris Point produced by NASA JPL Horizons or high-fidelity DE421 ephemeris engine.
 * Governed by AGENTS.md § 4.3 (Quantities 4, 5, 13, 20).
 */
export const topocentricEphemerisPointSchema = z.object({
  timestampUtc: z.string(),
  epochMs: z.number(),
  azimuthDeg: z.number(),
  elevationDeg: z.number(),
  azimuthRateDegHr: z.number(),
  elevationRateDegHr: z.number(),
  angularRadiusDeg: z.number(),
  rangeKm: z.number(),
  rangeRateKmS: z.number(),
});
export type TopocentricEphemerisPoint = z.infer<typeof topocentricEphemerisPointSchema>;

export const topocentricTrajectorySchema = z.object({
  target: z.enum(['Sun', 'Earth']),
  targetCommand: z.enum(['10', '399']),
  siteId: z.string().optional(),
  observerCoordinates: z.object({
    latitudeDeg: z.number(),
    longitudeDeg: z.number(),
    elevationMeters: z.number(),
    mastHeightMeters: z.number(),
    horizonsAltKm: z.number(),
  }),
  stepSize: z.string(),
  points: z.array(topocentricEphemerisPointSchema),
  source: z.string(),
  cached: z.boolean(),
});
export type TopocentricTrajectory = z.infer<typeof topocentricTrajectorySchema>;

