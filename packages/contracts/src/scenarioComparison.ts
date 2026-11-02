import { z } from 'zod';
import {
  sixStateResultStatusSchema,
  siteEntityTypeEnum,
  scenarioCoordinatesSchema,
  provenanceManifestSchema,
} from './scenarioEvaluation';

export const vehicleConstraintsSchema = z.object({
  minContinuousSunlightHours: z.number().min(0.0).max(672.0).default(120.0),
  maxContinuousDarknessHours: z.number().min(0.0).max(672.0).default(16.0),
  minDteHours: z.number().min(0.0).max(672.0).default(80.0),
  maxLandingSlopeDeg: z.number().min(0.0).max(45.0).default(10.0),
});
export type VehicleConstraints = z.infer<typeof vehicleConstraintsSchema>;

export const sortMetricKeyEnum = z.enum([
  'longestContinuousSunlight', 'maxContinuousDarkness', 'cumulativeDteHours',
  'cumulativeOverlapHours', 'cumulativeSunlight', 'maxLandingSlope', 'terrainUncertaintySpan',
]);
export type SortMetricKey = z.infer<typeof sortMetricKeyEnum>;

export const scenarioCompareRequestSchema = z.object({
  siteIds: z.array(z.string().min(1)).min(2, 'At least 2 sites required for comparison').max(20, 'Maximum 20 sites allowed'),
  startUtc: z.string().datetime().default('2026-11-01T00:00:00.000Z'),
  stopUtc: z.string().datetime().default('2026-11-15T00:00:00.000Z'),
  observerMastHeightM: z.union([z.literal(1.0), z.literal(2.0), z.literal(5.0), z.literal(10.0)]).default(2.0),
  sunVisibilityCriterion: z.enum(['upperLimb', 'fullDisk']).default('upperLimb'),
  earthVisibilityCriterion: z.enum(['center', 'fullDisk', 'anyLimb']).default('center'),
  launchSlipOffsetDays: z.number().min(0.0).max(28.0).default(0.0),
  vehicleConstraints: vehicleConstraintsSchema.default({
    minContinuousSunlightHours: 120.0, maxContinuousDarknessHours: 16.0, minDteHours: 80.0, maxLandingSlopeDeg: 10.0,
  }),
  rankingPreferences: z.object({
    primarySortMetric: sortMetricKeyEnum.default('longestContinuousSunlight'),
    secondarySortMetric: sortMetricKeyEnum.default('maxContinuousDarkness'),
    tertiarySortMetric: sortMetricKeyEnum.default('cumulativeOverlapHours'),
    tieToleranceHours: z.number().min(0.0).max(24.0).default(2.0),
  }).default({
    primarySortMetric: 'longestContinuousSunlight', secondarySortMetric: 'maxContinuousDarkness', tertiarySortMetric: 'cumulativeOverlapHours', tieToleranceHours: 2.0,
  }),
  pairwiseSelection: z.object({ siteIdA: z.string().optional(), siteIdB: z.string().optional() }).optional(),
  epochIso: z.string().optional(),
  epochMs: z.number().optional(),
  calculationMode: z.string().optional(),
  stakeholderWeights: z.array(z.number()).optional(),
});
export type ScenarioCompareRequest = z.infer<typeof scenarioCompareRequestSchema>;
export const ScenarioCompareRequestSchema = scenarioCompareRequestSchema;

/** The four configured Tier-1 vehicle limits. Shared by the gating and decision-trace surfaces. */
export const constraintNameEnum = z.enum([
  'minContinuousSunlight',
  'maxContinuousDarkness',
  'minDte',
  'maxLandingSlope',
]);
export type ConstraintName = z.infer<typeof constraintNameEnum>;

export const rejectionReasonSchema = z.object({
  constraintName: constraintNameEnum,
  thresholdValue: z.number(),
  observedValue: z.number(),
  unit: z.string(),
  marginOfFailure: z.number(),
  narrative: z.string(),
});
export type RejectionReason = z.infer<typeof rejectionReasonSchema>;

export const disqualifiedCandidateSchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  entityType: siteEntityTypeEnum,
  rejectionReasons: z.array(rejectionReasonSchema),
});
export type DisqualifiedCandidate = z.infer<typeof disqualifiedCandidateSchema>;

/**
 * Plan.md § 6.5 — Non-Dominated Pareto Frontier Contracts
 *
 * Purely ADDITIVE: every field below is optional, so responses and fixtures produced before
 * the frontier existed keep type-checking and validating unchanged.
 *
 * Hard invariant: an objective carries its physical unit and nothing else. There is no weight,
 * no composite/utility score and no 0–100 normalisation anywhere in this block, because either
 * would let a fatal flaw in one criterion be averaged away by strength in another (ADR-06).
 */

/**
 * Objectives as they can actually be computed from this data model.
 *
 * f4 is `nominalPointSlopeDeg`, NOT the landing-ellipse P95 of Plan.md § 6.5: the response
 * carries a nominal single-point slope, and naming it after a statistic it is not would be a
 * fabricated claim (skill ref 07 § 5: a point result does not represent an ellipse).
 * f5 (`psrTraversabilityDistanceM`) has no field in the data model at all.
 */
export const paretoObjectiveIdEnum = z.enum([
  'longestContinuousSunlightHours',
  'maxContinuousDarknessHours',
  'cumulativeDteHours',
  'nominalPointSlopeDeg',
  'psrTraversabilityDistanceM',
]);
export type ParetoObjectiveId = z.infer<typeof paretoObjectiveIdEnum>;

export const paretoDirectionEnum = z.enum(['maximize', 'minimize']);
export type ParetoDirection = z.infer<typeof paretoDirectionEnum>;

/**
 * `available`    — the objective is computed from a real field and takes part in domination.
 * `nominal_only` — a nominal value exists and takes part in domination, but it is not the
 *                  quantity Plan.md § 6.5 names; the limitation must be rendered with it.
 * `unavailable`  — no value exists. The objective takes no part in domination and MUST be
 *                  rendered as unknown, never as 0, as infinity, or as "best".
 */
export const paretoAvailabilityEnum = z.enum(['available', 'nominal_only', 'unavailable']);
export type ParetoAvailability = z.infer<typeof paretoAvailabilityEnum>;

/**
 * Cohort-level description of one objective. Deliberately carries NO `value`: an objective
 * descriptor is not a result, so no client can read a number for an objective that has none.
 * Per-candidate values live in `rankedFeasibleCandidateSchema.metrics` under `sourceField`.
 */
export const paretoObjectiveSchema = z.object({
  objectiveIndex: z.number().int().min(1).max(5),
  objectiveId: paretoObjectiveIdEnum,
  label: z.string(),
  unit: z.string(),
  direction: paretoDirectionEnum,
  availability: paretoAvailabilityEnum,
  /** Path of the field holding the value, absent when the objective is unavailable. */
  sourceField: z.string().optional(),
  /** What the number physically measures — and, where relevant, what it does not measure. */
  measurementBasis: z.string(),
  /** Why the objective is unavailable or only nominal. Absent when fully available. */
  limitationNote: z.string().optional(),
  participatesInDomination: z.boolean(),
});
export type ParetoObjective = z.infer<typeof paretoObjectiveSchema>;

export const paretoRankAssignmentSchema = z.object({
  /** 1 = non-dominated. Independent of the lexicographic Tier-2 `rank` on the same object. */
  rank: z.number().int().positive(),
  /**
   * Site IDs of every candidate that dominates this one (transitive closure: dominance is
   * transitive). Empty for rank 1. IDs are de-duplicated, which is lossless because a repeated
   * site ID always re-evaluates to identical metrics.
   */
  dominatedBy: z.array(z.string()),
});
export type ParetoRankAssignment = z.infer<typeof paretoRankAssignmentSchema>;

export const paretoFrontierSchema = z.object({
  method: z.literal('non_dominated_sort'),
  scalarisation: z.literal('none'),
  dominationRule: z.string(),
  objectives: z.array(paretoObjectiveSchema).min(1),
  activeObjectiveIds: z.array(paretoObjectiveIdEnum),
  unavailableObjectiveIds: z.array(paretoObjectiveIdEnum),
  /** Number of distinct Pareto ranks in the cohort; 0 for an empty cohort. */
  rankCount: z.number().int().min(0),
  rank1SiteIds: z.array(z.string()),
});
export type ParetoFrontier = z.infer<typeof paretoFrontierSchema>;

export const rankedFeasibleCandidateSchema = z.object({
  rank: z.number().int().positive(),
  siteId: z.string(),
  siteName: z.string(),
  entityType: siteEntityTypeEnum,
  coordinates: scenarioCoordinatesSchema,
  metrics: z.object({
    longestContinuousSunlightHours: z.number(),
    maxContinuousDarknessHours: z.number(),
    cumulativeSunlitHours: z.number(),
    solarAccessPercentage: z.number(),
    cumulativeDteHours: z.number(),
    dteAccessPercentage: z.number(),
    cumulativeOverlapHours: z.number(),
    landingSlopeDeg: z.number(),
    terrainUncertaintySpanHours: z.number(),
  }),
  sortKeyTrace: z.array(z.object({
    metric: sortMetricKeyEnum,
    value: z.number(),
    tieBroken: z.boolean(),
  })),
  /**
   * Plan.md § 6.5 non-dominated rank. Optional so pre-frontier fixtures keep type-checking;
   * the compare service always emits it for feasible candidates.
   */
  pareto: paretoRankAssignmentSchema.optional(),
});
export type RankedFeasibleCandidate = z.infer<typeof rankedFeasibleCandidateSchema>;

export const pairwiseDeltaItemSchema = z.object({
  metricKey: z.string(),
  metricLabel: z.string(),
  unit: z.string(),
  valueA: z.number(),
  valueB: z.number(),
  absoluteDelta: z.number(),
  percentDelta: z.number(),
  favoredSite: z.enum(['siteA', 'siteB', 'tie']),
  operationalSignificance: z.string(),
});
export type PairwiseDeltaItem = z.infer<typeof pairwiseDeltaItemSchema>;

export const tier3PairwiseDeltaSchema = z.object({
  siteA: z.object({ siteId: z.string(), siteName: z.string() }),
  siteB: z.object({ siteId: z.string(), siteName: z.string() }),
  deltas: z.array(pairwiseDeltaItemSchema),
  terrainSensitivityComparison: z.object({
    uncertaintySpanHoursA: z.number(),
    uncertaintySpanHoursB: z.number(),
    whiskerRatio: z.number(),
    lowerRiskSite: z.enum(['siteA', 'siteB', 'tie']),
  }),
  objectiveTradeOffNarrative: z.string(),
});
export type Tier3PairwiseDelta = z.infer<typeof tier3PairwiseDeltaSchema>;

/**
 * ## C13 — Evidence & Decision Trace
 *
 * Purely ADDITIVE: `decisionTrace` is optional on the compare response and every sub-field a
 * consumer may not have is optional too, so payloads and fixtures written before the trace
 * existed keep validating unchanged.
 *
 * The trace exists because a gate verdict ("passed", "failed") is not an explanation. Every
 * candidate must publish, in physical units, which configured limit decided it, which dataset
 * and solver produced the deciding number, what uncertainty applies to that number, which
 * capabilities would have informed the decision but carry no data, and how the verdict moves
 * when the epoch, the vehicle profile or a model assumption changes.
 *
 * Non-negotiable rule encoded in this schema: a verdict that rests on absent or two-sided
 * evidence is `insufficient-evidence`. It is never `feasible`, so it can never be ranked as
 * competitive. There is no field here in which a missing number could be carried as a 0.
 */

export const decisionTraceOutcomeEnum = z.enum(['feasible', 'disqualified', 'insufficient-evidence']);
export type DecisionTraceOutcome = z.infer<typeof decisionTraceOutcomeEnum>;

/** The gated metrics, named exactly as the Pareto/ranking objectives name them. */
export const decisionTraceMetricIdEnum = z.enum([
  'longestContinuousSunlightHours',
  'maxContinuousDarknessHours',
  'cumulativeDteHours',
  'nominalPointSlopeDeg',
]);
export type DecisionTraceMetricId = z.infer<typeof decisionTraceMetricIdEnum>;

/**
 * How much authority a number carries.
 *  `measured`     — computed on a fully valid skyline from the certified solver.
 *  `bounded`      — computed on a one-sided skyline (truncated/nodata bins): a stated bound.
 *  `nominal_only` — a nominal point value exists, but no dispersion/quantile statistic does.
 *  `assumed`      — computed from a non-authoritative model (e.g. an ephemeris outage fallback).
 *  `unavailable`  — no value at all. `value` is then `null`, never 0.
 */
export const decisionEvidenceClassEnum = z.enum([
  'measured',
  'bounded',
  'nominal_only',
  'assumed',
  'unavailable',
]);
export type DecisionEvidenceClass = z.infer<typeof decisionEvidenceClassEnum>;

export const decisionTraceEvidenceSchema = z.object({
  metricId: decisionTraceMetricIdEnum,
  metricLabel: z.string(),
  unit: z.string(),
  /** `null` when the evidence is `unavailable`. A zero here would read as a real measurement. */
  value: z.number().nullable(),
  /** Response path the value was read from, so a reader can re-derive it. */
  field: z.string(),
  /** Product/dataset identifier, e.g. `NASA_LOLA_PDS_LDEM_85S_20M`. */
  datasetId: z.string(),
  datasetRole: z.enum(['terrain_horizon', 'site_topography', 'ephemeris']),
  /** Solver or model that turned the dataset into this number. */
  algorithm: z.string(),
  evidenceClass: decisionEvidenceClassEnum,
  note: z.string().optional(),
});
export type DecisionTraceEvidence = z.infer<typeof decisionTraceEvidenceSchema>;

export const decisionTraceConstraintVerdictEnum = z.enum(['satisfied', 'violated', 'undecidable']);
export type DecisionTraceConstraintVerdict = z.infer<typeof decisionTraceConstraintVerdictEnum>;

/**
 * How the verdict behaves when the terrain sensitivity bracket is applied.
 *  `verdict_holds`     — the verdict is identical at the pessimistic and optimistic bound.
 *  `verdict_flips`     — the bracket straddles the limit: the verdict is not certifiable.
 *  `no_bracket_available` — no dispersion data exists for this metric; see `unavailable`.
 */
export const decisionUncertaintyEffectEnum = z.enum([
  'verdict_holds',
  'verdict_flips',
  'no_bracket_available',
]);
export type DecisionUncertaintyEffect = z.infer<typeof decisionUncertaintyEffectEnum>;

export const decisionTraceConstraintSchema = z.object({
  constraintName: constraintNameEnum,
  metricId: decisionTraceMetricIdEnum,
  /** `at_least` for minimum requirements, `at_most` for maximum allowances. */
  relation: z.enum(['at_least', 'at_most']),
  label: z.string(),
  thresholdValue: z.number(),
  /** Nominal metric value, or `null` when the metric has no evidence at all. */
  observedValue: z.number().nullable(),
  unit: z.string(),
  /**
   * Signed physical distance from the limit under the sign convention
   * `at_least: observed - threshold`, `at_most: threshold - observed`.
   * Negative ALWAYS means the limit is violated. `null` when undecidable.
   */
  marginSigned: z.number().nullable(),
  /** Reader-facing sentence carrying the physical margin and its unit. */
  marginNarrative: z.string(),
  verdict: decisionTraceConstraintVerdictEnum,
  uncertaintyEffect: decisionUncertaintyEffectEnum,
  evidence: decisionTraceEvidenceSchema,
});
export type DecisionTraceConstraint = z.infer<typeof decisionTraceConstraintSchema>;

export const decisionMetricBracketSchema = z.object({
  metricId: decisionTraceMetricIdEnum,
  unit: z.string(),
  /** Worst physically supported value (pessimistic bound of the terrain sensitivity envelope). */
  pessimistic: z.number(),
  nominal: z.number(),
  /** Best physically supported value (optimistic bound). Not a confidence interval. */
  optimistic: z.number(),
});
export type DecisionMetricBracket = z.infer<typeof decisionMetricBracketSchema>;

export const decisionTraceEventTimingUncertaintySchema = z.object({
  availability: z.enum(['available', 'unavailable']),
  method: z.string(),
  eventWhiskerCount: z.number().int().min(0),
  widestWhiskerSpanHours: z.number().nullable(),
  description: z.string(),
});
export type DecisionTraceEventTimingUncertainty = z.infer<typeof decisionTraceEventTimingUncertaintySchema>;

export const decisionTraceUncertaintySchema = z.object({
  availability: z.enum(['available', 'unavailable']),
  method: z.string(),
  description: z.string(),
  /** True iff every gated constraint keeps the same verdict across its bracket. */
  verdictRobust: z.boolean(),
  metricBrackets: z.array(decisionMetricBracketSchema),
  eventTiming: decisionTraceEventTimingUncertaintySchema,
});
export type DecisionTraceUncertainty = z.infer<typeof decisionTraceUncertaintySchema>;

/**
 * A capability that would have informed this decision but has no data in this data model.
 * Publishing it is the difference between "unknown" and "fine": a consumer that renders this
 * entry cannot mistake the absence of a capability for a favourable result.
 */
export const decisionTraceUnavailableSchema = z.object({
  capabilityId: z.string(),
  label: z.string(),
  appliesToConstraints: z.array(constraintNameEnum),
  /** What the decision may NOT be read as, given this gap. */
  consequence: z.string(),
});
export type DecisionTraceUnavailable = z.infer<typeof decisionTraceUnavailableSchema>;

export const decisionTraceSensitivitySchema = z.object({
  modelAssumption: z.object({
    /** True: re-derived from the terrain sensitivity bracket already in the response. */
    recomputed: z.boolean(),
    knob: z.string(),
    outcomeNominal: decisionTraceOutcomeEnum,
    /** Verdict re-gated at the pessimistic end of the bracket. */
    outcomePessimistic: decisionTraceOutcomeEnum,
    /** Verdict re-gated at the optimistic end of the bracket. */
    outcomeOptimistic: decisionTraceOutcomeEnum,
    description: z.string(),
  }),
  vehicleProfile: z.object({
    recomputed: z.boolean(),
    /** Exact limit at which the decisive constraint's verdict flips. No arbitrary multipliers. */
    decisiveThreshold: z
      .object({
        constraintName: constraintNameEnum,
        currentLimit: z.number(),
        unit: z.string(),
        flipAtNominal: z.number(),
        flipAtWorstCase: z.number(),
        direction: z.enum(['lower_the_limit', 'raise_the_limit', 'none']),
        narrative: z.string(),
      })
      .nullable(),
    description: z.string(),
  }),
  epoch: z.object({
    /** Always false: an epoch sweep needs a new ephemeris query and a full solver pass. */
    recomputed: z.literal(false),
    knobs: z.array(z.string()),
    description: z.string(),
  }),
});
export type DecisionTraceSensitivity = z.infer<typeof decisionTraceSensitivitySchema>;

export const decisionTraceEntrySchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  entityType: siteEntityTypeEnum,
  outcome: decisionTraceOutcomeEnum,
  /** Tier-2 rank when the candidate is ranked; `null` when it is not (never 0 or omitted). */
  rank: z.number().int().positive().nullable(),
  /** The configured constraint that decided this outcome. `null` only if none was evaluable. */
  bindingConstraint: decisionTraceConstraintSchema.nullable(),
  /** All four configured constraints as evaluated for this candidate, in a fixed order. */
  constraints: z.array(decisionTraceConstraintSchema),
  evidence: z.array(decisionTraceEvidenceSchema),
  uncertainty: decisionTraceUncertaintySchema,
  unavailable: z.array(decisionTraceUnavailableSchema),
  sensitivity: decisionTraceSensitivitySchema,
  narrative: z.string(),
});
export type DecisionTraceEntry = z.infer<typeof decisionTraceEntrySchema>;

export const decisionTraceSchema = z.object({
  traceVersion: z.string(),
  /** Verdict counts of the cohort; `feasible + disqualified + insufficientEvidence` = cohort size. */
  outcomeCounts: z.object({
    feasible: z.number().int().min(0),
    disqualified: z.number().int().min(0),
    insufficientEvidence: z.number().int().min(0),
  }),
  /** Configured limits the verdicts were computed against, so a reader can reproduce them. */
  evaluatedConstraintLimits: vehicleConstraintsSchema,
  rule: z.string(),
  candidates: z.array(decisionTraceEntrySchema),
});
export type DecisionTrace = z.infer<typeof decisionTraceSchema>;

/**
 * A candidate excluded because its evidence is incomplete. Kept in its own bucket so it can
 * never be counted, ranked or displayed as competitive.
 */
export const insufficientEvidenceCandidateSchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  entityType: siteEntityTypeEnum,
  missingEvidenceIds: z.array(z.string()).min(1),
  narrative: z.string(),
});
export type InsufficientEvidenceCandidate = z.infer<typeof insufficientEvidenceCandidateSchema>;

export const canonicalScenarioCompareResponseSchema = z.object({
  calculationId: z.string(),
  status: sixStateResultStatusSchema,
  rankedSites: z.array(z.record(z.string(), z.any())).optional(),
  scenarioConfig: z.object({
    startUtc: z.string(),
    stopUtc: z.string(),
    totalEvaluationHours: z.number(),
    launchSlipOffsetDays: z.number(),
    observerMastHeightM: z.number(),
    sunVisibilityCriterion: z.enum(['upperLimb', 'fullDisk']),
    earthVisibilityCriterion: z.enum(['center', 'fullDisk', 'anyLimb']),
  }),
  tier1Gating: z.object({
    totalEvaluatedSites: z.number().int(),
    feasibleSitesCount: z.number().int(),
    disqualifiedSitesCount: z.number().int(),
    feasibleSiteIds: z.array(z.string()),
    disqualifiedCandidates: z.array(disqualifiedCandidateSchema),
    /**
     * Candidates whose evidence is incomplete. Deliberately a SEPARATE bucket from
     * `feasibleSiteIds`: an unevaluable candidate is unknown, not viable.
     */
    insufficientEvidenceCandidates: z.array(insufficientEvidenceCandidateSchema).optional(),
    insufficientEvidenceSitesCount: z.number().int().min(0).optional(),
  }),
  tier2Ranking: z.object({
    priorityHierarchy: z.array(sortMetricKeyEnum),
    /** Objectives plus their availability; present on every response this service builds. */
    paretoFrontier: paretoFrontierSchema.optional(),
    rankedCandidates: z.array(rankedFeasibleCandidateSchema),
  }),
  tier3Pairwise: tier3PairwiseDeltaSchema.nullable(),
  /** C13 evidence & decision trace. Optional so pre-trace consumers and fixtures keep working. */
  decisionTrace: decisionTraceSchema.optional(),
  provenance: provenanceManifestSchema,
});

export const legacyCompareSiteRankItemSchema = z.object({
  siteId: z.string(),
  siteName: z.string(),
  rank: z.number().int().positive(),
  relativeCloseness: z.number().optional(),
  cassaViable: z.boolean().optional(),
  meanSlopeDeg: z.number().optional(),
  avgIlluminationPct: z.number().optional(),
  dteVisibilityPct: z.number().optional(),
});

export const legacyScenarioCompareResponseSchema = z.object({
  epochIso: z.string().optional(),
  epochMs: z.number().optional(),
  calculationMode: z.string().optional(),
  status: sixStateResultStatusSchema,
  rankedSites: z.array(legacyCompareSiteRankItemSchema),
});

export const scenarioCompareResponseSchema = canonicalScenarioCompareResponseSchema;
export type ScenarioCompareResponse = z.infer<typeof canonicalScenarioCompareResponseSchema>;
export const ScenarioCompareResponseSchema = scenarioCompareResponseSchema;
export const ComparisonResponseSchema = legacyScenarioCompareResponseSchema;
export type ComparisonResponse = ScenarioCompareResponse;
