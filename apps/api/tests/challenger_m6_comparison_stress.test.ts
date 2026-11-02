import { describe, expect, it } from 'bun:test';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';

function createDispatcher() {
  const app = createServerApp();
  const rawHandler = createHandler(app);
  return async (path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) => {
    const url = `http://localhost:3001${path}`;
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
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

describe('Challenger P3-E: Three-Tiered Comparison Cohort Boundary Stress Tests', () => {
  const startUtc = '2026-11-01T00:00:00.000Z';
  const stopUtc = '2026-11-15T00:00:00.000Z';

  // 1. Cohort with 0 sites passing Tier 1 (100% disqualified)
  it('Cohort 1: 0 sites passing Tier 1 results in tier3Pairwise === null', async () => {
    const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
      siteIds: ['connecting-ridge', 'malapert-massif', 'nobile-rim-1'],
      startUtc,
      stopUtc,
      // Impossible constraints: 400h continuous sunlight (evaluation is only 336h!)
      vehicleConstraints: {
        minContinuousSunlightHours: 400.0,
        maxContinuousDarknessHours: 1.0,
        minDteHours: 350.0,
        maxLandingSlopeDeg: 1.0,
      },
    });

    expect(status).toBe(200);
    expect(data.tier1Gating.totalEvaluatedSites).toBe(3);
    expect(data.tier1Gating.feasibleSitesCount).toBe(0);
    expect(data.tier1Gating.disqualifiedSitesCount).toBe(3);
    expect(data.tier1Gating.feasibleSiteIds.length).toBe(0);
    expect(data.tier1Gating.disqualifiedCandidates.length).toBe(3);

    // Tier 2 has 0 candidates
    expect(data.tier2Ranking.rankedCandidates.length).toBe(0);

    // Tier 3 MUST be null when < 2 sites pass
    expect(data.tier3Pairwise).toBeNull();
  });

  // 2. Cohort with exactly 1 site passing Tier 1
  it('Cohort 2: exactly 1 site passing Tier 1 results in tier3Pairwise === null', async () => {
    // connecting-ridge: sun=336h, dark=0h, DTE=55.98h, slope=11.7°
    // malapert-massif: sun=5.67h, dark=330.33h, DTE=336h, slope=11.0°
    const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
      siteIds: ['connecting-ridge', 'malapert-massif'],
      startUtc,
      stopUtc,
      vehicleConstraints: {
        minContinuousSunlightHours: 100.0, // connecting-ridge (336h) passes, malapert (5.67h) fails
        maxContinuousDarknessHours: 50.0,  // connecting-ridge (0h) passes, malapert (330h) fails
        minDteHours: 50.0,                 // both pass (55.98h and 336h)
        maxLandingSlopeDeg: 15.0,          // both pass (11.7° and 11.0°)
      },
    });

    expect(status).toBe(200);
    expect(data.tier1Gating.totalEvaluatedSites).toBe(2);
    expect(data.tier1Gating.feasibleSitesCount).toBe(1);
    expect(data.tier1Gating.disqualifiedSitesCount).toBe(1);
    expect(data.tier1Gating.feasibleSiteIds).toEqual(['connecting-ridge']);

    // Tier 2 has exactly 1 candidate
    expect(data.tier2Ranking.rankedCandidates.length).toBe(1);
    expect(data.tier2Ranking.rankedCandidates[0].siteId).toBe('connecting-ridge');
    expect(data.tier2Ranking.rankedCandidates[0].rank).toBe(1);

    // Tier 3 MUST be null when < 2 sites pass!
    expect(data.tier3Pairwise).toBeNull();
  });

  // 3. Cohort with all sites passing Tier 1
  it('Cohort 3: all sites passing Tier 1 generates active Tier 3 Pairwise Delta matrix', async () => {
    const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
      siteIds: ['connecting-ridge', 'malapert-massif'],
      startUtc,
      stopUtc,
      // Constraints under which both pass:
      vehicleConstraints: {
        minContinuousSunlightHours: 5.0,
        maxContinuousDarknessHours: 350.0,
        minDteHours: 50.0,
        maxLandingSlopeDeg: 15.0,
      },
    });

    expect(status).toBe(200);
    expect(data.tier1Gating.totalEvaluatedSites).toBe(2);
    expect(data.tier1Gating.feasibleSitesCount).toBe(2);
    expect(data.tier1Gating.disqualifiedSitesCount).toBe(0);

    // Tier 2 has 2 ranked candidates
    expect(data.tier2Ranking.rankedCandidates.length).toBe(2);

    // Tier 3 MUST be present and valid
    expect(data.tier3Pairwise).not.toBeNull();
    expect(data.tier3Pairwise.siteA.siteId).toBeDefined();
    expect(data.tier3Pairwise.siteB.siteId).toBeDefined();
    expect(data.tier3Pairwise.deltas.length).toBeGreaterThan(0);
    expect(typeof data.tier3Pairwise.terrainSensitivityComparison.whiskerRatio).toBe('number');
    expect(typeof data.tier3Pairwise.objectiveTradeOffNarrative).toBe('string');
  });

  // 4. Cohort with maximum 20 candidate sites
  it('Cohort 4: evaluates maximum allowable cohort (20 sites) without error or timeout', async () => {
    // 20 valid candidate sites from registry
    const all20Sites = [
      'shackleton-rim',
      'connecting-ridge',
      'de-gerlache-rim-1',
      'peak-near-shackleton',
      'amundsen-rim',
      'malapert-massif',
      'haworth-rim',
      'nobile-rim-1',
      'mons-mouton',
      'mons-mouton-plateau',
      'slater-plain',
      'peak-near-cabeus-b',
      'nobile-rim-2',
      'de-gerlache-rim-2',
      'im-1-odysseus',
      'im-2-prime1',
      'firefly-blue-ghost',
      'apollo-11',
      'apollo-17',
      'change-6',
    ];

    const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
      siteIds: all20Sites,
      startUtc,
      stopUtc,
      vehicleConstraints: {
        minContinuousSunlightHours: 0.0,
        maxContinuousDarknessHours: 500.0,
        minDteHours: 0.0,
        maxLandingSlopeDeg: 45.0,
      },
    });

    expect(status).toBe(200);
    expect(data.tier1Gating.totalEvaluatedSites).toBe(20);
    expect(data.tier1Gating.feasibleSitesCount + data.tier1Gating.disqualifiedSitesCount).toBe(20);
  }, 30000); // 30s timeout

  // 5. Boundary rejections: < 2 sites and > 20 sites
  it('Cohort 5: strictly rejects cohorts with < 2 sites or > 20 sites', async () => {
    // 0 sites
    const res0 = await dispatch('/api/v1/scenarios/compare', 'POST', {
      siteIds: [],
      startUtc,
      stopUtc,
    });
    expect(res0.status).toBe(400);

    // 1 site
    const res1 = await dispatch('/api/v1/scenarios/compare', 'POST', {
      siteIds: ['connecting-ridge'],
      startUtc,
      stopUtc,
    });
    expect(res1.status).toBe(400);

    // 21 sites
    const sites21 = Array.from({ length: 21 }, (_, i) => `site-${i + 1}`);
    const res21 = await dispatch('/api/v1/scenarios/compare', 'POST', {
      siteIds: sites21,
      startUtc,
      stopUtc,
    });
    expect(res21.status).toBe(400);
  });

  // 6. Zero TOPSIS or composite scalar scores in comparison JSON
  it('Cohort 6: verifies zero TOPSIS or composite scalar scores exist in response payload', async () => {
    const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
      siteIds: ['connecting-ridge', 'malapert-massif'],
      startUtc,
      stopUtc,
    });

    expect(status).toBe(200);
    const jsonStr = JSON.stringify(data);
    expect(jsonStr.toLowerCase()).not.toContain('topsis');
    expect(jsonStr.toLowerCase()).not.toContain('relativecloseness');
    expect(jsonStr).not.toContain('compositeScore');
    expect(jsonStr).not.toContain('wlcScore');
  });
});
