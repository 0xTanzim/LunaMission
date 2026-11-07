/**
 * Spatiotemporal Scenario Evaluation Service
 * Milestone M5: Operational REST Decision Engine
 * Governed by docs/phase-3/API_CONTRACT.md § 3 and AGENTS.md § 4.
 */

import type {
  ScenarioEvaluateRequest,
  ScenarioEvaluateResponse,
  SiteEntityType,
} from '@luna/contracts';
import { getSiteById } from '../../data/catalog';
import { topocentricEphemerisService } from '../celestial/ephemerisService';
import { horizonProfileService } from '../celestial/horizonProfileService';
import { solveVisibility } from '../celestial/visibilitySolver';
import { EPHEMERIS_FALLBACK_CITATION, buildRunManifest } from './scenarioRunManifest';
import {
  ENGINE_VERSION,
  EPHEMERIS_DATASET,
  EPHEMERIS_SOURCE,
  HORIZON_AZIMUTH_BINS,
  ROOT_BRACKET_TOLERANCE_SEC,
  SOLVER_ALGORITHM,
  TANGENTIAL_GRAZE_TOLERANCE_DEG,
  TERRAIN_PRODUCT_ID,
  TERRAIN_RESOLUTION_M,
} from './engineIdentity';
import { scenarioCasCache } from './scenarioCasCache';
import { ScenarioError } from './scenarioErrors';
import {
  buildEventWhiskers,
  buildSensitivityMetrics,
  buildSubIntervals,
  computeSummaryMetrics,
} from './scenarioMetrics';

const SUPPORTED_MAST_HEIGHTS = [1.0, 2.0, 5.0, 10.0];

export class ScenarioService {
  async evaluateScenario(
    request: ScenarioEvaluateRequest,
    instanceUrl = '/api/v1/scenarios/evaluate',
  ): Promise<ScenarioEvaluateResponse> {
    const site = getSiteById(request.siteId);
    if (!site) {
      throw new ScenarioError({
        code: 'E_SITE_NOT_FOUND',
        title: 'Candidate Landing Site Not Found',
        status: 404,
        detail: `Requested siteId '${request.siteId}' is not present in data/sites-registry.json or curated-horizons.json.`,
        remediation: 'Query GET /api/v1/sites to retrieve the registered 20 candidate site IDs.',
      });
    }

    const mastHeight = request.observerMastHeightM ?? 2.0;
    if (!SUPPORTED_MAST_HEIGHTS.includes(mastHeight)) {
      throw new ScenarioError({
        code: 'E_UNSUPPORTED_MAST_HEIGHT',
        title: 'Unsupported Observer Mast Height',
        status: 422,
        detail: `Requested mast height ${mastHeight}m is not supported.`,
        remediation: 'Select one of the validated mast height anchors: 1.0m, 2.0m, 5.0m, or 10.0m.',
        invalidParams: [{ name: 'observerMastHeightM', reason: 'Must be one of [1.0, 2.0, 5.0, 10.0]' }],
      });
    }

    const startMs = new Date(request.startUtc).getTime();
    const stopMs = new Date(request.stopUtc).getTime();
    if (!Number.isFinite(startMs) || !Number.isFinite(stopMs) || stopMs <= startMs) {
      throw new ScenarioError({
        code: 'E_INVALID_DATE_RANGE',
        title: 'Invalid Mission Epoch Range',
        status: 422,
        detail: 'stopUtc must be strictly greater than startUtc.',
        remediation: 'Ensure startUtc precedes stopUtc in valid ISO 8601 UTC format.',
      });
    }

    const spanMs = stopMs - startMs;
    if (spanMs > 28 * 86400000) {
      throw new ScenarioError({
        code: 'E_WINDOW_EXCEEDS_MAX',
        title: 'Mission Window Exceeds Maximum Duration',
        status: 422,
        detail: 'Scenario evaluation window cannot exceed 28 days (672 hours).',
        remediation: 'Partition evaluation into sequential windows of <= 28 days.',
      });
    }

    // Apply launch slip offset
    const slipDays = request.launchSlipOffsetDays ?? 0.0;
    const slipMs = slipDays * 86400000;
    const effectiveStartUtc = new Date(startMs + slipMs).toISOString();
    const effectiveStopUtc = new Date(stopMs + slipMs).toISOString();

    // Check Content-Addressable Storage (CAS)
    const calculationId = scenarioCasCache.computeScenarioHash(request);
    const cached = await scenarioCasCache.getScenarioEvaluation(calculationId);
    if (cached) {
      // The manifest is re-derived rather than echoed: it is a pure function of this request and
      // the cached reported output, so a cache entry written by an older build still returns the
      // current C14 evidence blocks (commit, dataset digests, kernels, tolerances) instead of a
      // stale manifest that a third party could not rebuild from.
      const manifest = buildRunManifest(request, {
        status: cached.data.status,
        metrics: cached.data.metrics,
        intervalCount: cached.data.intervals.length,
      });
      return {
        ...cached.data,
        provenance: {
          ...cached.data.provenance,
          casCacheHit: true,
          analysisRunManifest: manifest,
        },
      };
    }

    // Retrieve curated horizon profile (zero Math.sin procedural terrain)
    const horizonProfile = horizonProfileService.getHorizonProfileForSite(site.id, mastHeight);

    const z0 = site.coordinates.elevationMeters;
    const r0 = 1737400.0 + z0 + mastHeight;
    const dipAngleDeg = -Math.acos(Math.min(1.0, 1737400.0 / r0)) * (180.0 / Math.PI);

    // Query dual topocentric apparent ephemerides from NASA JPL Horizons coord@301
    const { sun, earth } = await topocentricEphemerisService.getDualTopocentricTrajectories({
      latitudeDeg: site.coordinates.latitudeDeg,
      longitudeDeg: site.coordinates.longitudeDeg,
      elevationMeters: z0,
      mastHeightMeters: mastHeight,
      startTime: new Date(effectiveStartUtc),
      stopTime: new Date(effectiveStopUtc),
      siteId: site.id,
    });

    // Execute validated M4 Rolle's Theorem & Brent's Method Event-Splitting Solver
    const report = solveVisibility({
      sunTrajectory: sun,
      earthTrajectory: earth,
      horizonProfile,
      mastHeightMeters: mastHeight,
      siteId: site.id,
    });

    // Subsegment partitioning with exact finite-disk solar solid-angle integration
    const { intervals, horizonDataGap } = buildSubIntervals({
      sunTrajectory: sun,
      earthTrajectory: earth,
      horizonProfile,
      dipAngleDeg,
      report,
    });

    const totalHours = (new Date(effectiveStopUtc).getTime() - new Date(effectiveStartUtc).getTime()) / 3600000.0;
    const nominalMetrics = computeSummaryMetrics(intervals, totalHours);

    const thetaLowMetrics = buildSensitivityMetrics(
      nominalMetrics,
      report.sensitivityEnvelope.thetaLowMetrics,
      totalHours,
    );
    const thetaHighMetrics = buildSensitivityMetrics(
      nominalMetrics,
      report.sensitivityEnvelope.thetaHighMetrics,
      totalHours,
    );

    const eventWhiskers = buildEventWhiskers(report.events, horizonProfile);

    const rawEntityType = site.entityType as string | undefined;
    const entityType: SiteEntityType =
      rawEntityType === 'candidate_region' ||
      rawEntityType === 'research_candidate_point' ||
      rawEntityType === 'historical_touchdown' ||
      rawEntityType === 'negative_control' ||
      rawEntityType === 'custom_coordinate'
        ? rawEntityType
        : 'research_candidate_point';

    const isFallback = sun.source.includes('Analytical') || earth.source.includes('Analytical');
    const citations = ['NASA LOLA PGDA', 'Wueller et al. (2026)', 'Mazarico et al. (2011)'];
    if (isFallback) citations.push(EPHEMERIS_FALLBACK_CITATION);
    if (horizonDataGap) citations.push('Horizon bin truncated at DEM range limit (conservative lower bound)');

    const status = isFallback || horizonDataGap ? 'valid-with-limitations' : 'valid';

    const analysisRunManifest = buildRunManifest(request, {
      status,
      metrics: nominalMetrics,
      intervalCount: intervals.length,
    });

    const response: ScenarioEvaluateResponse = {
      calculationId,
      status,
      siteId: site.id,
      siteName: site.name,
      siteInfo: {
        siteId: site.id,
        siteName: site.name,
        entityType,
        coordinates: {
          latitudeDeg: site.coordinates.latitudeDeg,
          longitudeEastDeg: ((site.coordinates.longitudeDeg % 360) + 360) % 360,
          elevationMeters: z0,
          referenceDatum: 'IAU_MOON_ME',
          referenceRadiusKm: 1737.4,
        },
        landmark: site.description || site.name,
        dipAngleDeg: Number(dipAngleDeg.toFixed(3)),
        officialRegionReference: site.officialRegionReference,
        provenanceCitations: citations,
      },
      scenarioConfig: {
        requestedStartUtc: request.startUtc,
        requestedStopUtc: request.stopUtc,
        effectiveStartUtc,
        effectiveStopUtc,
        launchSlipOffsetDays: slipDays,
        observerMastHeightM: mastHeight,
        sunVisibilityCriterion: request.sunVisibilityCriterion ?? 'upperLimb',
        earthVisibilityCriterion: request.earthVisibilityCriterion ?? 'center',
        sampleIntervalSec: request.sampleIntervalSec ?? 600,
      },
      metrics: nominalMetrics,
      intervals,
      uncertaintyEnvelopes: {
        nominalMetrics,
        thetaLowMetrics,
        thetaHighMetrics,
        eventWhiskers,
      },
      provenance: {
        calculationId,
        engineVersion: ENGINE_VERSION,
        timestampUtc: new Date().toISOString(),
        ephemerisSource: EPHEMERIS_SOURCE,
        ephemerisDataset: EPHEMERIS_DATASET,
        timeScaleOffsetTtMinusUtcSec: 69.184,
        terrainModelSource: TERRAIN_PRODUCT_ID,
        terrainSpatialResolutionM: TERRAIN_RESOLUTION_M,
        horizonProfileAzimuthBins: HORIZON_AZIMUTH_BINS,
        solverAlgorithm: SOLVER_ALGORITHM,
        rootBracketToleranceSec: ROOT_BRACKET_TOLERANCE_SEC,
        tangentialGrazeToleranceDeg: TANGENTIAL_GRAZE_TOLERANCE_DEG,
        casCacheHit: false,
        analysisRunManifest,
      },
      horizonProfile: horizonProfile.elevationNominalDeg.map((nom: number, i: number) => ({
        azimuthDeg: Number((i * (360.0 / horizonProfile.elevationNominalDeg.length)).toFixed(2)),
        thetaNomDeg: Number(nom.toFixed(3)),
        thetaLowDeg: Number((horizonProfile.thetaLowDeg[i] ?? nom).toFixed(3)),
        thetaHighDeg: Number((horizonProfile.thetaHighDeg[i] ?? nom).toFixed(3)),
      })),
    };

    await scenarioCasCache.saveScenarioEvaluation(calculationId, response);
    return response;
  }
}

export const scenarioService = new ScenarioService();
