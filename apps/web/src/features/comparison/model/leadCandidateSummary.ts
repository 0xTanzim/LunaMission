import type { RankedFeasibleCandidate } from '@luna/contracts';

/**
 * Reading a ranked cohort for the lead-candidate summary.
 *
 * Each observable is ranked on its own — never blended into a score. `docs/OBSERVABLE_LABELS.md`
 * keeps geometric sunlight, geometric Earth line-of-sight and landing slope as separate physical
 * quantities, so this module only selects and formats, it never combines.
 */
export interface ObservableReadout {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
  readonly decimals: number;
  readonly lowerIsBetter: boolean;
}

interface ObservableSpec {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly decimals: number;
  readonly lowerIsBetter: boolean;
  readonly read: (candidate: RankedFeasibleCandidate) => number;
}

const OBSERVABLE_SPECS: readonly ObservableSpec[] = [
  {
    id: 'sunlight',
    label: 'Longest continuous sunlight',
    unit: 'h',
    decimals: 1,
    lowerIsBetter: false,
    read: (c) => c.metrics.longestContinuousSunlightHours ?? 0,
  },
  {
    id: 'darkness',
    label: 'Longest continuous darkness',
    unit: 'h',
    decimals: 1,
    lowerIsBetter: true,
    read: (c) => c.metrics.maxContinuousDarknessHours ?? 0,
  },
  {
    id: 'earth-los',
    label: 'Earth line-of-sight (geometric)',
    unit: 'h',
    decimals: 1,
    lowerIsBetter: false,
    read: (c) => c.metrics.cumulativeDteHours ?? 0,
  },
  {
    id: 'slope',
    label: 'Landing slope',
    unit: '°',
    decimals: 1,
    lowerIsBetter: true,
    read: (c) => c.metrics.landingSlopeDeg ?? 0,
  },
];

export function readObservables(candidate: RankedFeasibleCandidate): ObservableReadout[] {
  return OBSERVABLE_SPECS.map((spec) => ({
    id: spec.id,
    label: spec.label,
    value: spec.read(candidate),
    unit: spec.unit,
    decimals: spec.decimals,
    lowerIsBetter: spec.lowerIsBetter,
  }));
}

/** The API already ranks the cohort; the lead candidate is the first rank it returned. */
export function leadCandidate(
  rankedCandidates: readonly RankedFeasibleCandidate[],
): RankedFeasibleCandidate | undefined {
  return rankedCandidates[0];
}

export interface ObservableLeader {
  readonly observableId: string;
  readonly label: string;
  readonly candidate: RankedFeasibleCandidate;
  readonly value: number;
  readonly unit: string;
}

/** The cohort's best candidate per observable, in the order the observables are declared. */
export function observableLeaders(
  rankedCandidates: readonly RankedFeasibleCandidate[],
): ObservableLeader[] {
  if (rankedCandidates.length === 0) return [];
  return OBSERVABLE_SPECS.map((spec) => {
    const best = rankedCandidates.reduce((current, candidate) => {
      const value = spec.read(candidate);
      const currentValue = spec.read(current);
      const wins = spec.lowerIsBetter ? value < currentValue : value > currentValue;
      return wins ? candidate : current;
    });
    return {
      observableId: spec.id,
      label: spec.label,
      candidate: best,
      value: spec.read(best),
      unit: spec.unit,
    };
  });
}

export function formatObservable(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

export function entityLabel(entityType: RankedFeasibleCandidate['entityType']): string {
  return entityType === 'candidate_region' ? 'Region centroid' : 'Research point';
}
