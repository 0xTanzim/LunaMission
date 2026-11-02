import { z } from 'zod';

export const elevationProfilePointSchema = z.object({
  distanceKm: z.number(),
  elevationMeters: z.number(),
  label: z.string().optional(),
  slopeDeg: z.number().optional(),
  hazardTier: z.enum(['safe', 'caution', 'hazard']).optional(),
});
export type ElevationProfilePoint = z.infer<typeof elevationProfilePointSchema>;

export const siteTopographySchema = z.object({
  summitElevationMeters: z.number(),
  craterFloorElevationMeters: z.number().optional(),
  reliefSpanMeters: z.number(),
  meanSlopeDeg: z.number(),
  maxSlopeDeg: z.number(),
  traversableSlopePercentage: z.number(),
  elevationUncertaintyMeters: z.number(),
  effectiveSpatialResolution: z.string(),
  demSourceAttribution: z.string(),
  elevationProfile: z.array(elevationProfilePointSchema),
});
export type SiteTopography = z.infer<typeof siteTopographySchema>;

export const scientificSiteInvestigationSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  featureType: z.string(),
  coordinates: z.object({
    latitudeDeg: z.number(),
    longitudeDeg: z.number(),
    elevationMeters: z.number(),
    coordinateFrame: z.string(),
  }),
  topography: siteTopographySchema,
  geology: z.object({
    stratigraphicUnitCode: z.string(),
    stratigraphicUnitName: z.string(),
    geologicalEpoch: z.string(),
    estimatedAgeBillionYears: z.string(),
    lithologyInterpretation: z.string(),
    mappingConfidence: z.string(),
    sourceCitation: z.string(),
    regionalContext: z.string(),
  }),
  illuminationThermal: z.object({
    annualSolarExposurePercentage: z.number(),
    maxContinuousDarknessHours: z.number(),
    maxContinuousIlluminationHours: z.number(),
    averageSolarElevationDeg: z.number(),
    psrPresent: z.boolean(),
    psrAreaKm2: z.number().optional(),
    peakSummerTemperatureKelvin: z.number(),
    minimumShadowTemperatureKelvin: z.number(),
    measurementType: z.string(),
    coldTrapPermanence: z.string(),
  }),
  resources: z.object({
    waterEquivalentHydrogenWtPct: z
      .object({ value: z.number(), uncertainty: z.number() })
      .optional(),
    volatileEvidenceStatus: z.string(),
    primaryInstrumentSources: z.array(z.string()),
    subsurfaceIceInterpretation: z.string(),
    coldTrapStabilityDepthCm: z.string(),
    scientificCitationUrl: z.string().optional(),
    citationText: z.string(),
    cautionaryNotice: z.string(),
  }),
  missionConstraints: z.object({
    overallSuitabilityRating: z.string(),
    slopeConstraintStatus: z.string(),
    solarPowerViability: z.string(),
    directToEarthVisibilityPercentage: z.number(),
    telecomRelayRequired: z.boolean(),
    surfaceTrafficability: z.string(),
    identifiedHazards: z.array(z.string()),
  }),
  dataProvenance: z.object({
    lolaDemProduct: z.string(),
    lrocMosaicReference: z.string(),
    divinerThermalDataset: z.string(),
    lendHydrogenDataset: z.string(),
    lastVerifiedDate: z.string(),
    nasaProductUrls: z
      .object({
        lolaDem: z.string().optional(),
        lolaGlobal: z.string().optional(),
        lpiAtlas: z.string().optional(),
        lrocMosaic: z.string().optional(),
      })
      .optional(),
  }),
});
export type ScientificSiteInvestigation = z.infer<typeof scientificSiteInvestigationSchema>;
