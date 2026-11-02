/**
 * Plan.md § 6.5 — Pareto frontier contract surface (additive schema + live endpoint)
 *
 * Asserts what a client is allowed to conclude from the published payload:
 *  - f5 is published as UNAVAILABLE with no value field at all, so "absent" can never be read as 0 m;
 *  - f4 is published as a NOMINAL POINT SLOPE carrying its own caveat, so it can never be read as
 *    a landing-ellipse P95 slope;
 *  - every rank and dominating set is reproducible from the published metrics alone;
 *  - no weight, composite score or normalised score exists anywhere in the frontier block.
 */

import { describe, expect, it } from 'bun:test';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import { paretoFrontierSchema, rankedFeasibleCandidateSchema, scenarioCompareResponseSchema } from '@luna/contracts';

function createDispatcher() {
  const app = createServerApp();
  const rawHandler = createHandler(app);
  return async (path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) => {
    const init: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined && method !== 'GET') init.body = JSON.stringify(body);
    const res = await (rawHandler as (req: Request, ctx: unknown) => Promise<Response>)(
      new Request(`http://localhost:3001${path}`, init),
      {},
    );
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };
}

const dispatch = createDispatcher();

/**
 * Eight registered sites under permissive Tier-1 constraints: every one is feasible, so the
 * fixture isolates the frontier from the gating. These are real solver outputs, not invented
 * numbers — the expected ranks below were read back from a live response.
 */
const COHORT_BODY = {
  siteIds: [
    'connecting-ridge',
    'change-6',
    'im-2-prime1',
    'nobile-rim-1',
    'amundsen-rim',
    'apollo-17',
    'malapert-massif',
    'haworth-rim',
  ],
  startUtc: '2026-11-01T00:00:00.000Z',
  stopUtc: '2026-11-15T00:00:00.000Z',
  vehicleConstraints: {
    minContinuousSunlightHours: 0.0,
    maxContinuousDarknessHours: 672.0,
    minDteHours: 0.0,
    maxLandingSlopeDeg: 45.0,
  },
};

interface PublishedMetrics {
  longestContinuousSunlightHours: number;
  maxContinuousDarknessHours: number;
  cumulativeDteHours: number;
  landingSlopeDeg: number;
}

interface ObjectiveView {
  objectiveIndex: number;
  objectiveId: string;
  label: string;
  unit: string;
  direction: string;
  availability: string;
  sourceField?: string;
  measurementBasis: string;
  limitationNote?: string;
  participatesInDomination: boolean;
}

interface FrontierView {
  method: string;
  scalarisation: string;
  dominationRule: string;
  objectives: ObjectiveView[];
  activeObjectiveIds: string[];
  unavailableObjectiveIds: string[];
  rankCount: number;
  rank1SiteIds: string[];
}

interface CandidateView {
  rank: number;
  siteId: string;
  metrics: PublishedMetrics;
  pareto?: { rank: number; dominatedBy: string[] };
}

interface CompareView {
  tier1Gating: { feasibleSitesCount: number; disqualifiedSitesCount: number };
  tier2Ranking: { priorityHierarchy: string[]; paretoFrontier?: FrontierView; rankedCandidates: CandidateView[] };
}

/** Independent re-implementation of the Plan.md § 6.5 test, over published values only. */
function dominatesPublished(a: PublishedMetrics, b: PublishedMetrics): boolean {
  const atLeastAsGood =
    a.longestContinuousSunlightHours >= b.longestContinuousSunlightHours &&
    a.maxContinuousDarknessHours <= b.maxContinuousDarknessHours &&
    a.cumulativeDteHours >= b.cumulativeDteHours &&
    a.landingSlopeDeg <= b.landingSlopeDeg;
  const strictlyBetter =
    a.longestContinuousSunlightHours > b.longestContinuousSunlightHours ||
    a.maxContinuousDarknessHours < b.maxContinuousDarknessHours ||
    a.cumulativeDteHours > b.cumulativeDteHours ||
    a.landingSlopeDeg < b.landingSlopeDeg;
  return atLeastAsGood && strictlyBetter;
}

function collectKeys(value: unknown, found: Set<string> = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, found);
    return found;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      found.add(key);
      collectKeys(item, found);
    }
  }
  return found;
}

function collectNumericKeys(value: unknown, key: string | null, found: Set<string> = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) collectNumericKeys(item, key, found);
    return found;
  }
  if (value !== null && typeof value === 'object') {
    for (const [childKey, item] of Object.entries(value as Record<string, unknown>)) {
      collectNumericKeys(item, childKey, found);
    }
    return found;
  }
  if (typeof value === 'number' && key !== null) found.add(key);
  return found;
}

async function loadCompare(body: unknown = COHORT_BODY): Promise<CompareView> {
  const response = await dispatch('/api/v1/scenarios/compare', 'POST', body);
  expect(response.status).toBe(200);
  return response.data as CompareView;
}

function frontierOf(data: CompareView): FrontierView {
  const frontier = data.tier2Ranking.paretoFrontier;
  expect(frontier).toBeDefined();
  return frontier!;
}

describe('Pareto frontier: additive contract on a live compare response', () => {
  it('validates against the published schemas and leaves existing fields untouched', async () => {
    const data = await loadCompare();

    // The whole payload still satisfies the canonical response schema: nothing was narrowed.
    expect(scenarioCompareResponseSchema.safeParse(data).success).toBe(true);

    const frontier = frontierOf(data);
    expect(paretoFrontierSchema.safeParse(frontier).success).toBe(true);
    for (const candidate of data.tier2Ranking.rankedCandidates) {
      expect(rankedFeasibleCandidateSchema.safeParse(candidate).success).toBe(true);
    }

    // Lexicographic Tier-2 behaviour is unchanged: `rank` is still 1..n in array order.
    expect(data.tier2Ranking.rankedCandidates.map((c) => c.rank)).toEqual(
      data.tier2Ranking.rankedCandidates.map((_c, index) => index + 1),
    );
    expect(data.tier2Ranking.priorityHierarchy).toEqual([
      'longestContinuousSunlight',
      'maxContinuousDarkness',
      'cumulativeOverlapHours',
    ]);
  }, 30000);

  it('publishes all five Plan.md § 6.5 objectives in order with their physical units', async () => {
    const frontier = frontierOf(await loadCompare());

    expect(frontier.objectives.map((o) => o.objectiveIndex)).toEqual([1, 2, 3, 4, 5]);
    expect(frontier.objectives.map((o) => o.objectiveId)).toEqual([
      'longestContinuousSunlightHours',
      'maxContinuousDarknessHours',
      'cumulativeDteHours',
      'nominalPointSlopeDeg',
      'psrTraversabilityDistanceM',
    ]);
    expect(frontier.objectives.map((o) => o.unit)).toEqual(['hours', 'hours', 'hours', 'degrees', 'meters']);
    expect(frontier.objectives.map((o) => o.direction)).toEqual([
      'maximize',
      'minimize',
      'maximize',
      'minimize',
      'minimize',
    ]);
    expect(frontier.objectives.map((o) => o.availability)).toEqual([
      'available',
      'available',
      'available',
      'nominal_only',
      'unavailable',
    ]);
  }, 30000);

  it('reports f5 as unavailable with no value field, so absence cannot be read as 0 m', async () => {
    const frontier = frontierOf(await loadCompare());
    const f5 = frontier.objectives[4]!;

    expect(f5.availability).toBe('unavailable');
    expect(f5.participatesInDomination).toBe(false);
    expect(f5.sourceField).toBeUndefined();
    expect('value' in f5).toBe(false);
    expect(f5.limitationNote).toContain('UNAVAILABLE');
    expect(f5.limitationNote).toContain('0 m or as infinity');
    expect(f5.unit).toBe('meters');

    expect(frontier.unavailableObjectiveIds).toEqual(['psrTraversabilityDistanceM']);
    expect(frontier.activeObjectiveIds).not.toContain('psrTraversabilityDistanceM');
    expect(frontier.activeObjectiveIds).toEqual([
      'longestContinuousSunlightHours',
      'maxContinuousDarknessHours',
      'cumulativeDteHours',
      'nominalPointSlopeDeg',
    ]);
  }, 30000);

  it('labels f4 as a nominal point slope and never as a P95 or ellipse metric', async () => {
    const frontier = frontierOf(await loadCompare());
    const f4 = frontier.objectives[3]!;

    expect(f4.objectiveId).toBe('nominalPointSlopeDeg');
    expect(f4.label).toBe('Nominal Point Slope');
    expect(f4.unit).toBe('degrees');
    expect(f4.direction).toBe('minimize');
    expect(f4.availability).toBe('nominal_only');
    expect(f4.participatesInDomination).toBe(true);
    expect(f4.sourceField).toBe('metrics.landingSlopeDeg');

    // No client-facing label surface claims a P95, a percentile or an ellipse metric.
    for (const surface of [f4.objectiveId, f4.label, f4.unit, f4.sourceField ?? '']) {
      expect(surface).not.toMatch(/p95|p_95|percentile|ellipse/i);
    }
    // The caveat is explicit about what it is NOT — that is the only place P95 may be named.
    expect(f4.measurementBasis.toLowerCase()).toContain('nominal');
    expect(f4.limitationNote).toMatch(/not a P95 quantile/i);
    expect(f4.limitationNote).toMatch(/landing-ellipse/i);

    // The value consumed is exactly the published point slope, not a derived statistic.
    for (const candidate of (await loadCompare()).tier2Ranking.rankedCandidates) {
      expect(Number.isFinite(candidate.metrics.landingSlopeDeg)).toBe(true);
    }
  }, 30000);

  it('keeps every rank and dominating set reproducible from the published metrics', async () => {
    const data = await loadCompare();
    const candidates = data.tier2Ranking.rankedCandidates;
    const frontier = frontierOf(data);

    expect(data.tier1Gating.feasibleSitesCount).toBe(8);
    expect(candidates.length).toBe(8);

    for (const candidate of candidates) {
      expect(candidate.pareto).toBeDefined();
      expect(candidate.pareto!.rank).toBeGreaterThanOrEqual(1);

      const expectedDominators = candidates
        .filter((other) => other.siteId !== candidate.siteId && dominatesPublished(other.metrics, candidate.metrics))
        .map((other) => other.siteId);
      expect([...candidate.pareto!.dominatedBy].sort()).toEqual([...expectedDominators].sort());

      if (candidate.pareto!.rank === 1) expect(candidate.pareto!.dominatedBy).toEqual([]);
      else expect(candidate.pareto!.dominatedBy.length).toBeGreaterThan(0);
    }

    const publishedRank1 = candidates.filter((c) => c.pareto!.rank === 1).map((c) => c.siteId);
    expect(frontier.rank1SiteIds).toEqual(publishedRank1);
    expect(frontier.rankCount).toBe(Math.max(...candidates.map((c) => c.pareto!.rank)));
  }, 30000);

  it('matches the known frontier of the registered-site cohort', async () => {
    const frontier = frontierOf(await loadCompare());

    // Real trade-off structure: 'connecting-ridge' leads sunlight with a steep slope and thin
    // DTE; 'apollo-17' is the mirror image; 'change-6' and 'nobile-rim-1' are flat but poorer on
    // other axes. All four are non-dominated, so none of them collapses into a single winner.
    expect(frontier.rank1SiteIds).toEqual([
      'connecting-ridge',
      'change-6',
      'nobile-rim-1',
      'apollo-17',
    ]);
    expect(frontier.rankCount).toBe(3);

    const bySite = new Map((await loadCompare()).tier2Ranking.rankedCandidates.map((c) => [c.siteId, c]));
    expect(bySite.get('im-2-prime1')!.pareto).toEqual({ rank: 2, dominatedBy: ['change-6'] });
    expect(bySite.get('haworth-rim')!.pareto).toEqual({ rank: 2, dominatedBy: ['nobile-rim-1', 'apollo-17'] });
    expect(bySite.get('amundsen-rim')!.pareto).toEqual({
      rank: 3,
      dominatedBy: [
        'connecting-ridge',
        'change-6',
        'im-2-prime1',
        'nobile-rim-1',
        'apollo-17',
        'malapert-massif',
        'haworth-rim',
      ],
    });
  }, 30000);

  it('introduces no scalar weight, composite score or normalised score', async () => {
    const data = await loadCompare();
    const frontier = frontierOf(data);

    expect(frontier.method).toBe('non_dominated_sort');
    expect(frontier.scalarisation).toBe('none');

    // Candidate-level rank carrier holds nothing but the rank and its dominating set.
    for (const candidate of data.tier2Ranking.rankedCandidates) {
      expect(Object.keys(candidate.pareto!).sort()).toEqual(['dominatedBy', 'rank']);
    }

    // No key anywhere in the frontier block can name a weight/score/normalisation. String values
    // are ignored on purpose: `dominationRule` explains in prose that no weights are applied.
    const forbiddenKeys = [...collectKeys(frontier)].filter((key) =>
      /weight|score|composite|normalis|normaliz|utility|topsis/i.test(key),
    );
    expect(forbiddenKeys).toEqual([]);

    // The only numbers the frontier block carries are structural: the objective index and the
    // rank count. Any per-candidate value would have to be a physical-unit metric, and any
    // aggregate would have to be a score — which is exactly what must not exist here.
    expect([...collectNumericKeys(frontier, null)].sort()).toEqual(['objectiveIndex', 'rankCount']);
    expect(frontier.dominationRule).toContain('no weights');
  }, 30000);

  it('still reports an empty, self-describing frontier when no candidate passes Tier 1', async () => {
    const data = await loadCompare({
      ...COHORT_BODY,
      vehicleConstraints: {
        minContinuousSunlightHours: 400.0,
        maxContinuousDarknessHours: 1.0,
        minDteHours: 350.0,
        maxLandingSlopeDeg: 1.0,
      },
    });

    expect(data.tier1Gating.feasibleSitesCount).toBe(0);
    expect(data.tier2Ranking.rankedCandidates).toEqual([]);
    const frontier = frontierOf(data);
    expect(frontier.rankCount).toBe(0);
    expect(frontier.rank1SiteIds).toEqual([]);
    // f5's unavailability survives an empty cohort: it is a missing input, not an absence of news.
    expect(frontier.unavailableObjectiveIds).toEqual(['psrTraversabilityDistanceM']);
    expect(frontier.objectives.length).toBe(5);
  }, 30000);
});
