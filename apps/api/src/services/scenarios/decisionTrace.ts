/**
 * C13 Decision Trace builder.
 *
 * Assembles the published `decisionTrace` block from the per-candidate gate assessments:
 * outcome, binding constraint with its physical margin, the dataset + algorithm behind every
 * deciding number, the uncertainty that applies (or an explicit `unavailable`), the capabilities
 * that would have informed the decision but carry no data, and how the verdict moves when the
 * model assumption, the vehicle profile or the epoch changes.
 *
 * Determinism: candidates are emitted in cohort order and every derived block is a pure function
 * of the assessment, so the same comparison always yields a byte-identical trace.
 */

import type {
  DecisionTrace,
  DecisionTraceConstraint,
  DecisionTraceEntry,
  DecisionTraceEvidence,
  DecisionTraceSensitivity,
  DecisionTraceUncertainty,
  VehicleConstraints,
} from '@luna/contracts';
import { DECISION_TRACE_VERSION } from './engineIdentity';
import { GATED_METRICS } from './decisionTraceEvidence';
import { formatQuantity, type CandidateAssessment, type DecisionTraceConstraintInternal } from './scenarioConstraintGate';
import { classifyEvidence } from './scenarioEvidenceAudit';

/**
 * What the published outcomes mean. Stated in the payload so a consumer does not have to infer
 * the rule from examples — in particular that insufficient evidence is NOT a weak pass.
 */
export const DECISION_TRACE_RULE =
  'A candidate is feasible only when every configured limit is satisfied at the nominal value and ' +
  'at both bounds of the published terrain sensitivity bracket. A violated limit disqualifies it. ' +
  'Anything else — a missing skyline, a missing topography profile, a non-authoritative ephemeris ' +
  'fallback, or a bracket that straddles a limit — is insufficient-evidence and is excluded from ' +
  'ranking instead of being treated as a marginal pass.';

/**
 * The dataset + solver record behind one deciding number. `value` is `null` when the number does
 * not exist — a zero would be indistinguishable from a real measurement.
 */
function buildEvidence(
  assessment: CandidateAssessment,
  constraint: DecisionTraceConstraintInternal,
): DecisionTraceEvidence {
  const metric = GATED_METRICS[constraint.metricId];
  const { evidenceClass, note } = classifyEvidence({
    metricId: constraint.metricId,
    terrain: assessment.terrain,
    slope: assessment.slope,
    ephemerisAuthoritative: assessment.ephemerisAuthoritative,
  });
  return {
    metricId: constraint.metricId,
    metricLabel: metric.label,
    unit: constraint.unit,
    value: constraint.observedValue,
    field: metric.field,
    datasetId: metric.datasetId,
    datasetRole: metric.datasetRole,
    algorithm: metric.algorithm,
    evidenceClass: constraint.verdict === 'undecidable' ? 'unavailable' : evidenceClass,
    note,
  };
}

function toPublishedConstraint(
  constraint: DecisionTraceConstraintInternal,
  evidence: DecisionTraceEvidence,
): DecisionTraceConstraint {
  return {
    constraintName: constraint.constraintName,
    metricId: constraint.metricId,
    relation: constraint.relation,
    label: constraint.label,
    thresholdValue: constraint.thresholdValue,
    observedValue: constraint.observedValue,
    unit: constraint.unit,
    marginSigned: constraint.marginSigned,
    marginNarrative: constraint.marginNarrative,
    verdict: constraint.verdict,
    uncertaintyEffect: constraint.uncertaintyEffect,
    evidence,
  };
}

function buildUncertainty(assessment: CandidateAssessment): DecisionTraceUncertainty {
  const whiskers = assessment.evaluation.uncertaintyEnvelopes.eventWhiskers;
  const spans = whiskers.map((whisker) => whisker.whiskerSpanHours).filter((span) => Number.isFinite(span));
  const verdictRobust =
    assessment.constraints.every(
      (constraint) => constraint.verdict !== 'undecidable' && constraint.uncertaintyEffect !== 'verdict_flips',
    ) && assessment.outcome === assessment.outcomeNominal;

  return {
    availability: assessment.brackets.length > 0 ? 'available' : 'unavailable',
    method:
      assessment.brackets.length > 0
        ? 'DEM_TERRAIN_ENVELOPE_THETA_LOW_HIGH'
        : 'unavailable',
    description:
      assessment.brackets.length > 0
        ? 'Deterministic terrain sensitivity envelope: every gated metric is re-evaluated on the ' +
          'thetaLow and thetaHigh horizon profiles and reported as pessimistic/nominal/optimistic. ' +
          'This is a sensitivity band, not a confidence interval, and no probability is implied.'
        : 'The response carried no terrain sensitivity envelope, so no band exists for the gated ' +
          'metrics. Treat the numbers as single deterministic values with unknown sensitivity.',
    verdictRobust,
    metricBrackets: assessment.brackets.map((bracket) => ({ ...bracket })),
    eventTiming: {
      availability: whiskers.length > 0 ? 'available' : 'unavailable',
      method: whiskers.length > 0 ? 'EVENT_WHISKER_DTSTAR_BRACKET' : 'unavailable',
      eventWhiskerCount: whiskers.length,
      widestWhiskerSpanHours: spans.length > 0 ? Math.max(...spans) : null,
      description:
        whiskers.length > 0
          ? `Event timing bracketed for ${whiskers.length} detected rise/set event(s) inside the window. ` +
            'Event-time uncertainty is not solver tolerance and is not extrapolated to events outside the window.'
          : 'No rise/set event was detected inside the evaluation window, so no event-time bracket ' +
            'exists. Event-timing uncertainty is unavailable here rather than zero.',
    },
  };
}

function buildSensitivity(assessment: CandidateAssessment): DecisionTraceSensitivity {
  const binding = assessment.bindingConstraint;

  const decisiveThreshold = binding
    ? (() => {
        const bracket = assessment.brackets.find((entry) => entry.metricId === binding.metricId) ?? null;
        const observed = binding.observedValue ?? binding.thresholdValue;
        const worstCase = bracket
          ? binding.relation === 'at_least'
            ? bracket.pessimistic
            : bracket.optimistic
          : observed;
        const flipsToSatisfied = binding.verdict === 'violated';
        const direction: 'lower_the_limit' | 'raise_the_limit' =
          binding.relation === 'at_least'
            ? flipsToSatisfied
              ? 'lower_the_limit'
              : 'raise_the_limit'
            : flipsToSatisfied
              ? 'raise_the_limit'
              : 'lower_the_limit';
        const move = direction === 'lower_the_limit' ? 'lowering' : 'raising';
        const comparison = direction === 'lower_the_limit' ? '<=' : '>=';
        return {
          constraintName: binding.constraintName,
          currentLimit: binding.thresholdValue,
          unit: binding.unit,
          flipAtNominal: observed,
          flipAtWorstCase: worstCase,
          direction,
          narrative:
            `${move} the ${binding.constraintName} limit from ${formatQuantity(binding.thresholdValue, binding.unit)} to ` +
            `${comparison} ${formatQuantity(observed, binding.unit)} flips this candidate from ${assessment.outcome} ` +
            `to ${flipsToSatisfied ? 'feasible' : 'disqualified'} at the nominal value` +
            (bracket
              ? `; at the worst supported bound (${formatQuantity(worstCase, binding.unit)}) the flip needs ${comparison} ${formatQuantity(worstCase, binding.unit)}`
              : '') +
            '.',
        };
      })()
    : null;

  return {
    modelAssumption: {
      recomputed: true,
      knob: 'terrain horizon theta_low..theta_high sensitivity envelope',
      outcomeNominal: assessment.outcomeNominal,
      outcomePessimistic: assessment.outcomePessimistic,
      outcomeOptimistic: assessment.outcomeOptimistic,
      description:
        `Re-gating the same candidate against the published terrain bracket at nominal, pessimistic and ` +
        `optimistic horizon gives ${assessment.outcomeNominal} / ${assessment.outcomePessimistic} / ${assessment.outcomeOptimistic}. ` +
        (assessment.outcomeNominal === assessment.outcomePessimistic &&
        assessment.outcomeNominal === assessment.outcomeOptimistic
          ? 'The verdict is invariant across the whole bracket, so the terrain assumption does not decide it.'
          : 'The verdict changes inside the bracket, so the terrain assumption does decide it and no single outcome can be certified.'),
    },
    vehicleProfile: {
      recomputed: true,
      decisiveThreshold,
      description:
        'Re-gated in-memory against alternative vehicle limits: the decisive threshold below is the exact ' +
        'value at which this candidate changes bucket. No arbitrary multiplier or weighting is applied.',
    },
    epoch: {
      recomputed: false as const,
      knobs: ['startUtc', 'stopUtc', 'launchSlipOffsetDays'],
      description:
        'Not re-evaluated: an epoch change needs a fresh JPL Horizons topocentric query and a full ' +
        'event-splitting solver pass per candidate, which a comparison request does not perform. A ' +
        'launch slip moves the grazing Sun and libration geometry, so sunlight, shadow and Earth-contact ' +
        'durations must be re-derived for the new epoch before any verdict near a limit is trusted.',
    },
  };
}

function buildNarrative(assessment: CandidateAssessment, rank: number | null): string {
  const binding = assessment.bindingConstraint;
  const verdict = binding ? binding.marginNarrative : 'no configured constraint could be evaluated';
  const rankClause = rank === null ? 'not ranked' : `ranked #${rank}`;
  if (assessment.outcome === 'insufficient-evidence') {
    const gap = assessment.missingEvidence[0];
    const flips = assessment.constraints.find((constraint) => constraint.uncertaintyEffect === 'verdict_flips');
    const flipBracket = flips
      ? assessment.brackets.find((bracket) => bracket.metricId === flips.metricId) ?? null
      : null;
    const reason =
      flips && flipBracket
        ? `the ${flips.label} verdict is not stable across the terrain bracket ${formatQuantity(flipBracket.pessimistic, flips.unit)} - ${formatQuantity(flipBracket.optimistic, flips.unit)}`
        : flips
          ? `the ${flips.label} verdict is not stable across its terrain bracket`
          : (gap?.label ?? 'evidence is incomplete');
    return `${assessment.evaluation.siteInfo.siteName}: insufficient evidence (${reason}); ${verdict}.`;
  }
  return `${assessment.evaluation.siteInfo.siteName}: ${assessment.outcome} (${rankClause}) — ${verdict}.`;
}

export interface BuildDecisionTraceArgs {
  readonly assessments: readonly CandidateAssessment[];
  readonly constraints: VehicleConstraints;
  /** Tier-2 rank per site id; absent for candidates that were not ranked. */
  readonly ranks: ReadonlyMap<string, number>;
}

export function buildDecisionTrace(args: BuildDecisionTraceArgs): DecisionTrace {
  const candidates: DecisionTraceEntry[] = args.assessments.map((assessment) => {
    const siteId = assessment.evaluation.siteInfo.siteId;
    const rank = assessment.outcome === 'feasible' ? (args.ranks.get(siteId) ?? null) : null;
    const evidence = assessment.constraints.map((constraint) => buildEvidence(assessment, constraint));

    return {
      siteId,
      siteName: assessment.evaluation.siteInfo.siteName,
      entityType: assessment.evaluation.siteInfo.entityType,
      outcome: assessment.outcome,
      rank,
      bindingConstraint: assessment.bindingConstraint
        ? toPublishedConstraint(
            assessment.bindingConstraint,
            buildEvidence(assessment, assessment.bindingConstraint),
          )
        : null,
      constraints: assessment.constraints.map((constraint, index) =>
        toPublishedConstraint(constraint, evidence[index]!),
      ),
      evidence,
      uncertainty: buildUncertainty(assessment),
      unavailable: assessment.missingEvidence.map((gap) => ({
        capabilityId: gap.capabilityId,
        label: gap.label,
        appliesToConstraints: [...gap.appliesToConstraints],
        consequence: gap.consequence,
      })),
      sensitivity: buildSensitivity(assessment),
      narrative: buildNarrative(assessment, rank),
    };
  });

  return {
    traceVersion: DECISION_TRACE_VERSION,
    outcomeCounts: {
      feasible: candidates.filter((candidate) => candidate.outcome === 'feasible').length,
      disqualified: candidates.filter((candidate) => candidate.outcome === 'disqualified').length,
      insufficientEvidence: candidates.filter((candidate) => candidate.outcome === 'insufficient-evidence').length,
    },
    evaluatedConstraintLimits: {
      minContinuousSunlightHours: args.constraints.minContinuousSunlightHours,
      maxContinuousDarknessHours: args.constraints.maxContinuousDarknessHours,
      minDteHours: args.constraints.minDteHours,
      maxLandingSlopeDeg: args.constraints.maxLandingSlopeDeg,
    },
    rule: DECISION_TRACE_RULE,
    candidates,
  };
}
