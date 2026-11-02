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

describe('Milestone M5: Adversarial REST Route Stress & Edge-Case Harness', () => {
  const baseStart = '2026-11-01T00:00:00.000Z';
  const baseStop = '2026-11-15T00:00:00.000Z';

  describe('Adversarial Group 1: Input Validation & Boundary Stress (POST /api/v1/scenarios/evaluate)', () => {
    it('rejects startUtc === stopUtc with RFC 7807 E_VALIDATION_ERROR (400)', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStart,
      });

      expect(status).toBe(400);
      expect(data.code).toBe('E_VALIDATION_ERROR');
      expect(data.type).toContain('E_VALIDATION_ERROR');
      const paramIssue = data.invalidParams?.find((p: any) => p.name === 'stopUtc');
      expect(paramIssue?.reason).toContain('stopUtc must be strictly greater than startUtc');
    });

    it('rejects inverted date intervals (startUtc > stopUtc) with 400', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: '2026-11-20T00:00:00.000Z',
        stopUtc: '2026-11-10T00:00:00.000Z',
      });

      expect(status).toBe(400);
      expect(data.code).toBe('E_VALIDATION_ERROR');
    });

    it('rejects window exceeding 28 days with 400', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: '2026-11-01T00:00:00.000Z',
        stopUtc: '2026-12-05T00:00:00.000Z', // 34 days
      });

      expect(status).toBe(400);
      expect(data.code).toBe('E_VALIDATION_ERROR');
      const paramIssue = data.invalidParams?.find((p: any) => p.name === 'stopUtc');
      expect(paramIssue?.reason).toContain('cannot exceed 28 days');
    });

    it('rejects malformed and non-ISO date strings with 400', async () => {
      const invalidDates = ['not-a-date', '2026-13-45T99:99:99Z', '2026/11/01', ''];
      for (const inv of invalidDates) {
        const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
          siteId: 'connecting-ridge',
          startUtc: inv,
          stopUtc: baseStop,
        });
        expect(status).toBe(400);
        expect(data.code).toBe('E_VALIDATION_ERROR');
      }
    });

    it('rejects negative, fractional, and unsupported mast heights with 400', async () => {
      const invalidMasts = [-2.0, -0.1, 0.0, 1.5, 3.5, 7.0, 25.0, '3.5m'];
      for (const mast of invalidMasts) {
        const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
          siteId: 'connecting-ridge',
          startUtc: baseStart,
          stopUtc: baseStop,
          observerMastHeightM: mast,
        });
        expect(status).toBe(400);
        expect(data.code).toBe('E_VALIDATION_ERROR');
        const paramIssue = data.invalidParams?.find((p: any) => p.name === 'observerMastHeightM');
        expect(paramIssue).toBeDefined();
      }
    });

    it('rejects unknown or invalid site IDs with 404 or 400', async () => {
      // Unknown site
      const resUnknown = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'nonexistent-crater-atlantis-999',
        startUtc: baseStart,
        stopUtc: baseStop,
      });
      expect(resUnknown.status).toBe(404);
      expect(resUnknown.data.code).toBe('E_SITE_NOT_FOUND');
      expect(resUnknown.data.remediation).toContain('GET /api/v1/sites');

      // Empty string siteId
      const resEmpty = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: '',
        startUtc: baseStart,
        stopUtc: baseStop,
      });
      expect(resEmpty.status).toBe(400);
      expect(resEmpty.data.code).toBe('E_VALIDATION_ERROR');

      // SQL injection attempt in siteId
      const resSql = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: "shackleton'; DROP TABLE sites;--",
        startUtc: baseStart,
        stopUtc: baseStop,
      });
      expect(resSql.status).toBe(404);
      expect(resSql.data.code).toBe('E_SITE_NOT_FOUND');
    });
  });

  describe('Adversarial Group 2: Launch Slip Extremes & Boundaries', () => {
    it('accepts boundary launch slip of exactly 0.0 days', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
        launchSlipOffsetDays: 0.0,
      });

      expect(status).toBe(200);
      expect(data.scenarioConfig.launchSlipOffsetDays).toBe(0.0);
      expect(data.scenarioConfig.effectiveStartUtc).toBe(baseStart);
    });

    it('accepts boundary launch slip of exactly 28.0 days', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
        launchSlipOffsetDays: 28.0,
      });

      expect(status).toBe(200);
      expect(data.scenarioConfig.launchSlipOffsetDays).toBe(28.0);
      const expectedShiftMs = Date.parse(baseStart) + 28 * 86400000;
      expect(data.scenarioConfig.effectiveStartUtc).toBe(new Date(expectedShiftMs).toISOString());
    });

    it('rejects negative launch slip (-1.0d and -0.001d) with 400', async () => {
      for (const slip of [-1.0, -0.001]) {
        const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
          siteId: 'connecting-ridge',
          startUtc: baseStart,
          stopUtc: baseStop,
          launchSlipOffsetDays: slip,
        });
        expect(status).toBe(400);
        expect(data.code).toBe('E_VALIDATION_ERROR');
      }
    });

    it('rejects excessive launch slip (> 28.0d) with 400', async () => {
      for (const slip of [28.001, 50.0, 100.0]) {
        const { status, data } = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
          siteId: 'connecting-ridge',
          startUtc: baseStart,
          stopUtc: baseStop,
          launchSlipOffsetDays: slip,
        });
        expect(status).toBe(400);
        expect(data.code).toBe('E_VALIDATION_ERROR');
      }
    });
  });

  describe('Adversarial Group 3: Multi-Site Comparison Edge Cases (POST /api/v1/scenarios/compare)', () => {
    it('rejects empty cohorts and cohorts with < 2 sites with 400', async () => {
      const res0 = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: [],
        startUtc: baseStart,
        stopUtc: baseStop,
      });
      expect(res0.status).toBe(400);

      const res1 = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge'],
        startUtc: baseStart,
        stopUtc: baseStop,
      });
      expect(res1.status).toBe(400);
      expect(res1.data.code).toBe('E_VALIDATION_ERROR');
    });

    it('rejects cohorts exceeding 20 sites with 400', async () => {
      const sites21 = Array(21).fill('connecting-ridge');
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: sites21,
        startUtc: baseStart,
        stopUtc: baseStop,
      });
      expect(status).toBe(400);
      expect(data.code).toBe('E_VALIDATION_ERROR');
    });

    it('returns 404 when cohort contains an unknown site ID', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'unknown-site-xyz'],
        startUtc: baseStart,
        stopUtc: baseStop,
      });
      expect(status).toBe(404);
      expect(data.code).toBe('E_SITE_NOT_FOUND');
    });

    it('handles identical duplicate site IDs gracefully (ties handled)', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'connecting-ridge'],
        startUtc: baseStart,
        stopUtc: baseStop,
        vehicleConstraints: {
          minContinuousSunlightHours: 10.0,
          maxContinuousDarknessHours: 50.0,
          minDteHours: 10.0,
          maxLandingSlopeDeg: 20.0,
        },
      });

      expect(status).toBe(200);
      expect(data.tier3Pairwise).toBeDefined();
      expect(data.tier3Pairwise.deltas[0].absoluteDelta).toBe(0);
      expect(data.tier3Pairwise.deltas[0].favoredSite).toBe('tie');
    });

    it('rejects inverted date intervals in compare with 422', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'shackleton-rim'],
        startUtc: '2026-11-15T00:00:00.000Z',
        stopUtc: '2026-11-01T00:00:00.000Z',
      });
      expect(status).toBe(422);
      expect(data.code).toBe('E_INVALID_DATE_RANGE');
    });

    it('rejects invalid vehicle constraints and ranking preferences with 400', async () => {
      const resNeg = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'shackleton-rim'],
        startUtc: baseStart,
        stopUtc: baseStop,
        vehicleConstraints: { minContinuousSunlightHours: -5.0 },
      });
      expect(resNeg.status).toBe(400);

      const resSlope = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'shackleton-rim'],
        startUtc: baseStart,
        stopUtc: baseStop,
        vehicleConstraints: { maxLandingSlopeDeg: 60.0 }, // max 45
      });
      expect(resSlope.status).toBe(400);

      const resPref = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'shackleton-rim'],
        startUtc: baseStart,
        stopUtc: baseStop,
        rankingPreferences: { tieToleranceHours: 35.0 }, // max 24
      });
      expect(resPref.status).toBe(400);
    });
  });

  describe('Adversarial Group 4: CAS Cache Stress & Byte-for-Byte Determinism', () => {
    it('verifies byte-for-byte consistency across repeated queries and mutates on parameter variation', async () => {
      const basePayload = {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 2.0,
        sunVisibilityCriterion: 'upperLimb',
        earthVisibilityCriterion: 'center',
        launchSlipOffsetDays: 0.0,
      };

      // Query 1: Initial evaluation
      const res1 = await dispatch('/api/v1/scenarios/evaluate', 'POST', basePayload);
      expect(res1.status).toBe(200);
      const calcId1 = res1.data.calculationId;

      // Query 2: Identical query
      const res2 = await dispatch('/api/v1/scenarios/evaluate', 'POST', basePayload);
      expect(res2.status).toBe(200);
      expect(res2.data.calculationId).toBe(calcId1);
      expect(res2.data.provenance.casCacheHit).toBe(true);

      // Byte-for-byte deep equality of metrics and intervals length
      expect(res2.data.metrics).toEqual(res1.data.metrics);
      expect(res2.data.intervals.length).toBe(res1.data.intervals.length);

      // Mutation 1: observerMastHeightM (2.0 -> 1.0)
      const resMutMast = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        ...basePayload,
        observerMastHeightM: 1.0,
      });
      expect(resMutMast.status).toBe(200);
      expect(resMutMast.data.calculationId).not.toBe(calcId1);

      // Mutation 2: launchSlipOffsetDays (0.0 -> 7.0)
      const resMutSlip = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        ...basePayload,
        launchSlipOffsetDays: 7.0,
      });
      expect(resMutSlip.status).toBe(200);
      expect(resMutSlip.data.calculationId).not.toBe(calcId1);

      // Mutation 3: sunVisibilityCriterion (upperLimb -> fullDisk)
      const resMutSun = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        ...basePayload,
        sunVisibilityCriterion: 'fullDisk',
      });
      expect(resMutSun.status).toBe(200);
      expect(resMutSun.data.calculationId).not.toBe(calcId1);

      // Mutation 4: siteId (connecting-ridge -> malapert-massif)
      const resMutSite = await dispatch('/api/v1/scenarios/evaluate', 'POST', {
        ...basePayload,
        siteId: 'malapert-massif',
      });
      expect(resMutSite.status).toBe(200);
      expect(resMutSite.data.calculationId).not.toBe(calcId1);
    });

    it('recovers seamlessly from memory eviction via Content-Addressable Disk storage', async () => {
      const payload = {
        siteId: 'nobile-rim-1',
        startUtc: baseStart,
        stopUtc: baseStop,
        observerMastHeightM: 2.0,
      };

      // 1. Prime the cache
      const res1 = await dispatch('/api/v1/scenarios/evaluate', 'POST', payload);
      expect(res1.status).toBe(200);
      const calcId = res1.data.calculationId;

      // 2. Clear in-memory LRU cache
      scenarioCasCache.clear();

      // 3. Query again: must retrieve from disk and repopulate memory without recalculation
      const res2 = await dispatch('/api/v1/scenarios/evaluate', 'POST', payload);
      expect(res2.status).toBe(200);
      expect(res2.data.calculationId).toBe(calcId);
      expect(res2.data.provenance.casCacheHit).toBe(true);
    });

    it('enforces HTTP 304 Not Modified conditional requests with ETag matching', async () => {
      const payload = {
        siteId: 'connecting-ridge',
        startUtc: baseStart,
        stopUtc: baseStop,
      };

      const res = await dispatch('/api/v1/scenarios/evaluate', 'POST', payload);
      expect(res.status).toBe(200);
      const etag = res.headers.get('ETag');
      expect(etag).toBeDefined();

      // Conditional request with matching ETag
      const res304 = await dispatch('/api/v1/scenarios/evaluate', 'POST', payload, {
        'if-none-match': etag!,
      });
      expect(res304.status).toBe(304);

      // Conditional request with non-matching ETag returns 200
      const res200 = await dispatch('/api/v1/scenarios/evaluate', 'POST', payload, {
        'if-none-match': 'non-matching-etag',
      });
      expect(res200.status).toBe(200);
    });
  });

  describe('Adversarial Group 5: High-Concurrency Stampedes & Parallelism', () => {
    it('sustains 40 parallel evaluation requests without race conditions or tmp-file collisions', async () => {
      const sites = ['connecting-ridge', 'shackleton-rim', 'malapert-massif', 'nobile-rim-1'];
      const requests = Array.from({ length: 40 }, (_, idx) => {
        const siteId = sites[idx % sites.length];
        return dispatch('/api/v1/scenarios/evaluate', 'POST', {
          siteId,
          startUtc: baseStart,
          stopUtc: baseStop,
          observerMastHeightM: (idx % 2 === 0) ? 2.0 : 5.0,
        });
      });

      const results = await Promise.all(requests);
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(results.every((r) => typeof r.data.calculationId === 'string')).toBe(true);
      expect(results.every((r) => r.data.calculationId.length === 64)).toBe(true);
    });

    it('sustains 20 parallel comparison requests across different site permutations', async () => {
      const cohortA = ['connecting-ridge', 'peak-near-shackleton'];
      const cohortB = ['malapert-massif', 'nobile-rim-1'];
      const requests = Array.from({ length: 20 }, (_, idx) => {
        const siteIds = (idx % 2 === 0) ? cohortA : cohortB;
        return dispatch('/api/v1/scenarios/compare', 'POST', {
          siteIds,
          startUtc: baseStart,
          stopUtc: baseStop,
          observerMastHeightM: 2.0,
        });
      });

      const results = await Promise.all(requests);
      expect(results.every((r) => r.status === 200)).toBe(true);
      expect(results.every((r) => r.data.tier1Gating !== undefined)).toBe(true);
      expect(results.every((r) => r.data.tier2Ranking !== undefined)).toBe(true);
    });
  });
});
