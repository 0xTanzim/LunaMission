/**
 * Tier 3 Pairwise Candidate Selection
 *
 * Projects two ranked candidates onto the flat input the pairwise delta matrix needs. Extracted
 * from the comparison service (AGENTS.md § 5.1) so the service keeps reading as orchestration:
 * gate → rank → frontier → pairwise.
 *
 * Selection rule, unchanged: an explicit `pairwiseSelection` wins when both ids resolve, otherwise
 * the two highest-ranked candidates are compared, otherwise there is no pairwise block at all.
 */

import type { RankedFeasibleCandidate } from '@luna/contracts';
import type { PairwiseCandidateData } from './scenarioCompareTier3';

export function toPairwiseCandidate(candidate: RankedFeasibleCandidate): PairwiseCandidateData {
  return {
    siteId: candidate.siteId,
    siteName: candidate.siteName,
    longestContinuousSunlight: candidate.metrics.longestContinuousSunlightHours,
    maxContinuousDarkness: candidate.metrics.maxContinuousDarknessHours,
    cumulativeDteHours: candidate.metrics.cumulativeDteHours,
    cumulativeOverlapHours: candidate.metrics.cumulativeOverlapHours,
    uncertaintySpanHours: candidate.metrics.terrainUncertaintySpanHours,
  };
}

export interface PairwiseSelection {
  readonly siteIdA?: string;
  readonly siteIdB?: string;
}

export interface SelectedPair {
  readonly candidateA: PairwiseCandidateData | null;
  readonly candidateB: PairwiseCandidateData | null;
}

export function selectPairwiseCandidates(
  ranked: readonly RankedFeasibleCandidate[],
  selection?: PairwiseSelection,
): SelectedPair {
  const explicitA = selection?.siteIdA ? ranked.find((candidate) => candidate.siteId === selection.siteIdA) : undefined;
  const explicitB = selection?.siteIdB ? ranked.find((candidate) => candidate.siteId === selection.siteIdB) : undefined;

  if (explicitA && explicitB) {
    return { candidateA: toPairwiseCandidate(explicitA), candidateB: toPairwiseCandidate(explicitB) };
  }

  const first = ranked[0];
  const second = ranked[1];
  if (first && second) {
    return { candidateA: toPairwiseCandidate(first), candidateB: toPairwiseCandidate(second) };
  }

  return { candidateA: null, candidateB: null };
}
