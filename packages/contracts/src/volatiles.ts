import { z } from 'zod';

export const temperatureCategoryEnum = z.enum([
  'cryogenic_cold_trap',
  'sub_freezing_shadow',
  'illuminated_regolith',
]);

export type TemperatureCategory = z.infer<typeof temperatureCategoryEnum>;

export const sublimationStabilityEnum = z.enum([
  'perennially_stable',
  'geologically_transient',
  'rapidly_sublimating',
]);

export type SublimationStability = z.infer<typeof sublimationStabilityEnum>;

export const extractionMethodEnum = z.enum([
  'sublimation_tent',
  'deep_thermal_coring',
  'unviable',
]);

export type ExtractionMethod = z.infer<typeof extractionMethodEnum>;

export const volatileQuerySchema = z.object({
  latDeg: z.number().min(-90).max(-70),
  lonDeg: z.number().min(-360).max(360),
});

export const volatileProspectSchema = volatileQuerySchema;

export type VolatileQuery = z.infer<typeof volatileQuerySchema>;
export type VolatileProspectInput = VolatileQuery;

export const volatileProspectingResultSchema = z.object({
  coordinates: z.object({
    latDeg: z.number(),
    lonDeg: z.number(),
  }),
  elevationMeters: z.number(),
  isPsr: z.boolean(),
  divinerTempKelvin: z.number(),
  temperatureCategory: temperatureCategoryEnum,
  epithermalNeutronFluxCps: z.number(),
  hydrogenWeightPct: z.number(),
  waterEquivalentHydrogenPct: z.number(),
  estimatedIceDensityKgPerM3: z.number(),
  iceYieldMetricTonsPerHectare: z.number(),
  sublimationStability: sublimationStabilityEnum,
  isruFeasibilityScore: z.number(),
  extractionMethod: extractionMethodEnum,
  source: z.string().optional(),
});

export type VolatileProspectingResult = z.infer<typeof volatileProspectingResultSchema>;

export const volatilesProspectingResponseSchema = z.object({
  success: z.boolean().optional(),
  timestamp: z.number().optional(),
  data: volatileProspectingResultSchema,
  source: z.string().optional(),
});

export type VolatilesProspectingResponse = z.infer<typeof volatilesProspectingResponseSchema>;

export const WATER_ICE_STABILITY_TEMP_KELVIN = 110.0;
export const DRY_LUNAR_REGOLITH_CPS = 12.8;
export const MIN_LEND_SUPPRESSION_CPS = 6.2;
export const LUNAR_REGOLITH_DENSITY_KG_M3 = 1500.0;

export interface DivinerThermalData {
  tempKelvin: number;
  category: TemperatureCategory;
  stability: SublimationStability;
}

export interface LendNeutronData {
  neutronFluxCps: number;
  hydrogenWeightPct: number;
  waterEquivalentHydrogenPct: number;
}
