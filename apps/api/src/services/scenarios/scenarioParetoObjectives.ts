/**
 * Plan.md § 6.5 Pareto Objective Catalogue
 *
 * Single source of truth for the five objectives: how each is labelled, which physical unit it
 * keeps, which way it is optimised, which response field supplies its value, and whether it can
 * be evaluated at all. Governed by AGENTS.md § 4 (scientific labels) and skill reference 07
 * (uncertainty and sensitivity).
 *
 * Two objectives need explicit protection against being read as something they are not:
 *
 *  - f4. Plan.md § 6.5 asks for a landing-ellipse P95 slope. What this data model actually holds
 *    is a nominal single-coordinate slope (`topography.maxSlopeDeg`). It is exposed as
 *    `nominalPointSlopeDeg` and labelled "Nominal Point Slope", never "P95" and never an ellipse
 *    metric: a point result does not represent a landing ellipse (skill ref 07 § 5, ADR-05).
 *  - f5. There is no traversable-distance-to-PSR field anywhere in the data model. It is
 *    reported as `unavailable` with no value and removed from the dominance test. `unavailable`
 *    is "unknown", not 0 m and not "best" — imputing either would fabricate a result.
 */

import type { ParetoObjective, ParetoObjectiveId } from '@luna/contracts';

/** The subset of a ranked candidate the objective vector needs. Keeps the solver decoupled. */
export interface ParetoObjectiveInput {
  readonly metrics: {
    readonly longestContinuousSunlightHours: number;
    readonly maxContinuousDarknessHours: number;
    readonly cumulativeDteHours: number;
    readonly landingSlopeDeg: number;
  };
}

/**
 * How domination is decided, published to clients so the frontier is reproducible without
 * reverse-engineering it. Comparison is plain ordered comparison in each objective's own unit.
 */
export const PARETO_DOMINATION_RULE =
  'x_A dominates x_B iff x_A is at least as good as x_B on every objective that participates in ' +
  'domination and strictly better on at least one. Objectives are compared in their own physical ' +
  'units by plain ordering: no weights, no normalisation, no composite score and no epsilon, so ' +
  'equality on every participating objective is a tie rather than domination. Rank 1 is the ' +
  'non-dominated set; rank r+1 is the non-dominated set of the cohort once ranks 1..r are removed. ' +
  'Objectives marked unavailable carry no value and take no part in the test.';

export const PARETO_OBJECTIVES: readonly ParetoObjective[] = [
  {
    objectiveIndex: 1,
    objectiveId: 'longestContinuousSunlightHours',
    label: 'Longest Continuous Sunlight',
    unit: 'hours',
    direction: 'maximize',
    availability: 'available',
    sourceField: 'metrics.longestContinuousSunlightHours',
    measurementBasis:
      'Longest continuous Sun-visible interval inside the evaluation window, from the Hermite/Rolle ' +
      'event-splitting visibility solver on the any-limb (upper_limb) solar criterion.',
    participatesInDomination: true,
  },
  {
    objectiveIndex: 2,
    objectiveId: 'maxContinuousDarknessHours',
    label: 'Maximum Continuous Darkness',
    unit: 'hours',
    direction: 'minimize',
    availability: 'available',
    sourceField: 'metrics.maxContinuousDarknessHours',
    measurementBasis:
      'Longest continuous interval inside the evaluation window with no Sun-visible geometry, i.e. ' +
      'the worst single cold-soak the surface power system must ride through.',
    participatesInDomination: true,
  },
  {
    objectiveIndex: 3,
    objectiveId: 'cumulativeDteHours',
    label: 'Cumulative Direct-to-Earth Hours',
    unit: 'hours',
    direction: 'maximize',
    availability: 'available',
    sourceField: 'metrics.cumulativeDteHours',
    measurementBasis:
      'Cumulative geometric Earth line-of-sight duration inside the evaluation window. Geometric ' +
      'line-of-sight only: not an RF link-budget closure and not a guaranteed datalink.',
    participatesInDomination: true,
  },
  {
    objectiveIndex: 4,
    objectiveId: 'nominalPointSlopeDeg',
    label: 'Nominal Point Slope',
    unit: 'degrees',
    direction: 'minimize',
    availability: 'nominal_only',
    sourceField: 'metrics.landingSlopeDeg',
    measurementBasis:
      'Nominal slope sampled at the registered landing coordinate (site topography profile, ' +
      'topography.maxSlopeDeg, LOLA-derived transect). One nominal number: no dispersion, no ' +
      'quantile, no area weighting.',
    limitationNote:
      'Plan.md § 6.5 defines f4 as a landing-ellipse P95 slope. Area-weighted landing-ellipse ' +
      'dispersion sampling does not exist in this data model, so f4 participates with the NOMINAL ' +
      'POINT SLOPE only. It is not a P95 quantile, not an area-weighted statistic and carries no ' +
      'probability semantics; never render it as "P95 slope" or as a landing-ellipse metric, and do ' +
      'not treat it as a robust guarantee across a touchdown dispersion ellipse.',
    participatesInDomination: true,
  },
  {
    objectiveIndex: 5,
    objectiveId: 'psrTraversabilityDistanceM',
    label: 'Traversable Distance to Nearest PSR',
    unit: 'meters',
    direction: 'minimize',
    availability: 'unavailable',
    measurementBasis:
      'Plan.md § 6.5 f5: slope-supported traversable route distance from the landing site to the ' +
      'nearest permanently shadowed region, in metres.',
    limitationNote:
      'UNAVAILABLE — no value is emitted and f5 takes no part in the dominance test. The data model ' +
      'holds no traversable route distance to a PSR; the only PSR fields available are a straight-line ' +
      'proximity in kilometres (site investigation registry psrProximityKm) and a transect shadow flag, ' +
      'neither of which is a traversable path distance in metres. f5 is omitted rather than scored as ' +
      '0 m or as infinity: render it as unknown, never as a favourable or unfavourable number.',
    participatesInDomination: false,
  },
];

/** Objectives that carry a real value and therefore shape the frontier. */
export const ACTIVE_PARETO_OBJECTIVES: readonly ParetoObjective[] = PARETO_OBJECTIVES.filter(
  (objective) => objective.participatesInDomination,
);

export const ACTIVE_PARETO_OBJECTIVE_IDS: readonly ParetoObjectiveId[] = ACTIVE_PARETO_OBJECTIVES.map(
  (objective) => objective.objectiveId,
);

export const UNAVAILABLE_PARETO_OBJECTIVE_IDS: readonly ParetoObjectiveId[] = PARETO_OBJECTIVES.filter(
  (objective) => !objective.participatesInDomination,
).map((objective) => objective.objectiveId);

/**
 * Value extractor per objective. `null` marks an objective the data model cannot evaluate — the
 * null is load-bearing: it is why f5 can never contribute a number to the comparison.
 */
const OBJECTIVE_VALUE_READERS: Readonly<
  Record<ParetoObjectiveId, ((input: ParetoObjectiveInput) => number) | null>
> = {
  longestContinuousSunlightHours: (input) => input.metrics.longestContinuousSunlightHours,
  maxContinuousDarknessHours: (input) => input.metrics.maxContinuousDarknessHours,
  cumulativeDteHours: (input) => input.metrics.cumulativeDteHours,
  nominalPointSlopeDeg: (input) => input.metrics.landingSlopeDeg,
  psrTraversabilityDistanceM: null,
};

export interface ParetoObjectiveValue {
  readonly objectiveId: ParetoObjectiveId;
  readonly direction: 'maximize' | 'minimize';
  readonly value: number;
}

/**
 * The objective vector of one candidate, in Plan.md § 6.5 order, restricted to objectives that
 * participate in domination. Two candidates are only comparable when built by this function, so
 * the vector is always the same length and position k is always the same objective.
 */
export function readParetoObjectiveVector(input: ParetoObjectiveInput): ParetoObjectiveValue[] {
  return ACTIVE_PARETO_OBJECTIVES.map((objective) => {
    const reader = OBJECTIVE_VALUE_READERS[objective.objectiveId];
    if (reader === null) {
      throw new Error(
        `Objective ${objective.objectiveId} is marked as participating in domination but has no value reader.`,
      );
    }
    return {
      objectiveId: objective.objectiveId,
      direction: objective.direction,
      value: reader(input),
    };
  });
}
