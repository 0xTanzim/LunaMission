import { describe, expect, test } from 'bun:test';
import {
  // Common & Errors
  apiStatusEnum,
  ApiStatusEnum,
  evaluationStatusEnum,
  EvaluationStatusEnum,
  apiErrorResponseSchema,
  ApiErrorResponseSchema,

  // Scenarios
  scenarioEvaluateRequestSchema,
  ScenarioEvaluateRequestSchema,
  scenarioEvaluateResponseSchema,
  EvaluationResponseSchema,
  scenarioCompareRequestSchema,
  ScenarioCompareRequestSchema,
  scenarioCompareResponseSchema,
  ComparisonResponseSchema,

  // Sites
  siteCategorySchema,
  siteQuerySchema,
  candidateSiteSchema,
  SiteSchema,
  siteCatalogResponseSchema,
  SitesListResponseSchema,
  SitesRegistryResponseSchema,
  siteDetailResponseSchema,
  SiteDetailResponseSchema,
  reconnaissanceLinksSchema,
  coordinateDatumSchema,
  type CandidateSite,
  type SiteCatalogResponse,
  type SiteDetailResponse,

  // Telemetry
  dsnSignalSchema,
  dsnDishSchema,
  topocentricVectorSchema,
  dsnTelemetryResponseSchema,
  type DsnTelemetryResponse,

  // Ephemeris
  calculationModeSchema,
  ephemerisQuerySchema,
  EphemerisConditionsRequestSchema,
  ephemerisConditionsResponseSchema,
  EphemerisConditionsResponseSchema,
  ephemerisHorizonsRequestSchema,
  EphemerisHorizonsRequestSchema,
  ephemerisHorizonsResponseSchema,
  EphemerisHorizonsResponseSchema,

  // Telecom
  frequencyBandKeySchema,
  telecomQuerySchema,
  TelecomQuerySchema,
  rfLinkBudgetSchema,
  telecomLinkBudgetResponseSchema,
  LinkBudgetSchema,
  TelecomResponseSchema,
  FREQUENCY_BANDS,
  DSN_COMPLEXES,

  // Volatiles
  temperatureCategoryEnum,
  sublimationStabilityEnum,
  extractionMethodEnum,
  volatileQuerySchema,
  volatilesProspectingResponseSchema,

  // Windows
  windowFeasibilityVerdictSchema,
  rankedLandingWindowSchema,
  windowQuerySchema,
  WindowOptimizationSchema,
  paretoOptimizationResultSchema,
  WindowOptimizationResponseSchema,

  // Safety
  safetyEvaluationQuerySchema,
  LandingSafetyRequestSchema,
  landingSafetyEvaluationResponseSchema,
  LandingSafetyEvaluationResponseSchema,
  cassaEvaluationResultSchema,
  topsisResultSchema,
  SAFETY_WEIGHTS,
  SHAP_WEIGHTS,

  // Dossier
  dossierQuerySchema,
  DossierSchema,
  missionDossierSchema,
  missionDossierResponseSchema,
  DossierResponseSchema,

  // Terrain
  slopeRoughnessQuerySchema,
  SlopeRoughnessQuerySchema,
  slopeRoughnessResponseSchema,
  TerrainRoughnessSchema,
  tieredElevationQuerySchema,
  TieredElevationQuerySchema,
  tieredElevationResponseSchema,
  TerrainElevationSchema,
} from '../src';

describe('@luna/contracts - Canonical Aerospace Contract Schemas & DTOs', () => {
  describe('common.ts & errors.ts', () => {
    test('validates apiStatusEnum for 5-state UI lifecycle', () => {
      expect(apiStatusEnum.parse('loading')).toBe('loading');
      expect(apiStatusEnum.parse('empty')).toBe('empty');
      expect(apiStatusEnum.parse('incomplete')).toBe('incomplete');
      expect(apiStatusEnum.parse('unsupported')).toBe('unsupported');
      expect(apiStatusEnum.parse('failed')).toBe('failed');
      expect(() => apiStatusEnum.parse('invalid_state')).toThrow();
    });

    test('validates evaluationStatusEnum for 6-state scientific status', () => {
      expect(evaluationStatusEnum.parse('valid')).toBe('valid');
      expect(evaluationStatusEnum.parse('valid-with-limitations')).toBe('valid-with-limitations');
      expect(evaluationStatusEnum.parse('approximate')).toBe('approximate');
      expect(evaluationStatusEnum.parse('incomplete')).toBe('incomplete');
      expect(evaluationStatusEnum.parse('unsupported')).toBe('unsupported');
      expect(evaluationStatusEnum.parse('failed')).toBe('failed');
    });

    test('validates apiErrorResponseSchema format', () => {
      const err = {
        error: 'Failed to evaluate horizon profile',
        code: 'ERR_HORIZON_FAILED',
        status: 'failed' as const,
        details: { siteId: 'shackleton-rim' },
      };
      const parsed = ApiErrorResponseSchema.parse(err);
      expect(parsed.error).toBe('Failed to evaluate horizon profile');
      expect(parsed.status).toBe('failed');
    });
  });

  describe('scenarios.ts', () => {
    test('validates scenarioEvaluateRequestSchema and response', () => {
      const req = { siteId: 'shackleton-rim', calculationMode: 'terrain-aware' as const };
      const parsedReq = ScenarioEvaluateRequestSchema.parse(req);
      expect(parsedReq.siteId).toBe('shackleton-rim');

      const res = {
        siteId: 'shackleton-rim',
        siteName: 'Shackleton Crater Rim',
        coordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 4250 },
        epochIso: '2026-10-26T12:00:00.000Z',
        epochMs: 1774872000000,
        calculationMode: 'terrain-aware' as const,
        status: 'valid' as const,
        solarElevationDeg: 1.25,
        solarAzimuthDeg: 45.0,
        earthElevationDeg: 6.8,
        earthAzimuthDeg: 180.0,
        isSolarBlockedByTerrain: false,
        isEarthBlockedByTerrain: false,
      };
      const parsedRes = EvaluationResponseSchema.parse(res);
      expect(parsedRes.status).toBe('valid');
      expect(parsedRes.siteId).toBe('shackleton-rim');
    });

    test('validates scenarioCompareRequestSchema and response', () => {
      const req = { siteIds: ['shackleton-rim', 'connecting-ridge'] };
      const parsedReq = ScenarioCompareRequestSchema.parse(req);
      expect(parsedReq.siteIds.length).toBe(2);

      const res = {
        epochIso: '2026-10-26T12:00:00.000Z',
        epochMs: 1774872000000,
        calculationMode: 'terrain-aware' as const,
        status: 'valid' as const,
        rankedSites: [
          {
            siteId: 'shackleton-rim',
            siteName: 'Shackleton Crater Rim',
            rank: 1,
            relativeCloseness: 0.85,
            cassaViable: true,
            meanSlopeDeg: 4.2,
            avgIlluminationPct: 82.0,
            dteVisibilityPct: 75.0,
          },
        ],
      };
      const parsedRes = ComparisonResponseSchema.parse(res);
      expect(parsedRes.rankedSites[0].rank).toBe(1);
    });
  });

  describe('sites.ts', () => {
    test('validates siteQuerySchema with valid and default inputs', () => {
      expect(siteQuerySchema.parse({}).category).toBeUndefined();
      expect(siteQuerySchema.parse({ category: 'artemis-iii-2024' }).category).toBe('artemis-iii-2024');
    });

    test('validates SiteSchema and candidateSiteSchema', () => {
      const site: CandidateSite = {
        id: 'shackleton-rim',
        code: 'SITE-001',
        name: 'Shackleton Crater Rim',
        priority: 'Artemis III Candidate',
        description: 'Test description',
        coordinates: {
          latitudeDeg: -89.9,
          longitudeDeg: 0,
          elevationMeters: 4250,
        },
      };
      const parsed = SiteSchema.parse(site);
      expect(parsed.id).toBe('shackleton-rim');
    });

    test('validates SitesListResponseSchema / SitesRegistryResponseSchema', () => {
      const resp: SiteCatalogResponse = {
        metadata: {
          catalogName: 'Artemis Catalog',
          catalogVersion: '2026',
          lineage: 'NASA',
          coordinateConvention: 'IAU ME',
          elevationDatum: 'R=1737.4 km',
          totalSites: 1,
          filteredCount: 1,
        },
        sites: [
          {
            id: 'shackleton-rim',
            code: 'SITE-001',
            name: 'Shackleton Crater Rim',
            priority: 'Artemis III Candidate',
            description: 'Test',
            coordinates: { latitudeDeg: -89.9, longitudeDeg: 0, elevationMeters: 4250 },
          },
        ],
      };
      const parsed = SitesRegistryResponseSchema.parse(resp);
      expect(parsed.metadata.totalSites).toBe(1);
    });
  });

  describe('ephemeris.ts', () => {
    test('validates EphemerisConditionsRequestSchema and Response', () => {
      const req = { siteId: 'connecting-ridge', epochMs: 1774872000000 };
      const parsedReq = EphemerisConditionsRequestSchema.parse(req);
      expect(parsedReq.siteId).toBe('connecting-ridge');

      const res = {
        siteId: 'connecting-ridge',
        siteName: 'Connecting Ridge',
        coordinates: { latitudeDeg: -89.44, longitudeDeg: 222.5, elevationMeters: 3820 },
        epochIso: '2026-10-26T12:00:00Z',
        epochMs: 1774872000000,
        calculationMode: 'geometry-only' as const,
        solarElevationDeg: 1.2,
        solarAzimuthDeg: 220.0,
        solarIllumination: { fractionalIllumination: 0.9 },
        earthElevationDeg: 5.4,
        earthAzimuthDeg: 180.0,
        earthDistanceKm: 384400,
        lightTimeSeconds: 1.28,
      };
      const parsedRes = EphemerisConditionsResponseSchema.parse(res);
      expect(parsedRes.earthDistanceKm).toBe(384400);
    });

    test('validates EphemerisHorizonsRequestSchema and Response', () => {
      const req = { epochMs: 1774872000000 };
      expect(EphemerisHorizonsRequestSchema.parse(req).epochMs).toBe(1774872000000);

      const res = {
        epochMs: 1774872000000,
        earthMoonDistanceKm: 384400,
        subSolarLatDeg: -1.5,
        subSolarLonDeg: 45.0,
        subEarthLatDeg: 6.2,
        subEarthLonDeg: 180.0,
      };
      expect(EphemerisHorizonsResponseSchema.parse(res).earthMoonDistanceKm).toBe(384400);
    });
  });

  describe('terrain.ts', () => {
    test('validates SlopeRoughnessQuerySchema and TerrainRoughnessSchema', () => {
      const q = { latDeg: -89.5, lonDeg: 120.0 };
      expect(SlopeRoughnessQuerySchema.parse(q).latDeg).toBe(-89.5);

      const res = {
        slopeDeg: 3.8,
        rmsSlope_s: 0.045,
        beckmannRoughnessTheta0Deg: 2.5,
        isTipOverHazard: false,
        roughnessHazard: 'SMOOTH' as const,
        recommendation: 'GO' as const,
        elevationMeters: 3820,
      };
      const parsedRes = TerrainRoughnessSchema.parse(res);
      expect(parsedRes.roughnessHazard).toBe('SMOOTH');
    });

    test('validates TieredElevationQuerySchema and TerrainElevationSchema', () => {
      const q = { latitudeDeg: -89.5, longitudeDeg: 120.0 };
      expect(TieredElevationQuerySchema.parse(q).latitudeDeg).toBe(-89.5);

      const res = {
        latitudeDeg: -89.5,
        longitudeDeg: 120.0,
        elevationMeters: 4120.0,
        slopeDeg: 3.5,
        activeTier: 2,
        tierName: 'PGDA_PRODUCT_78_5M',
        resolutionMetersPerPx: 5,
        provenance: 'NASA PGDA Product 78',
        resolutionSmoothingBiasWarning: false,
        status: 'valid' as const,
      };
      const parsedRes = TerrainElevationSchema.parse(res);
      expect(parsedRes.activeTier).toBe(2);
      expect(parsedRes.status).toBe('valid');
    });
  });

  describe('telecom.ts', () => {
    test('validates TelecomQuerySchema and LinkBudgetSchema', () => {
      const q = { siteId: 'shackleton-rim', epochMs: 1774872000000 };
      expect(TelecomQuerySchema.parse(q).siteId).toBe('shackleton-rim');

      const res = {
        siteId: 'shackleton-rim',
        siteName: 'Shackleton Crater Rim',
        epochMs: 1774872000000,
        earthElevationDeg: 6.5,
        earthDistanceKm: 384400,
        linkBudget: {
          linkState: 'locked' as const,
          frequencyGhz: 8.45,
          fsplDb: 222.6,
          eirpDbw: 42.0,
          receivedPowerDbm: -115.0,
          carrierToNoiseDensityDbHz: 55.0,
          ebN0Db: 8.5,
          requiredEbN0Db: 4.5,
          linkMarginDb: 4.0,
          multipathWarning: false,
          dataRateMbps: 2.0,
        },
        dsnTracking: {
          stations: [],
          activeStation: null,
        },
      };
      const parsedRes = LinkBudgetSchema.parse(res);
      expect(parsedRes.linkBudget.linkState).toBe('locked');
    });
  });

  describe('windows.ts', () => {
    test('validates WindowOptimizationSchema and WindowOptimizationResponseSchema', () => {
      const q = { siteId: 'connecting-ridge', startEpochMs: 1774872000000, endEpochMs: 1777464000000 };
      expect(WindowOptimizationSchema.parse(q).siteId).toBe('connecting-ridge');

      const res = {
        siteId: 'connecting-ridge',
        siteName: 'Connecting Ridge',
        totalWindowsEvaluated: 12,
        topWindows: [
          {
            rank: 1,
            startDateIso: '2026-10-26T12:00:00Z',
            endDateIso: '2026-11-09T12:00:00Z',
            startEpochMs: 1774872000000,
            endEpochMs: 1776081600000,
            durationDays: 14,
            sunlightPercentage: 88.5,
            continuousSunlightHours: 195,
            maxShadowHours: 12,
            dteAvailabilityPercentage: 92.0,
            minEarthElevationDeg: 4.8,
            paretoScore: 89.2,
            feasibilityVerdict: 'optimal' as const,
          },
        ],
        searchRange: {
          startIso: '2026-10-26T12:00:00Z',
          endIso: '2026-11-25T12:00:00Z',
        },
      };
      const parsedRes = WindowOptimizationResponseSchema.parse(res);
      expect(parsedRes.totalWindowsEvaluated).toBe(12);
      expect(parsedRes.topWindows[0].feasibilityVerdict).toBe('optimal');
    });
  });

  describe('safety.ts', () => {
    test('validates LandingSafetyRequestSchema and Response', () => {
      const q = {
        slopeDeg: 4.5,
        illuminationPct: 80.0,
        earthVisibilityPct: 75.0,
        volatilesScore: 60.0,
        roughnessTheta0Deg: 3.5,
      };
      expect(LandingSafetyRequestSchema.parse(q).slopeDeg).toBe(4.5);

      const res = {
        compositeScore: 78.5,
        breakdown: {
          slopeScore: 100,
          illuminationScore: 80,
          earthVisibilityScore: 75,
          volatilesScore: 60,
          roughnessScore: 95,
        },
        recommendation: 'GO' as const,
        isTipOverHazard: false,
        hazardFlags: [],
      };
      const parsedRes = LandingSafetyEvaluationResponseSchema.parse(res);
      expect(parsedRes.recommendation).toBe('GO');
      expect(SAFETY_WEIGHTS.slope).toBe(0.3);
      expect(SHAP_WEIGHTS.earthVisibility).toBe(3.39);
    });
  });

  describe('dossier.ts', () => {
    test('validates DossierSchema and DossierResponseSchema', () => {
      const q = {
        targetName: 'Shackleton Rim',
        latitudeDeg: -89.9,
        longitudeDeg: 0,
        epochMs: 1774872000000,
      };
      expect(DossierSchema.parse(q).targetName).toBe('Shackleton Rim');
    });
  });
});
