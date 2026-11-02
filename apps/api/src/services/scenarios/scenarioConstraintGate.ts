/**
 * C13 Constraint Gate: turns one evaluated candidate into an explained verdict.
 *
 * The gate answers three questions per configured vehicle limit and never conflates them:
 *   1. what is the nominal number, its unit and its physical margin (violated ⇔ negative margin);
 *   2. does the verdict survive the terrain sensitivity bracket already carried by the response;
 *   3. is there any evidence at all — and if not, the limit is `undecidable`, never "passed".
 *
 * A verdict that is not identical at the pessimistic and at the optimistic bound is not
 * certifiable either way (skill ref 07 § 3–4), so the candidate becomes `insufficient-evidence`.
 * That is the mechanism which stops incomplete data from being quietly ranked as competitive.
 */

import type {
  ConstraintName,
  DecisionMetricBracket,
  DecisionTraceConstraintVerdict,
  DecisionTraceMetricId,
  DecisionTraceOutcome,
  ScenarioEvaluateResponse,
  VehicleConstraints,
} from '@luna/contracts';
import {
  CONSTRAINT_DEFINITIONS,
  CONSTRAINT_ORDER,
  GATED_METRICS,
  readConstraintLimit,
  type ConstraintDefinition,
  type GatedMetricDefinition,
  type UnavailableCapability,
} from './decisionTraceEvidence';
import {
  auditMissingEvidence,
  auditTerrainEvidence,
  classifyEvidence,
  isEphemerisAuthoritative,
  readSlopeEvidence,
  type SlopeEvidence,
  type TerrainEvidenceAudit,
} from './scenarioEvidenceAudit';

export interface DecisionTraceConstraintInternal {
  readonly constraintName: ConstraintName;
  readonly metricId: DecisionTraceMetricId;
  readonly relation: 'at_least' | 'at_most';
  readonly label: string;
  readonly thresholdValue: number;
  readonly observedValue: number | null;
  readonly unit: string;
  readonly marginSigned: number | null;
  readonly marginNarrative: string;
  readonly verdict: DecisionTraceConstraintVerdict;
  readonly uncertaintyEffect: 'verdict_holds' | 'verdict_flips' | 'no_bracket_available';
}

export interface CandidateAssessment {
  readonly evaluation: ScenarioEvaluateResponse;
  readonly constraints: readonly DecisionTraceConstraintInternal[];
  readonly outcome: DecisionTraceOutcome;
  readonly outcomeNominal: DecisionTraceOutcome;
  readonly outcomePessimistic: DecisionTraceOutcome;
  readonly outcomeOptimistic: DecisionTraceOutcome;
  readonly bindingConstraint: DecisionTraceConstraintInternal | null;
  readonly brackets: readonly DecisionMetricBracket[];
  readonly terrain: TerrainEvidenceAudit | null;
  readonly slope: SlopeEvidence;
  readonly ephemerisAuthoritative: boolean;
  readonly missingEvidence: readonly UnavailableCapability[];
}

const round2 = (value: number): number => Number(value.toFixed(2));

/**
 * Physical quantity as it is published: `16.0 h`, `55.98 h`, `11.7°`. Hours keep at least one
 * decimal so an integer-looking bound cannot be mistaken for an exact round number; degrees are
 * rendered to 0.1° because that is the precision of the LOLA terrain transect.
 */
export function formatQuantity(value: number, unit: string): string {
  const decimals = unit === '°' ? 1 : 2;
  let text = round2(value).toFixed(decimals);
  if (text.includes('.')) text = text.replace(/0+$/, '');
  if (text.endsWith('.')) text += '0';
  return unit === '°' ? `${text}°` : `${text} ${unit}`;
}

function finiteOrNull(raw: number | undefined): number | null {
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
}

function metricValue(evaluation: ScenarioEvaluateResponse, metricId: DecisionTraceMetricId): number | null {
  const { metrics } = evaluation;
  switch (metricId) {
    case 'longestContinuousSunlightHours':
      return finiteOrNull(metrics.longestContinuousSunlitWindowHours);
    case 'maxContinuousDarknessHours':
      return finiteOrNull(metrics.longestContinuousDarkWindowHours);
    case 'cumulativeDteHours':
      return finiteOrNull(metrics.cumulativeDteHours);
    case 'nominalPointSlopeDeg':
      // Not a response metric: the slope lives in the site topography profile (see slope evidence).
      return null;
  }
}

function bracketMetricValue(
  evaluation: ScenarioEvaluateResponse,
  block: 'thetaLowMetrics' | 'thetaHighMetrics',
  metricId: DecisionTraceMetricId,
): number | null {
  const metrics = evaluation.uncertaintyEnvelopes[block];
  switch (metricId) {
    case 'longestContinuousSunlightHours':
      return finiteOrNull(metrics.longestContinuousSunlitWindowHours);
    case 'maxContinuousDarknessHours':
      return finiteOrNull(metrics.longestContinuousDarkWindowHours);
    case 'cumulativeDteHours':
      return finiteOrNull(metrics.cumulativeDteHours);
    case 'nominalPointSlopeDeg':
      return null;
  }
}

/**
 * Terrain sensitivity bracket of one metric: the worst and best values the response already
 * publishes (`thetaLowMetrics` / `thetaHighMetrics`). A deterministic envelope, not a confidence
 * interval — hence min/max only, never a percentile.
 */
function metricBracket(
  evaluation: ScenarioEvaluateResponse,
  metricId: DecisionTraceMetricId,
): DecisionMetricBracket | null {
  const nominal = metricValue(evaluation, metricId);
  const low = bracketMetricValue(evaluation, 'thetaLowMetrics', metricId);
  const high = bracketMetricValue(evaluation, 'thetaHighMetrics', metricId);
  if (nominal === null || low === null || high === null) return null;
  return {
    metricId,
    unit: GATED_METRICS[metricId].unit,
    pessimistic: round2(Math.min(nominal, low, high)),
    nominal: round2(nominal),
    optimistic: round2(Math.max(nominal, low, high)),
  };
}

function verdictOf(
  relation: 'at_least' | 'at_most',
  value: number,
  threshold: number,
): DecisionTraceConstraintVerdict {
  if (relation === 'at_least') return value >= threshold ? 'satisfied' : 'violated';
  return value <= threshold ? 'satisfied' : 'violated';
}

/** Signed distance from the limit: negative ALWAYS means violated. */
function signedMargin(relation: 'at_least' | 'at_most', observed: number, threshold: number): number {
  return round2(relation === 'at_least' ? observed - threshold : threshold - observed);
}

function marginSentence(
  definition: ConstraintDefinition,
  metric: GatedMetricDefinition,
  observed: number,
  threshold: number,
  marginSigned: number,
): string {
  const observedText = formatQuantity(observed, metric.unit);
  const thresholdText = formatQuantity(threshold, metric.unit);
  const magnitudeText = formatQuantity(Math.abs(marginSigned), metric.unit);
  if (definition.relation === 'at_least') {
    return marginSigned >= 0
      ? `${metric.label} ${observedText} clears the ${definition.thresholdNoun} ${thresholdText} by +${magnitudeText}`
      : `${metric.label} ${observedText} falls ${magnitudeText} short of the ${definition.thresholdNoun} ${thresholdText}`;
  }
  return marginSigned >= 0
    ? `${metric.label} ${observedText} stays within the ${definition.thresholdNoun} ${thresholdText} with ${magnitudeText} to spare`
    : `${metric.label} ${observedText} exceeds the ${definition.thresholdNoun} ${thresholdText} by +${magnitudeText}`;
}

function outcomeOf(verdicts: readonly DecisionTraceConstraintVerdict[]): DecisionTraceOutcome {
  if (verdicts.includes('violated')) return 'disqualified';
  if (verdicts.includes('undecidable')) return 'insufficient-evidence';
  return 'feasible';
}

function evaluateConstraint(
  name: ConstraintName,
  args: {
    readonly evaluation: ScenarioEvaluateResponse;
    readonly constraints: VehicleConstraints;
    readonly terrain: TerrainEvidenceAudit | null;
    readonly slope: SlopeEvidence;
    readonly ephemerisAuthoritative: boolean;
    readonly bracket: DecisionMetricBracket | null;
  },
): DecisionTraceConstraintInternal {
  const definition = CONSTRAINT_DEFINITIONS[name];
  const metric = GATED_METRICS[definition.metricId];
  const threshold = readConstraintLimit(args.constraints, name);
  const { evidenceClass, note } = classifyEvidence({
    metricId: definition.metricId,
    terrain: args.terrain,
    slope: args.slope,
    ephemerisAuthoritative: args.ephemerisAuthoritative,
  });
  const nominal =
    metric.datasetRole === 'site_topography' ? args.slope.value : metricValue(args.evaluation, definition.metricId);

  if (nominal === null || evidenceClass === 'unavailable') {
    return {
      constraintName: name,
      metricId: definition.metricId,
      relation: definition.relation,
      label: metric.label,
      thresholdValue: threshold,
      observedValue: null,
      unit: metric.unit,
      marginSigned: null,
      marginNarrative: `${metric.label} cannot be evaluated: ${note}`,
      verdict: 'undecidable',
      uncertaintyEffect: 'no_bracket_available',
    };
  }

  const verdict = verdictOf(definition.relation, nominal, threshold);
  const bracket = args.bracket;
  const pessimisticVerdict = verdictOf(definition.relation, bracket?.pessimistic ?? nominal, threshold);
  const optimisticVerdict = verdictOf(definition.relation, bracket?.optimistic ?? nominal, threshold);
  const marginSigned = signedMargin(definition.relation, nominal, threshold);

  return {
    constraintName: name,
    metricId: definition.metricId,
    relation: definition.relation,
    label: metric.label,
    thresholdValue: threshold,
    observedValue: round2(nominal),
    unit: metric.unit,
    marginSigned,
    marginNarrative: marginSentence(definition, metric, nominal, threshold, marginSigned),
    verdict,
    uncertaintyEffect: !bracket
      ? 'no_bracket_available'
      : pessimisticVerdict === verdict && optimisticVerdict === verdict
        ? 'verdict_holds'
        : 'verdict_flips',
  };
}

/**
 * The constraint that decided the outcome:
 *  - disqualified → the violated limit with the largest deficit;
 *  - insufficient-evidence → the limit whose verdict is not certifiable;
 *  - feasible → the satisfied limit with the smallest headroom (the tightest one).
 */
function selectBindingConstraint(
  constraints: readonly DecisionTraceConstraintInternal[],
  outcome: DecisionTraceOutcome,
): DecisionTraceConstraintInternal | null {
  if (constraints.length === 0) return null;

  if (outcome === 'disqualified') {
    const violated = constraints.filter((constraint) => constraint.verdict === 'violated');
    if (violated.length === 0) return null;
    return violated.reduce((worst, current) =>
      (current.marginSigned ?? 0) < (worst.marginSigned ?? 0) ? current : worst,
    );
  }

  if (outcome === 'insufficient-evidence') {
    return (
      constraints.find((constraint) => constraint.verdict === 'undecidable') ??
      constraints.find((constraint) => constraint.uncertaintyEffect === 'verdict_flips') ??
      constraints[0] ??
      null
    );
  }

  const satisfied = constraints.filter(
    (constraint) => constraint.verdict === 'satisfied' && constraint.marginSigned !== null,
  );
  if (satisfied.length === 0) return null;
  return satisfied.reduce((tightest, current) =>
    (current.marginSigned ?? 0) < (tightest.marginSigned ?? 0) ? current : tightest,
  );
}

/**
 * Assess one candidate against the configured limits at the nominal value and at both bracket
 * bounds, then publish the outcome only when all three agree.
 */
export function assessCandidate(
  evaluation: ScenarioEvaluateResponse,
  constraints: VehicleConstraints,
): CandidateAssessment {
  const siteId = evaluation.siteInfo.siteId;
  const terrain = auditTerrainEvidence(siteId, evaluation.scenarioConfig.observerMastHeightM);
  const slope = readSlopeEvidence(siteId);
  const ephemerisAuthoritative = isEphemerisAuthoritative(evaluation);

  const brackets: DecisionMetricBracket[] = [];
  for (const name of CONSTRAINT_ORDER) {
    const metricId = CONSTRAINT_DEFINITIONS[name].metricId;
    if (brackets.some((entry) => entry.metricId === metricId)) continue;
    const bracket = metricBracket(evaluation, metricId);
    if (bracket) brackets.push(bracket);
  }
  const bracketOf = (metricId: DecisionTraceMetricId): DecisionMetricBracket | null =>
    brackets.find((entry) => entry.metricId === metricId) ?? null;

  const evaluated = CONSTRAINT_ORDER.map((name) =>
    evaluateConstraint(name, {
      evaluation,
      constraints,
      terrain,
      slope,
      ephemerisAuthoritative,
      bracket: bracketOf(CONSTRAINT_DEFINITIONS[name].metricId),
    }),
  );

  const outcomeAt = (bound: 'pessimistic' | 'optimistic'): DecisionTraceOutcome =>
    outcomeOf(
      evaluated.map((constraint) => {
        const bracket = bracketOf(constraint.metricId);
        const value = constraint.observedValue === null ? null : (bracket?.[bound] ?? constraint.observedValue);
        return value === null ? 'undecidable' : verdictOf(constraint.relation, value, constraint.thresholdValue);
      }),
    );

  const outcomeNominal = outcomeOf(evaluated.map((constraint) => constraint.verdict));
  const outcomePessimistic = outcomeAt('pessimistic');
  const outcomeOptimistic = outcomeAt('optimistic');
  const unanimous = outcomeNominal === outcomePessimistic && outcomeNominal === outcomeOptimistic;
  const outcome: DecisionTraceOutcome = unanimous ? outcomeNominal : 'insufficient-evidence';

  return {
    evaluation,
    constraints: evaluated,
    outcome,
    outcomeNominal,
    outcomePessimistic,
    outcomeOptimistic,
    bindingConstraint: selectBindingConstraint(evaluated, outcome),
    brackets,
    terrain,
    slope,
    ephemerisAuthoritative,
    missingEvidence: auditMissingEvidence({
      terrain,
      slope,
      ephemerisAuthoritative,
      evaluatedConstraints: evaluated.map((constraint) => constraint.constraintName),
    }),
  };
}
