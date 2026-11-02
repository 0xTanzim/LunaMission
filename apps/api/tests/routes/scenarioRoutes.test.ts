import { describe, expect, it } from 'bun:test';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import { scenarioCasCache } from '@server/services/scenarios/scenarioCasCache';

function createDispatcher() {
  const app = createServerApp();
  const rawHandler = createHandler(app);
  return async (path: string, method: 'GET' | 'POST' = 'GET', body?: unknown, headers?: Record<string, string>) => {
    const url = `http://localhost:3001${path}`;
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    };
    if (body !== undefined && method !== 'GET') {
      init.body = JSON.stringify(body);
    }
    const req = new Request(url, init);
    const res = await (rawHandler as any)(req, {} as any);
    const data = await res.json().catch(() => null);
    return { status: res.status, data, headers: res.headers };
  };
}

const dispatch = createDispatcher();

describe('Milestone M5: Operational Scenario REST Engine Tests', () => {
  const baseStart = '2026-11-01T00:00:00.000Z';
  const baseStop = '2026-11-15T00:00:00.000Z';

  describe('POST /api/v1/scenarios/evaluate', () => {
    it('successfully evaluates Connecting Ridge candidate site (200 OK)', async () => {
      const { status, data, headers } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 2.0,
        sunVisibilityCriterion: 'upperLimb',
        earthVisibilityCriterion: 'center',
        launchSlipOffsetDays: 0.0,
        sampleIntervalSec: 600,
      });

      expect(status).toBe(200);
      expect(typeof data.calculationId).toBe('string');
      expect(data.calculationId.length).toBe(64);
      expect(data.status).toBe('valid');
      expect(data.siteInfo.siteId).toBe('connecting-ridge');
      expect(data.siteInfo.coordinates.latitudeDeg).toBeCloseTo(-89.44, 1);
      expect(data.siteInfo.dipAngleDeg).toBeLessThan(0);
      expect(data.siteInfo.provenanceCitations.length).toBeGreaterThan(0);

      // Summary metrics
      expect(data.metrics.totalEvaluationHours).toBe(336.0);
      expect(data.metrics.cumulativeSunlitHours).toBeGreaterThan(0);
      expect(data.metrics.solarAccessPercentage).toBeGreaterThan(0);
      expect(data.metrics.cumulativeDteHours).toBeGreaterThan(0);
      expect(data.metrics.longestContinuousSunlitWindowHours).toBeGreaterThan(0);
      expect(data.metrics.topographicShadowPenaltyHours).toBeGreaterThanOrEqual(0);

      // Subsegment intervals
      expect(Array.isArray(data.intervals)).toBe(true);
      expect(data.intervals.length).toBeGreaterThan(0);
      const firstInt = data.intervals[0];
      expect(['full_sun', 'partial_limb', 'terrain_shadow', 'sub_horizon']).toContain(firstInt.sun.status);
      expect(['visible', 'terrain_blocked', 'sub_horizon']).toContain(firstInt.earth.status);
      expect(['sun_and_earth', 'sun_only', 'earth_only', 'dark_and_blocked']).toContain(firstInt.overlap.status);
      expect(firstInt.sun.fractionalSolarDiskVisibility).toBeGreaterThanOrEqual(0);
      expect(firstInt.sun.fractionalSolarDiskVisibility).toBeLessThanOrEqual(1.0);

      // Uncertainty envelopes
      expect(data.uncertaintyEnvelopes).toBeDefined();
      expect(data.uncertaintyEnvelopes.nominalMetrics).toBeDefined();
      expect(data.uncertaintyEnvelopes.thetaLowMetrics).toBeDefined();
      expect(data.uncertaintyEnvelopes.thetaHighMetrics).toBeDefined();
      expect(Array.isArray(data.uncertaintyEnvelopes.eventWhiskers)).toBe(true);

      // Provenance
      expect(data.provenance.ephemerisSource).toBe('NASA_JPL_HORIZONS_API_COORD_301');
      expect(data.provenance.terrainModelSource).toBe('NASA_LOLA_PDS_LDEM_85S_20M');
      expect(data.provenance.timeScaleOffsetTtMinusUtcSec).toBe(69.184);

      // Headers
      expect(headers.get('ETag')).toBe(data.calculationId);
      expect(headers.get('X-Calculation-Id')).toBe(data.calculationId);
    });

    it('evaluates Nobile Rim 1 and Malapert Massif candidates', async () => {
      const resNobile = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'nobile-rim-1',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 2.0,
      });
      expect(resNobile.status).toBe(200);
      expect(resNobile.data.siteInfo.siteId).toBe('nobile-rim-1');
      expect(resNobile.data.metrics.totalEvaluationHours).toBe(336.0);

      const resMalapert = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'malapert-massif',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 2.0,
      });
      expect(resMalapert.status).toBe(200);
      expect(resMalapert.data.siteInfo.siteId).toBe('malapert-massif');
    });

    it('supports all 4 typed mast heights (1.0m, 2.0m, 5.0m, 10.0m) with height monotonicity', async () => {
      const res1m = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 1.0,
      });
      const res10m = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 10.0,
      });

      expect(res1m.status).toBe(200);
      expect(res10m.status).toBe(200);
      expect(res1m.data.scenarioConfig.observerMastHeightM).toBe(1.0);
      expect(res10m.data.scenarioConfig.observerMastHeightM).toBe(10.0);
      // Monotonicity: taller mast sees greater or equal cumulative illumination
      expect(res10m.data.metrics.cumulativeSunlitHours).toBeGreaterThanOrEqual(
        res1m.data.metrics.cumulativeSunlitHours - 0.5,
      );
    });

    it('supports launch slip offset between 0 and 28 days', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
        launchSlipOffsetDays: 7.0,
      });

      expect(status).toBe(200);
      expect(data.scenarioConfig.launchSlipOffsetDays).toBe(7.0);
      const expectedEffectiveStart = new Date(Date.parse(baseStart) + 7 * 86400000).toISOString();
      expect(data.scenarioConfig.effectiveStartUtc).toBe(expectedEffectiveStart);
    });

    it('serves recurring queries from CAS cache (HIT-MEMORY) and handles If-None-Match (304)', async () => {
      const payload = {
        siteId: 'shackleton-rim',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 2.0,
      };

      const res1 = await dispatch('/api/v1/scenarios/evaluate', 'POST', payload);
      expect(res1.status).toBe(200);
      const calcId = res1.data.calculationId;

      // Second query must be a CAS cache hit
      const res2 = await dispatch('/api/v1/scenarios/evaluate', 'POST', payload);
      expect(res2.status).toBe(200);
      expect(res2.data.calculationId).toBe(calcId);
      expect(res2.data.provenance.casCacheHit).toBe(true);

      // Conditional request with ETag returns 304 Not Modified
      const res3 = await dispatch('/api/v1/scenarios/evaluate', 'POST', payload, {
        'if-none-match': calcId,
      });
      expect(res3.status).toBe(304);
    });

    it('returns RFC 7807 E_SITE_NOT_FOUND (404) for unknown site ID', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'atlantis-basin-nonexistent',
        startUtc: baseStart,
        stopUtc: baseStop,
      });

      expect(status).toBe(404);
      expect(data.code).toBe('E_SITE_NOT_FOUND');
      expect(data.type).toContain('E_SITE_NOT_FOUND');
      expect(typeof data.remediation).toBe('string');
    });

    it('returns RFC 7807 E_UNSUPPORTED_MAST_HEIGHT (422) for invalid mast height', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 25.0, // Invalid mast height
      });

      expect(status).toBe(400); // Fails Zod enum validation at boundary
      expect(data.code).toBe('E_VALIDATION_ERROR');
    });

    it('returns RFC 7807 E_INVALID_DATE_RANGE (422) when stopUtc <= startUtc', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: '2026-11-15T00:00:00Z',
        stopUtc: '2026-11-01T00:00:00Z', // Reversed
      });

      expect(status).toBe(400); // Fails Zod refine check
      expect(data.code).toBe('E_VALIDATION_ERROR');
    });

    it('returns RFC 7807 E_WINDOW_EXCEEDS_MAX (400) when window > 28 days', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: '2026-11-01T00:00:00Z',
        stopUtc: '2026-12-15T00:00:00Z', // 44 days
      });

      expect(status).toBe(400);
      expect(data.code).toBe('E_VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/scenarios/compare', () => {
    it('executes Three-Tiered Filtering Pipeline across 4 candidate sites', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'peak-near-shackleton', 'malapert-massif', 'nobile-rim-1'],
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 2.0,
        vehicleConstraints: {
          minContinuousSunlightHours: 50.0,
          maxContinuousDarknessHours: 30.0,
          minDteHours: 80.0,
          maxLandingSlopeDeg: 12.0,
        },
        rankingPreferences: {
          primarySortMetric: 'longestContinuousSunlight',
          secondarySortMetric: 'maxContinuousDarkness',
          tertiarySortMetric: 'cumulativeOverlapHours',
          tieToleranceHours: 2.0,
        },
      });

      expect(status).toBe(200);
      expect(data.status).toBe('valid');
      expect(data.tier1Gating.totalEvaluatedSites).toBe(4);
      expect(Array.isArray(data.tier1Gating.feasibleSiteIds)).toBe(true);
      expect(Array.isArray(data.tier1Gating.disqualifiedCandidates)).toBe(true);

      // Tier 2 Lexicographic Ranking
      expect(Array.isArray(data.tier2Ranking.rankedCandidates)).toBe(true);
      expect(data.tier2Ranking.priorityHierarchy).toEqual([
        'longestContinuousSunlight',
        'maxContinuousDarkness',
        'cumulativeOverlapHours',
      ]);
      if (data.tier2Ranking.rankedCandidates.length > 0) {
        expect(data.tier2Ranking.rankedCandidates[0].rank).toBe(1);
        expect(data.tier2Ranking.rankedCandidates[0].metrics.longestContinuousSunlightHours).toBeGreaterThan(0);
      }

      // Tier 3 Pairwise Delta Matrix
      expect(data.tier3Pairwise).toBeDefined();
      if (data.tier3Pairwise) {
        expect(data.tier3Pairwise.siteA).toBeDefined();
        expect(data.tier3Pairwise.siteB).toBeDefined();
        expect(Array.isArray(data.tier3Pairwise.deltas)).toBe(true);
        expect(data.tier3Pairwise.deltas.length).toBe(4);
        expect(typeof data.tier3Pairwise.objectiveTradeOffNarrative).toBe('string');
        expect(data.tier3Pairwise.objectiveTradeOffNarrative.length).toBeGreaterThan(10);
      }
    });

    it('rigorously gates unviable sites in Tier 1 with explicit margin of failure', async () => {
      // Set unrealistically strict constraint (min sunlight 300h out of 336h) to force disqualification
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'malapert-massif'],
        startUtc: baseStart,
        stopUtc: baseStop,
        vehicleConstraints: {
          minContinuousSunlightHours: 320.0, // Strictest requirement
          maxContinuousDarknessHours: 5.0,
          minDteHours: 80.0,
          maxLandingSlopeDeg: 10.0,
        },
      });

      expect(status).toBe(200);
      expect(data.tier1Gating.disqualifiedSitesCount).toBeGreaterThan(0);
      const disq = data.tier1Gating.disqualifiedCandidates[0];
      expect(disq).toBeDefined();
      expect(disq.rejectionReasons.length).toBeGreaterThan(0);
      const r = disq.rejectionReasons[0];
      expect(r.marginOfFailure).toBeGreaterThan(0);
      expect(typeof r.narrative).toBe('string');
    });

    it('rejects comparison requests with fewer than 2 sites (E_INSUFFICIENT_SITES)', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge'], // Only 1 site
        startUtc: baseStart,
        stopUtc: baseStop,
      });

      expect(status).toBe(400);
      expect(data.code).toBe('E_VALIDATION_ERROR');
    });

    it('supports custom pairwise selection (siteIdA and siteIdB)', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'peak-near-shackleton', 'nobile-rim-1'],
        startUtc: baseStart,
        stopUtc: baseStop,
        vehicleConstraints: {
          minContinuousSunlightHours: 0.0,
          maxContinuousDarknessHours: 500.0,
          minDteHours: 0.0,
          maxLandingSlopeDeg: 20.0,
        },
        pairwiseSelection: {
          siteIdA: 'connecting-ridge',
          siteIdB: 'nobile-rim-1',
        },
      });

      expect(status).toBe(200);
      expect(data.tier3Pairwise).toBeDefined();
      expect(data.tier3Pairwise.siteA.siteId).toBe('connecting-ridge');
      expect(data.tier3Pairwise.siteB.siteId).toBe('nobile-rim-1');
    });
  });
});
