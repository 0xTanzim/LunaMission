/**
 * Plan.md § 6.5 Non-Dominated Pareto Frontier Engine
 * Governed by Plan.md § 6.5, ADR-06 and AGENTS.md § 5.1 (solver module ceiling).
 *
 * Ranks the feasible cohort by strict multi-objective domination. No weighting, no composite
 * score, no 0–100 normalisation: every objective keeps its physical unit and is compared by
 * plain ordering, so a candidate that is best-in-class on one axis and worst-in-class on another
 * stays on the frontier instead of being averaged into a single misleading number.
 *
 * Algorithm
 * ---------
 * 1. Each candidate is mapped to an objective vector in Plan.md § 6.5 order, restricted to
 *    objectives that actually carry a value (today f1..f4; f5 is unavailable and excluded).
 * 2. Every ordered pair is tested: `dominates(x_A, x_B)` is true iff A is at least as good on
 *    all objectives and strictly better on at least one. Exact ties are therefore NOT domination.
 * 3. Ranks follow the standard peeling definition: rank(x) = 1 + max{rank(d) : d dominates x},
 *    with the maximum over an empty set taken as 0 (so an undominated candidate gets rank 1).
 *    This is evaluated by memoised recursion over the domination matrix, which is acyclic
 *    because strict partial order: no candidate can dominate itself or a value-identical peer.
 *
 * Complexity: O(n² · m) time and O(n²) space for the domination matrix, where n is the cohort
 * size (≤ 20 per the compare contract) and m = 4 participating objectives. Rank resolution then
 * costs O(n²) with memoisation; recursion depth is bounded by n. `dominatedBy` is materialised
 * from the same matrix, so no extra pass over the cohort is needed.
 */

import type { ParetoFrontier, ParetoRankAssignment } from '@luna/contracts';
import {
  ACTIVE_PARETO_OBJECTIVE_IDS,
  PARETO_DOMINATION_RULE,
  PARETO_OBJECTIVES,
  UNAVAILABLE_PARETO_OBJECTIVE_IDS,
  readParetoObjectiveVector,
  type ParetoObjectiveInput,
  type ParetoObjectiveValue,
} from './scenarioParetoObjectives';

export interface ParetoRankedCandidate extends ParetoObjectiveInput {
  readonly siteId: string;
}

export interface ParetoFrontierResult {
  /** Parallel to the input cohort: `assignments[i]` describes `candidates[i]`. */
  readonly assignments: readonly ParetoRankAssignment[];
  readonly frontier: ParetoFrontier;
}

/** +1 when `a` is the better value, -1 when `b` is, 0 when the two are exactly equal. */
function compareGoodness(a: ParetoObjectiveValue, b: ParetoObjectiveValue): number {
  if (a.value === b.value) return 0;
  const aIsBetter = a.direction === 'maximize' ? a.value > b.value : a.value < b.value;
  return aIsBetter ? 1 : -1;
}

/**
 * Strict Pareto domination over two objective vectors of identical shape.
 *
 * "At least as good" is `>=` for a maximised objective and `<=` for a minimised one; equality on
 * every objective returns false, because a tie is not domination.
 */
export function dominates(
  challenger: readonly ParetoObjectiveValue[],
  incumbent: readonly ParetoObjectiveValue[],
): boolean {
  let strictlyBetter = false;
  for (let k = 0; k < challenger.length; k++) {
    const verdict = compareGoodness(challenger[k]!, incumbent[k]!);
    if (verdict < 0) return false;
    if (verdict > 0) strictlyBetter = true;
  }
  return strictlyBetter;
}

/**
 * A non-finite objective value would make every ordered comparison false, silently dropping that
 * objective from the comparison — the same failure as treating an absent objective as a zero tie.
 * Reject it at the boundary instead of ranking on a corrupted vector.
 */
function readValidatedVector(candidate: ParetoRankedCandidate): ParetoObjectiveValue[] {
  const vector = readParetoObjectiveVector(candidate);
  for (const entry of vector) {
    if (!Number.isFinite(entry.value)) {
      throw new Error(
        `Site "${candidate.siteId}" reports a non-finite ${entry.objectiveId} (${String(entry.value)}); ` +
          'Pareto domination is undefined on a non-finite value, so no rank can be assigned.',
      );
    }
  }
  return vector;
}

/** `dominators[i]` lists the indices of every candidate that dominates candidate `i`. */
function buildDominationMatrix(vectors: readonly (readonly ParetoObjectiveValue[])[]): number[][] {
  const dominators: number[][] = Array.from({ length: vectors.length }, () => []);
  for (let incumbent = 0; incumbent < vectors.length; incumbent++) {
    for (let challenger = 0; challenger < vectors.length; challenger++) {
      if (challenger === incumbent) continue;
      if (dominates(vectors[challenger]!, vectors[incumbent]!)) {
        dominators[incumbent]!.push(challenger);
      }
    }
  }
  return dominators;
}

/**
 * rank(i) = 1 + max{rank(d) : d dominates i}. Equivalent to peeling layers off the cohort: a
 * candidate survives layer r exactly when all of its dominators were removed in layers < r.
 */
function assignRanks(dominators: readonly number[][]): number[] {
  const ranks = new Array<number>(dominators.length).fill(0);
  const resolveRank = (index: number): number => {
    const memoised = ranks[index]!;
    if (memoised > 0) return memoised;
    let deepestDominatorRank = 0;
    for (const dominator of dominators[index]!) {
      deepestDominatorRank = Math.max(deepestDominatorRank, resolveRank(dominator));
    }
    const rank = deepestDominatorRank + 1;
    ranks[index] = rank;
    return rank;
  };
  for (let index = 0; index < dominators.length; index++) resolveRank(index);
  return ranks;
}

function uniqueSiteIds(candidates: readonly ParetoRankedCandidate[], indices: readonly number[]): string[] {
  const ids = new Set<string>();
  for (const index of indices) ids.add(candidates[index]!.siteId);
  return [...ids];
}

/**
 * Assign every candidate its Pareto rank and dominating set, and describe the frontier itself.
 * The cohort order is preserved: this function never reorders the caller's candidates.
 */
export function computeParetoFrontier<T extends ParetoRankedCandidate>(
  candidates: readonly T[],
): ParetoFrontierResult {
  const vectors = candidates.map(readValidatedVector);
  const dominators = buildDominationMatrix(vectors);
  const ranks = assignRanks(dominators);

  const assignments: ParetoRankAssignment[] = candidates.map((_candidate, index) => ({
    rank: ranks[index]!,
    dominatedBy: uniqueSiteIds(candidates, dominators[index]!),
  }));

  const rank1Indices = candidates.map((_candidate, index) => index).filter((index) => ranks[index] === 1);

  return {
    assignments,
    frontier: {
      method: 'non_dominated_sort',
      scalarisation: 'none',
      dominationRule: PARETO_DOMINATION_RULE,
      // Copied per response: these descriptors also live in the content-addressable cache, and a
      // consumer must never be able to mutate the module-level objective catalogue.
      objectives: PARETO_OBJECTIVES.map((objective) => ({ ...objective })),
      activeObjectiveIds: [...ACTIVE_PARETO_OBJECTIVE_IDS],
      unavailableObjectiveIds: [...UNAVAILABLE_PARETO_OBJECTIVE_IDS],
      rankCount: ranks.reduce((highest, rank) => Math.max(highest, rank), 0),
      rank1SiteIds: uniqueSiteIds(candidates, rank1Indices),
    },
  };
}
