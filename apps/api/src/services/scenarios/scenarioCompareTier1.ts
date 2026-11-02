/**
 * Tier 1 Hard Go/No-Go Vehicle Feasibility Gating Engine
 * Milestone M5: Three-Tiered Filtering Pipeline (Tier 1)
 * Governed by docs/phase-3/API_CONTRACT.md § 4.1 and INFORMATION_ARCHITECTURE.md § 5.1.
 *
 * C13 (masterplan § 5 Pillar C) adds a third bucket. A candidate whose evidence is incomplete —
 * no skyline, no topography profile, a non-authoritative ephemeris fallback, or a metric whose
 * verdict flips inside the terrain bracket — is `insufficient-evidence`: it leaves the ranking
 * entirely instead of being carried as a marginal pass. The bucket is separate from
 * `disqualifiedCandidates` because the two claim different things: "it does not meet the limits"
 * versus "we cannot tell".
 */

import type {
  DisqualifiedCandidate,
  RejectionReason,
  ScenarioEvaluateResponse,
  VehicleConstraints,
} from '@luna/contracts';
import { assessCandidate, type CandidateAssessment } from './scenarioConstraintGate';

export interface IntermediateFeasibleCandidate {
  evaluation: ScenarioEvaluateResponse;
  slopeDeg: number;
  uncertaintySpanHours: number;
}

export interface InsufficientEvidenceCandidateInternal {
  siteId: string;
  siteName: string;
  entityType: ScenarioEvaluateResponse['siteInfo']['entityType'];
  missingEvidenceIds: string[];
  narrative: string;
}

export interface Tier1GatingResult {
  disqualifiedCandidates: DisqualifiedCandidate[];
  feasibleList: IntermediateFeasibleCandidate[];
  /** Candidates excluded because their evidence is incomplete — never ranked, never counted feasible. */
  insufficientEvidenceCandidates: InsufficientEvidenceCandidateInternal[];
  /** One explained verdict per evaluated candidate, in cohort order. Feeds the decision trace. */
  assessments: CandidateAssessment[];
}

function toRejectionReason(assessment: CandidateAssessment, index: number): RejectionReason {
  const constraint = assessment.constraints[index]!;
  return {
    constraintName: constraint.constraintName,
    thresholdValue: constraint.thresholdValue,
    observedValue: constraint.observedValue ?? 0,
    unit: constraint.unit,
    // Published as a magnitude: the sign convention stays in the decision trace's `marginSigned`.
    marginOfFailure: Number(Math.abs(constraint.marginSigned ?? 0).toFixed(2)),
    narrative: constraint.marginNarrative,
  };
}

/**
 * Hard feasibility gating.
 *
 * Ordering of the verdict hierarchy is deliberate: a robustly violated limit disqualifies a
 * candidate even when some other limit is unevaluable, because missing evidence can only ever
 * downgrade a pass to "unknown" — it can never rescue a definite failure.
 */
export function executeTier1Gating(
  evaluations: ScenarioEvaluateResponse[],
  constraints: VehicleConstraints,
): Tier1GatingResult {
  const disqualifiedCandidates: DisqualifiedCandidate[] = [];
  const feasibleList: IntermediateFeasibleCandidate[] = [];
  const insufficientEvidenceCandidates: InsufficientEvidenceCandidateInternal[] = [];
  const assessments: CandidateAssessment[] = [];

  for (const evaluation of evaluations) {
    const assessment = assessCandidate(evaluation, constraints);
    assessments.push(assessment);

    if (assessment.outcome === 'disqualified') {
      const violatedIndexes = assessment.constraints
        .map((constraint, index) => ({ constraint, index }))
        .filter((entry) => entry.constraint.verdict === 'violated')
        .map((entry) => entry.index);
      disqualifiedCandidates.push({
        siteId: evaluation.siteInfo.siteId,
        siteName: evaluation.siteInfo.siteName,
        entityType: evaluation.siteInfo.entityType,
        rejectionReasons: violatedIndexes.map((index) => toRejectionReason(assessment, index)),
      });
      continue;
    }

    if (assessment.outcome === 'insufficient-evidence') {
      insufficientEvidenceCandidates.push({
        siteId: evaluation.siteInfo.siteId,
        siteName: evaluation.siteInfo.siteName,
        entityType: evaluation.siteInfo.entityType,
        missingEvidenceIds: assessment.missingEvidence.map((gap) => gap.capabilityId),
        narrative:
          assessment.bindingConstraint?.marginNarrative ??
          'Evidence for at least one configured constraint is incomplete.',
      });
      continue;
    }

    const slopeDeg = assessment.slope.value;
    if (slopeDeg === null) {
      // Unreachable by construction: a feasible outcome requires an evaluable slope limit.
      throw new Error(`Site "${evaluation.siteInfo.siteId}" is feasible without slope evidence.`);
    }

    feasibleList.push({
      evaluation,
      slopeDeg,
      // Legacy ranking metric only (never a verdict input): the decision trace reports event-timing
      // uncertainty as `unavailable` when no rise/set event was detected in the window.
      uncertaintySpanHours: evaluation.uncertaintyEnvelopes.eventWhiskers[0]?.whiskerSpanHours ?? 3.0,
    });
  }

  return { disqualifiedCandidates, feasibleList, insufficientEvidenceCandidates, assessments };
}
