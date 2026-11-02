import { describe, expect, it } from 'bun:test';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import { executeTier1Gating } from '@server/services/scenarios/scenarioCompareTier1';
import { buildTier3PairwiseDelta } from '@server/services/scenarios/scenarioCompareTier3';
import { scenarioCompareService } from '@server/services/scenarios/scenarioCompareService';
import { scenarioService } from '@server/services/scenarios/scenarioService';
import {
  scenarioCompareRequestSchema,
  scenarioEvaluateRequestSchema,
  type ScenarioCompareResponse,
  type VehicleConstraints,
} from '@luna/contracts';

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

describe('Milestone M5: Three-Tiered Filtering Pipeline Empirical Challenge Suite', () => {
  const baseStart = '2026-11-01T00:00:00.000Z';
  const baseStop = '2026-11-15T00:00:00.000Z';

  // --------------------------------------------------------------------------
  // Suite 1: Tier 1 Go/No-Go Gating & Constraint Culling
  // --------------------------------------------------------------------------
  describe('Suite 1: Tier 1 Go/No-Go Vehicle Feasibility Gating', () => {
    it('strictly culls sites exceeding max continuous darkness with positive margin of failure', async () => {
      const evShackleton = await scenarioService.evaluateScenario(
        scenarioEvaluateRequestSchema.parse({
          siteId: 'shackleton-rim',
          startUtc: baseStart,
          stopUtc: baseStop,
          observerMastHeightM: 2.0,
        }),
      );

      const constraints: VehicleConstraints = {
        minContinuousSunlightHours: 0.0,
        maxContinuousDarknessHours: 10.0,
        minDteHours: 0.0,
        maxLandingSlopeDeg: 25.0,
      };

      const { disqualifiedCandidates, feasibleList } = executeTier1Gating([evShackleton], constraints);

      expect(disqualifiedCandidates.length).toBe(1);
      expect(feasibleList.length).toBe(0);

      const disq = disqualifiedCandidates[0];
      expect(disq.siteId).toBe('shackleton-rim');

      const darkReason = disq.rejectionReasons.find((r) => r.constraintName === 'maxContinuousDarkness');
      expect(darkReason).toBeDefined();
      expect(darkReason!.thresholdValue).toBe(10.0);
      expect(darkReason!.observedValue).toBe(evShackleton.metrics.longestContinuousDarkWindowHours);
      expect(darkReason!.unit).toBe('h');
      expect(darkReason!.marginOfFailure).toBeGreaterThan(0);
      expect(darkReason!.marginOfFailure).toBeCloseTo(evShackleton.metrics.longestContinuousDarkWindowHours - 10.0, 2);
      expect(darkReason!.narrative).toContain('exceeds');
      expect(darkReason!.narrative).toContain('10.0 h');
    });

    it('strictly culls sites failing minimum continuous sunlight constraint', async () => {
      const evMalapert = await scenarioService.evaluateScenario(
        scenarioEvaluateRequestSchema.parse({
          siteId: 'malapert-massif',
          startUtc: baseStart,
          stopUtc: baseStop,
          observerMastHeightM: 2.0,
        }),
      );

      const constraints: VehicleConstraints = {
        minContinuousSunlightHours: 50.0,
        maxContinuousDarknessHours: 500.0,
        minDteHours: 0.0,
        maxLandingSlopeDeg: 25.0,
      };

      const { disqualifiedCandidates, feasibleList } = executeTier1Gating([evMalapert], constraints);

      expect(disqualifiedCandidates.length).toBe(1);
      expect(feasibleList.length).toBe(0);

      const disq = disqualifiedCandidates[0];
      const reason = disq.rejectionReasons.find((r) => r.constraintName === 'minContinuousSunlight');
      expect(reason).toBeDefined();
      expect(reason!.thresholdValue).toBe(50.0);
      expect(reason!.observedValue).toBe(evMalapert.metrics.longestContinuousSunlitWindowHours);
      expect(reason!.marginOfFailure).toBeGreaterThan(0);
      expect(reason!.marginOfFailure).toBeCloseTo(50.0 - evMalapert.metrics.longestContinuousSunlitWindowHours, 2);
      expect(reason!.narrative).toContain('falls');
    });

    it('strictly culls sites failing minimum DTE hours and landing slope constraints', async () => {
      const evRidge = await scenarioService.evaluateScenario(
        scenarioEvaluateRequestSchema.parse({
          siteId: 'connecting-ridge',
          startUtc: baseStart,
          stopUtc: baseStop,
          observerMastHeightM: 2.0,
        }),
      );

      const constraints: VehicleConstraints = {
        minContinuousSunlightHours: 0.0,
        maxContinuousDarknessHours: 500.0,
        minDteHours: 100.0,
        maxLandingSlopeDeg: 5.0,
      };

      const { disqualifiedCandidates, feasibleList } = executeTier1Gating([evRidge], constraints);

      expect(disqualifiedCandidates.length).toBe(1);
      expect(feasibleList.length).toBe(0);

      const disq = disqualifiedCandidates[0];
      expect(disq.rejectionReasons.length).toBe(2);

      const dteReason = disq.rejectionReasons.find((r) => r.constraintName === 'minDte');
      expect(dteReason).toBeDefined();
      expect(dteReason!.marginOfFailure).toBeCloseTo(100.0 - evRidge.metrics.cumulativeDteHours, 2);

      const slopeReason = disq.rejectionReasons.find((r) => r.constraintName === 'maxLandingSlope');
      expect(slopeReason).toBeDefined();
      expect(slopeReason!.unit).toBe('°');
      expect(slopeReason!.marginOfFailure).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // Suite 2: Non-Viable Candidate Elimination & Leakage Vulnerabilities
  // --------------------------------------------------------------------------
  describe('Suite 2: Non-Viable Candidate Elimination and Tier 3 Leakage', () => {
    it('strictly eliminates disqualified sites from Tier 2 rankedCandidates', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'shackleton-rim', 'malapert-massif'],
        startUtc: baseStart,
        stopUtc: baseStop,
        vehicleConstraints: {
          minContinuousSunlightHours: 100.0,
          maxContinuousDarknessHours: 350.0,
          minDteHours: 50.0,
          maxLandingSlopeDeg: 15.0,
        },
      });

      expect(status).toBe(200);
      expect(data.tier1Gating.feasibleSitesCount).toBe(1);
      expect(data.tier1Gating.disqualifiedSitesCount).toBe(2);

      expect(data.tier2Ranking.rankedCandidates.length).toBe(1);
      expect(data.tier2Ranking.rankedCandidates[0].siteId).toBe('connecting-ridge');

      const rankedIds = data.tier2Ranking.rankedCandidates.map((c: any) => c.siteId);
      expect(rankedIds).not.toContain('shackleton-rim');
      expect(rankedIds).not.toContain('malapert-massif');
    });

    it('strictly eliminates disqualified sites from Tier 3 when fewer than 2 sites are feasible', async () => {
      const res: ScenarioCompareResponse = await scenarioCompareService.compareScenarios(
        scenarioCompareRequestSchema.parse({
          siteIds: ['connecting-ridge', 'shackleton-rim', 'malapert-massif'],
          startUtc: baseStart,
          stopUtc: baseStop,
          vehicleConstraints: {
            minContinuousSunlightHours: 100.0,
            maxContinuousDarknessHours: 350.0,
            minDteHours: 50.0,
            maxLandingSlopeDeg: 15.0,
          },
        }),
      );

      expect(res.tier1Gating.feasibleSitesCount).toBe(1);
      expect(res.tier1Gating.disqualifiedSitesCount).toBe(2);
      expect(res.tier2Ranking.rankedCandidates.length).toBe(1);

      // Decision D-05: When < 2 feasible candidates survive Tier 1, Tier 3 pairwise MUST be null
      expect(res.tier3Pairwise).toBeNull();
    });

    it('strictly sets Tier 3 pairwise to null when ALL sites are disqualified', async () => {
      const res: ScenarioCompareResponse = await scenarioCompareService.compareScenarios(
        scenarioCompareRequestSchema.parse({
          siteIds: ['connecting-ridge', 'malapert-massif'],
          startUtc: baseStart,
          stopUtc: baseStop,
          vehicleConstraints: {
            minContinuousSunlightHours: 330.0,
            maxContinuousDarknessHours: 1.0,
            minDteHours: 300.0,
            maxLandingSlopeDeg: 1.0,
          },
        }),
      );

      expect(res.tier1Gating.feasibleSitesCount).toBe(0);
      expect(res.tier1Gating.disqualifiedSitesCount).toBe(2);
      expect(res.tier2Ranking.rankedCandidates.length).toBe(0);

      // Decision D-05: When 0 candidates survive Tier 1, Tier 3 pairwise MUST be null
      expect(res.tier3Pairwise).toBeNull();
    });

    it('strictly prevents pairwiseSelection from bypassing Tier 1 gating for disqualified candidates', async () => {
      const res: ScenarioCompareResponse = await scenarioCompareService.compareScenarios(
        scenarioCompareRequestSchema.parse({
          siteIds: ['connecting-ridge', 'malapert-massif', 'shackleton-rim'],
          startUtc: baseStart,
          stopUtc: baseStop,
          vehicleConstraints: {
            minContinuousSunlightHours: 100.0,
            maxContinuousDarknessHours: 350.0,
            minDteHours: 50.0,
            maxLandingSlopeDeg: 15.0,
          },
          pairwiseSelection: {
            siteIdA: 'malapert-massif',
            siteIdB: 'shackleton-rim',
          },
        }),
      );

      // Decision D-05: Disqualified candidates specified in pairwiseSelection cannot enter Tier 3
      expect(res.tier3Pairwise).toBeNull();
    });
  });

  // --------------------------------------------------------------------------
  // Suite 3: Tier 3 Pairwise Delta Matrices & Signed Math Verification
  // --------------------------------------------------------------------------
  describe('Suite 3: Tier 3 Pairwise Delta Matrices & Mathematical Invariants', () => {
    it('verifies signed delta math, percentage deltas, unit consistency, and favoredSite assignment', () => {
      const candA = { siteId: 'site-a', siteName: 'Site Alpha', longestContinuousSunlight: 180.0, maxContinuousDarkness: 12.0, cumulativeDteHours: 120.0, cumulativeOverlapHours: 90.0, uncertaintySpanHours: 1.5 };
      const candB = { siteId: 'site-b', siteName: 'Site Beta', longestContinuousSunlight: 150.0, maxContinuousDarkness: 24.0, cumulativeDteHours: 140.0, cumulativeOverlapHours: 80.0, uncertaintySpanHours: 3.0 };

      const result = buildTier3PairwiseDelta(candA, candB);

      expect(result.siteA.siteId).toBe('site-a');
      expect(result.siteB.siteId).toBe('site-b');
      expect(result.deltas.length).toBe(4);

      // Longest continuous sunlight: valA=180, valB=150 -> delta = +30.0, higher is better
      const sunDelta = result.deltas.find((d) => d.metricKey === 'longestContinuousSunlight')!;
      expect(sunDelta.absoluteDelta).toBe(30.0);
      expect(sunDelta.percentDelta).toBe(20.0);
      expect(sunDelta.favoredSite).toBe('siteA');
      expect(sunDelta.unit).toBe('hours');
      expect(sunDelta.operationalSignificance).toContain('Site A provides +30.0 h');

      // Max continuous darkness: valA=12, valB=24 -> delta = -12.0, lower is better
      const darkDelta = result.deltas.find((d) => d.metricKey === 'maxContinuousDarkness')!;
      expect(darkDelta.absoluteDelta).toBe(-12.0);
      expect(darkDelta.percentDelta).toBe(-50.0);
      expect(darkDelta.favoredSite).toBe('siteA');
      expect(darkDelta.operationalSignificance).toContain('Site A reduces maximum battery cold-soak duration by 12.0 h');

      // Cumulative DTE: valA=120, valB=140 -> delta = -20.0, higher is better
      const dteDelta = result.deltas.find((d) => d.metricKey === 'cumulativeDteHours')!;
      expect(dteDelta.absoluteDelta).toBe(-20.0);
      expect(dteDelta.percentDelta).toBeCloseTo(-14.29, 2);
      expect(dteDelta.favoredSite).toBe('siteB');
      expect(dteDelta.operationalSignificance).toContain('Site B provides +20.0 h');

      // Uncertainty sensitivity comparison: 1.5 vs 3.0 -> ratio = 0.500, lower risk siteA
      expect(result.terrainSensitivityComparison.whiskerRatio).toBe(0.5);
      expect(result.terrainSensitivityComparison.lowerRiskSite).toBe('siteA');

      // Objective Trade-Off Narrative
      expect(typeof result.objectiveTradeOffNarrative).toBe('string');
      expect(result.objectiveTradeOffNarrative).toContain('Site Alpha provides 30.0 h more continuous sunlight');
    });

    it('verifies tie handling when metric delta is within epsilon (0.01h)', () => {
      const candA = {
        siteId: 'site-a',
        siteName: 'Site Alpha',
        longestContinuousSunlight: 150.005,
        maxContinuousDarkness: 20.0,
        cumulativeDteHours: 100.0,
        cumulativeOverlapHours: 80.0,
        uncertaintySpanHours: 2.0,
      };
      const candB = {
        siteId: 'site-b',
        siteName: 'Site Beta',
        longestContinuousSunlight: 150.0,
        maxContinuousDarkness: 20.0,
        cumulativeDteHours: 100.0,
        cumulativeOverlapHours: 80.0,
        uncertaintySpanHours: 2.0,
      };

      const result = buildTier3PairwiseDelta(candA, candB);
      const sunDelta = result.deltas.find((d) => d.metricKey === 'longestContinuousSunlight')!;
      expect(sunDelta.favoredSite).toBe('tie');
      expect(sunDelta.operationalSignificance).toBe('Both sites exhibit equivalent operational performance.');
      expect(result.terrainSensitivityComparison.lowerRiskSite).toBe('tie');
    });

    it('handles zero baseline gracefully without division-by-zero artifacts', () => {
      const candA = { siteId: 'site-a', siteName: 'Site Alpha', longestContinuousSunlight: 100.0, maxContinuousDarkness: 20.0, cumulativeDteHours: 50.0, cumulativeOverlapHours: 30.0, uncertaintySpanHours: 2.0 };
      const candB = { siteId: 'site-b', siteName: 'Site Beta (Zero DTE)', longestContinuousSunlight: 80.0, maxContinuousDarkness: 20.0, cumulativeDteHours: 0.0, cumulativeOverlapHours: 0.0, uncertaintySpanHours: 2.0 };

      const result = buildTier3PairwiseDelta(candA, candB);
      const dteDelta = result.deltas.find((d) => d.metricKey === 'cumulativeDteHours')!;
      expect(dteDelta.absoluteDelta).toBe(50.0);
      expect(dteDelta.percentDelta).toBe(0.0);
      expect(dteDelta.favoredSite).toBe('siteA');
      expect(dteDelta.operationalSignificance).toContain('(vs 0.0 h baseline)');
    });
  });

  // Suite 4: Boundary Conditions & Cohort Scaling
  describe('Suite 4: Boundary Conditions (2 to 20 Sites, Zero & 100% Feasibility)', () => {
    it('accepts minimum valid comparison cohort (exactly 2 sites)', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'nobile-rim-1'],
        startUtc: baseStart,
        stopUtc: baseStop,
      });
      expect(status).toBe(200);
      expect(data.tier1Gating.totalEvaluatedSites).toBe(2);
    });

    it('strictly rejects comparison cohort with fewer than 2 sites (1 site and 0 sites)', async () => {
      const res1 = await dispatch('/api/v1/scenarios/compare', 'POST', { siteIds: ['connecting-ridge'], startUtc: baseStart, stopUtc: baseStop });
      expect(res1.status).toBe(400);
      expect(res1.data.code).toBe('E_VALIDATION_ERROR');

      const res0 = await dispatch('/api/v1/scenarios/compare', 'POST', { siteIds: [], startUtc: baseStart, stopUtc: baseStop });
      expect(res0.status).toBe(400);
      expect(res0.data.code).toBe('E_VALIDATION_ERROR');
    });

    it('accepts maximum valid comparison cohort (exactly 20 registered sites)', async () => {
      const all20Sites = [
        'shackleton-rim', 'connecting-ridge', 'de-gerlache-rim-1', 'peak-near-shackleton',
        'amundsen-rim', 'malapert-massif', 'haworth-rim', 'nobile-rim-1',
        'mons-mouton', 'mons-mouton-plateau', 'slater-plain', 'peak-near-cabeus-b',
        'nobile-rim-2', 'de-gerlache-rim-2', 'im-1-odysseus', 'im-2-prime1',
        'firefly-blue-ghost', 'apollo-11', 'apollo-17', 'change-6',
      ];

      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: all20Sites,
        startUtc: baseStart,
        stopUtc: baseStop,
      });

      expect(status).toBe(200);
      expect(data.tier1Gating.totalEvaluatedSites).toBe(20);
      expect(data.tier1Gating.feasibleSitesCount + data.tier1Gating.disqualifiedSitesCount).toBe(20);
    });

    it('strictly rejects comparison cohort exceeding 20 sites (21 sites)', async () => {
      const all20Sites = [
        'shackleton-rim', 'connecting-ridge', 'de-gerlache-rim-1', 'peak-near-shackleton',
        'amundsen-rim', 'malapert-massif', 'haworth-rim', 'nobile-rim-1',
        'mons-mouton', 'mons-mouton-plateau', 'slater-plain', 'peak-near-cabeus-b',
        'nobile-rim-2', 'de-gerlache-rim-2', 'im-1-odysseus', 'im-2-prime1',
        'firefly-blue-ghost', 'apollo-11', 'apollo-17', 'change-6',
      ];

      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: [...all20Sites, 'connecting-ridge'],
        startUtc: baseStart,
        stopUtc: baseStop,
      });

      expect(status).toBe(400);
      expect(data.code).toBe('E_VALIDATION_ERROR');
    });

    it('handles zero sites failing constraints (100% feasibility cohort)', async () => {
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['connecting-ridge', 'nobile-rim-1'],
        startUtc: baseStart,
        stopUtc: baseStop,
        vehicleConstraints: {
          minContinuousSunlightHours: 0.0,
          maxContinuousDarknessHours: 500.0,
          minDteHours: 0.0,
          maxLandingSlopeDeg: 15.0,
        },
      });

      expect(status).toBe(200);
      expect(data.tier1Gating.totalEvaluatedSites).toBe(2);
      expect(data.tier1Gating.disqualifiedSitesCount).toBe(0);
      expect(data.tier1Gating.feasibleSitesCount).toBe(2);
      expect(data.tier2Ranking.rankedCandidates.length).toBe(2);
      expect(data.tier3Pairwise).not.toBeNull();
      expect(data.tier3Pairwise.siteA.siteId).toBe(data.tier2Ranking.rankedCandidates[0].siteId);
      expect(data.tier3Pairwise.siteB.siteId).toBe(data.tier2Ranking.rankedCandidates[1].siteId);
    });

    it('verifies Tier 2 lexicographic tie-breaking when primary metric is within tolerance', async () => {
      // Mons Mouton (sunlit 21.23h, dte 242.77h) vs Mons Mouton Plateau (sunlit 20.62h, dte 336.0h)
      // Sunlight difference is |21.23 - 20.62| = 0.61h <= 2.0h (ties on primary metric).
      // Tie is broken by secondary metric (cumulativeDteHours: higher is better).
      const { status, data } = await dispatch('/api/v1/scenarios/compare', 'POST', {
        siteIds: ['mons-mouton', 'mons-mouton-plateau'],
        startUtc: baseStart,
        stopUtc: baseStop,
        vehicleConstraints: {
          minContinuousSunlightHours: 0.0,
          maxContinuousDarknessHours: 500.0,
          minDteHours: 0.0,
          maxLandingSlopeDeg: 15.0,
        },
        rankingPreferences: {
          primarySortMetric: 'longestContinuousSunlight',
          secondarySortMetric: 'cumulativeDteHours',
          tertiarySortMetric: 'cumulativeOverlapHours',
          tieToleranceHours: 2.0,
        },
      });

      expect(status).toBe(200);
      expect(data.tier2Ranking.rankedCandidates.length).toBe(2);

      // Secondary metric (cumulativeDteHours: 336h vs 242.8h) must rank mons-mouton-plateau at Rank #1.
      expect(data.tier2Ranking.rankedCandidates[0].siteId).toBe('mons-mouton-plateau');
      expect(data.tier2Ranking.rankedCandidates[0].rank).toBe(1);
      expect(data.tier2Ranking.rankedCandidates[1].siteId).toBe('mons-mouton');
      expect(data.tier2Ranking.rankedCandidates[1].rank).toBe(2);
    });
  });
});
