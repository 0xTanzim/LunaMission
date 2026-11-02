/**
 * Plan.md § 6.5 — Non-Dominated Pareto Frontier Engine (algorithm)
 *
 * Verifies the domination predicate, the rank assignment, exact-tie co-ranking, single-candidate
 * and empty-cohort behaviour, and — by construction — that no scalarisation is applied: the
 * frontier is invariant to any positive rescaling of an objective and never collapses a trade-off.
 */

import { describe, expect, it } from 'bun:test';
import { computeParetoFrontier, dominates } from '@server/services/scenarios/scenarioPareto';
import {
  ACTIVE_PARETO_OBJECTIVE_IDS,
  UNAVAILABLE_PARETO_OBJECTIVE_IDS,
  readParetoObjectiveVector,
} from '@server/services/scenarios/scenarioParetoObjectives';

interface SyntheticCandidate {
  siteId: string;
  metrics: {
    longestContinuousSunlightHours: number;
    maxContinuousDarknessHours: number;
    cumulativeDteHours: number;
    landingSlopeDeg: number;
  };
}

/** (longest sunlight h ↑, longest darkness h ↓, cumulative DTE h ↑, nominal point slope ° ↓) */
function candidate(siteId: string, sunHours: number, darkHours: number, dteHours: number, slopeDeg: number): SyntheticCandidate {
  return {
    siteId,
    metrics: {
      longestContinuousSunlightHours: sunHours,
      maxContinuousDarknessHours: darkHours,
      cumulativeDteHours: dteHours,
      landingSlopeDeg: slopeDeg,
    },
  };
}

function vectorOf(item: SyntheticCandidate) {
  return readParetoObjectiveVector(item);
}

function assignmentsOf(items: readonly SyntheticCandidate[]): Record<string, { rank: number; dominatedBy: string[] }> {
  const { assignments } = computeParetoFrontier(items);
  const bySite: Record<string, { rank: number; dominatedBy: string[] }> = {};
  items.forEach((item, index) => {
    const assignment = assignments[index]!;
    bySite[item.siteId] = { rank: assignment.rank, dominatedBy: [...assignment.dominatedBy] };
  });
  return bySite;
}

/**
 * Reference implementation of the Plan.md § 6.5 peeling definition, written independently of the
 * production rank formula: take the non-dominated remainder, assign it the next rank, remove it,
 * repeat. Used to cross-check the memoised O(n²) rank resolution.
 */
function naivePeeledRanks(items: readonly SyntheticCandidate[]): string[] {
  const remaining = items.map((_item, index) => index);
  const ranks = new Array<string>(items.length).fill('');
  let nextRank = 1;
  while (remaining.length > 0) {
    const front = remaining.filter((incumbent) =>
      remaining.every(
        (challenger) => challenger === incumbent || !dominates(vectorOf(items[challenger]!), vectorOf(items[incumbent]!)),
      ),
    );
    for (const index of front) ranks[index] = `rank-${nextRank}`;
    for (const index of front) remaining.splice(remaining.indexOf(index), 1);
    nextRank += 1;
  }
  return ranks;
}

function seededValues(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('Pareto domination predicate (Plan.md § 6.5)', () => {
  it('requires at-least-as-good on every objective and strictly better on at least one', () => {
    const strong = vectorOf(candidate('strong', 300, 10, 200, 8));
    const weak = vectorOf(candidate('weak', 280, 12, 190, 9));

    expect(dominates(strong, weak)).toBe(true);
    expect(dominates(weak, strong)).toBe(false);
  });

  it('treats a candidate that is merely at-least-as-good everywhere as NOT dominating', () => {
    const base = vectorOf(candidate('base', 300, 10, 200, 8));

    expect(dominates(base, vectorOf(candidate('equal', 300, 10, 200, 8)))).toBe(false);
    expect(dominates(base, base)).toBe(false);
  });

  it('does not dominate across a trade-off in either direction', () => {
    const sunRich = vectorOf(candidate('sun-rich', 300, 10, 100, 8));
    const dteRich = vectorOf(candidate('dte-rich', 300, 10, 200, 20));

    expect(dominates(sunRich, dteRich)).toBe(false);
    expect(dominates(dteRich, sunRich)).toBe(false);
  });

  it('applies exactly one direction per objective (f1/f3 maximise, f2/f4 minimise)', () => {
    const hotter = vectorOf(candidate('hotter', 301, 10, 200, 8));
    const darker = vectorOf(candidate('darker', 300, 11, 200, 8));
    const steeper = vectorOf(candidate('steeper', 300, 10, 200, 9));
    const baseline = vectorOf(candidate('baseline', 300, 10, 200, 8));

    expect(dominates(baseline, hotter)).toBe(false);
    expect(dominates(baseline, darker)).toBe(true);
    expect(dominates(baseline, steeper)).toBe(true);
  });

  it('compares exact values: a 1e-9 improvement is a strict improvement, not a tie', () => {
    const slightlyBetter = vectorOf(candidate('nano', 300.000000001, 10, 200, 8));
    const baseline = vectorOf(candidate('baseline', 300, 10, 200, 8));

    expect(dominates(slightlyBetter, baseline)).toBe(true);
    expect(dominates(baseline, slightlyBetter)).toBe(false);
  });
});

describe('Pareto rank assignment over a 10-candidate synthetic cohort', () => {
  const cohort: readonly SyntheticCandidate[] = [
    candidate('synth-a', 300, 10, 200, 8),
    candidate('synth-b', 280, 12, 190, 9),
    candidate('synth-c', 250, 5, 150, 6),
    candidate('synth-d', 240, 8, 140, 7),
    candidate('synth-e', 100, 2, 330, 12),
    candidate('synth-f', 90, 15, 320, 13),
    candidate('synth-g', 400, 6, 100, 4),
    candidate('synth-h', 120, 30, 260, 5),
    candidate('synth-i', 300, 10, 200, 8),
    candidate('synth-j', 50, 20, 50, 20),
  ];

  it('derives the known non-dominated set as rank 1', () => {
    const { frontier } = computeParetoFrontier(cohort);

    expect(frontier.rank1SiteIds).toEqual([
      'synth-a',
      'synth-c',
      'synth-e',
      'synth-g',
      'synth-h',
      'synth-i',
    ]);
    // Rank 2 is {b, d, f}; 'synth-j' is dominated by b, d and f, so peeling removes it only in
    // rank 3. Three layers, not two — the frontier is not a single "best of the rest" list.
    expect(frontier.rankCount).toBe(3);
  });

  it('ranks every candidate and names the exact dominating set', () => {
    expect(assignmentsOf(cohort)).toEqual({
      'synth-a': { rank: 1, dominatedBy: [] },
      'synth-b': { rank: 2, dominatedBy: ['synth-a', 'synth-i'] },
      'synth-c': { rank: 1, dominatedBy: [] },
      'synth-d': { rank: 2, dominatedBy: ['synth-c'] },
      'synth-e': { rank: 1, dominatedBy: [] },
      'synth-f': { rank: 2, dominatedBy: ['synth-e'] },
      'synth-g': { rank: 1, dominatedBy: [] },
      'synth-h': { rank: 1, dominatedBy: [] },
      'synth-i': { rank: 1, dominatedBy: [] },
      'synth-j': {
        rank: 3,
        dominatedBy: ['synth-a', 'synth-b', 'synth-c', 'synth-d', 'synth-e', 'synth-f', 'synth-g', 'synth-i'],
      },
    });
  });

  it('preserves the caller cohort order and does not reorder candidates', () => {
    const { assignments } = computeParetoFrontier(cohort);

    expect(assignments.length).toBe(cohort.length);
    expect(assignments.map((assignment) => assignment.rank)).toEqual([1, 2, 1, 2, 1, 2, 1, 1, 1, 3]);
  });
});

describe('Pareto rank edge cases', () => {
  it('co-ranks exact ties instead of breaking them (ties are not domination)', () => {
    const tied = [
      candidate('tie-1', 200, 10, 150, 6),
      candidate('tie-2', 200, 10, 150, 6),
      candidate('tie-3', 200, 10, 150, 6),
      candidate('laggard', 199, 11, 149, 7),
    ];

    const { frontier, assignments } = computeParetoFrontier(tied);

    expect(frontier.rank1SiteIds).toEqual(['tie-1', 'tie-2', 'tie-3']);
    expect(frontier.rankCount).toBe(2);
    expect(assignments.slice(0, 3).map((assignment) => assignment.rank)).toEqual([1, 1, 1]);
    expect(assignments.slice(0, 3).map((assignment) => [...assignment.dominatedBy])).toEqual([[], [], []]);
    // All three co-ranked peers dominate the laggard, which therefore carries their three IDs.
    expect([...assignments[3]!.dominatedBy]).toEqual(['tie-1', 'tie-2', 'tie-3']);
  });

  it('returns rank 1 for a single-candidate cohort', () => {
    const { frontier, assignments } = computeParetoFrontier([candidate('sole', 336, 2, 210, 7)]);

    expect(assignments).toEqual([{ rank: 1, dominatedBy: [] }]);
    expect(frontier.rankCount).toBe(1);
    expect(frontier.rank1SiteIds).toEqual(['sole']);
  });

  it('returns an empty, self-describing frontier for an empty cohort', () => {
    const { frontier, assignments } = computeParetoFrontier([]);

    expect(assignments).toEqual([]);
    expect(frontier.rankCount).toBe(0);
    expect(frontier.rank1SiteIds).toEqual([]);
    // The objective catalogue is cohort-independent: an empty cohort must still publish f5's
    // unavailability rather than silently dropping the objective list.
    expect(frontier.objectives.length).toBe(5);
    expect(frontier.activeObjectiveIds.length).toBe(4);
    expect(frontier.unavailableObjectiveIds).toEqual(['psrTraversabilityDistanceM']);
  });

  it('rejects a non-finite objective value instead of silently voiding that objective', () => {
    expect(() => computeParetoFrontier([candidate('nan-site', Number.NaN, 10, 200, 8)])).toThrow(
      /non-finite longestContinuousSunlightHours/,
    );
  });
});

describe('Pareto frontier is free of scalarisation', () => {
  it('is invariant to any positive rescaling of the objectives (no normalisation, no weights)', () => {
    const cohort = [
      candidate('alpha', 300, 10, 200, 8),
      candidate('bravo', 280, 12, 190, 9),
      candidate('charlie', 250, 5, 150, 6),
      candidate('delta', 400, 6, 100, 4),
    ];
    const rescaled = cohort.map((item) => ({
      siteId: item.siteId,
      metrics: {
        longestContinuousSunlightHours: item.metrics.longestContinuousSunlightHours * 1000,
        maxContinuousDarknessHours: item.metrics.maxContinuousDarknessHours * 0.001,
        cumulativeDteHours: item.metrics.cumulativeDteHours * 3.6,
        landingSlopeDeg: item.metrics.landingSlopeDeg * 60,
      },
    }));

    expect(assignmentsOf(rescaled)).toEqual(assignmentsOf(cohort));
    expect(computeParetoFrontier(rescaled).frontier.rank1SiteIds).toEqual(
      computeParetoFrontier(cohort).frontier.rank1SiteIds,
    );
  });

  it('keeps a trade-off on the frontier where any weighted sum would have ranked one above the other', () => {
    // 'slope-first' wins f4 by a wide margin and loses f3; 'dte-first' is the mirror image, so
    // every positive weighting prefers exactly one of them — the frontier must keep both.
    const { frontier } = computeParetoFrontier([
      candidate('slope-first', 300, 10, 80, 2),
      candidate('dte-first', 300, 10, 320, 25),
    ]);

    expect(frontier.rank1SiteIds).toEqual(['slope-first', 'dte-first']);
    expect(frontier.rankCount).toBe(1);
  });

  it('exposes only the four computable objective IDs as active', () => {
    const { frontier } = computeParetoFrontier([candidate('solo', 100, 10, 100, 10)]);

    expect([...frontier.activeObjectiveIds]).toEqual([...ACTIVE_PARETO_OBJECTIVE_IDS]);
    expect([...frontier.unavailableObjectiveIds]).toEqual([...UNAVAILABLE_PARETO_OBJECTIVE_IDS]);
    expect(frontier.scalarisation).toBe('none');
  });
});

describe('Rank resolution equals the peeling definition', () => {
  it('matches an independent naive peeling implementation on randomised cohorts', () => {
    const random = seededValues(20261101);
    for (let trial = 0; trial < 25; trial++) {
      const size = 2 + Math.floor(random() * 8);
      const items: SyntheticCandidate[] = Array.from({ length: size }, (_unused, index) =>
        candidate(
          `rand-${trial}-${index}`,
          Math.round(random() * 400),
          Math.round(random() * 40),
          Math.round(random() * 340),
          Math.round(random() * 30),
        ),
      );

      const expected = naivePeeledRanks(items);
      const actual = computeParetoFrontier(items).assignments.map((assignment) => `rank-${assignment.rank}`);

      expect(actual).toEqual(expected);
      // Peeling layers are contiguous: rank r only exists when ranks 1..r-1 are non-empty.
      const distinct = [...new Set(actual)].sort();
      expect(distinct).toEqual(Array.from({ length: distinct.length }, (_unused, index) => `rank-${index + 1}`));
    }
  });
});
