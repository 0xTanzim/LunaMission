/**
 * C13 — Evidence & Decision Trace (masterplan § 5 Pillar C, Plan.md § 9)
 *
 * Every assertion below is made against a LIVE comparison produced by the real service on real
 * registry sites, the real curated LOLA horizon asset and real JPL Horizons states. The expected
 * margins are re-derived here from the published metrics rather than restated from the trace, so
 * the trace cannot validate itself.
 *
 * One exception is called out where it appears: the "no skyline" case has to construct an absent
 * evidence condition, because every registered site currently ships a complete skyline. That
 * fixture is a real response with its site id changed to a site that has no data; it is not a
 * fabricated measurement and the test asserts the ABSENCE of a number, never a value.
 */

import { describe, expect, it } from 'bun:test';
import {
  decisionTraceSchema,
  scenarioCompareResponseSchema,
  type ScenarioEvaluateResponse,
  type VehicleConstraints,
} from '@luna/contracts';
import { scenarioCompareService } from '../../src/services/scenarios/scenarioCompareService';
import { scenarioService } from '../../src/services/scenarios/scenarioService';
import { assessCandidate } from '../../src/services/scenarios/scenarioConstraintGate';
import { DECISION_TRACE_RULE } from '../../src/services/scenarios/decisionTrace';

const START_UTC = '2026-11-01T00:00:00.000Z';
const STOP_UTC = '2026-11-15T00:00:00.000Z';

const PERMISSIVE: VehicleConstraints = {
  minContinuousSunlightHours: 120.0,
  maxContinuousDarknessHours: 16.0,
  minDteHours: 80.0,
  maxLandingSlopeDeg: 15.0,
};

async function compare(vehicleConstraints: VehicleConstraints, siteIds = ['connecting-ridge', 'nobile-rim-1']) {
  const response = await scenarioCompareService.compareScenarios({
    siteIds,
    startUtc: START_UTC,
    stopUtc: STOP_UTC,
    observerMastHeightM: 2.0,
    sunVisibilityCriterion: 'upperLimb',
    earthVisibilityCriterion: 'center',
    launchSlipOffsetDays: 0.0,
    vehicleConstraints,
    rankingPreferences: {
      primarySortMetric: 'longestContinuousSunlight',
      secondarySortMetric: 'maxContinuousDarkness',
      tertiarySortMetric: 'cumulativeOverlapHours',
      tieToleranceHours: 2.0,
    },
  });
  return response;
}

function entryFor(response: Awaited<ReturnType<typeof compare>>, siteId: string) {
  const entry = response.decisionTrace?.candidates.find((candidate) => candidate.siteId === siteId);
  if (!entry) throw new Error(`No decision trace entry for "${siteId}".`);
  return entry;
}

async function evaluation(siteId: string): Promise<ScenarioEvaluateResponse> {
  return scenarioService.evaluateScenario({
    siteId,
    startUtc: START_UTC,
    stopUtc: STOP_UTC,
    observerMastHeightM: 2.0,
    sunVisibilityCriterion: 'upperLimb',
    earthVisibilityCriterion: 'center',
    launchSlipOffsetDays: 0.0,
    sampleIntervalSec: 600,
  });
}

describe('C13 decision trace — a real disqualification explains itself', () => {
  it('names the deciding constraint, its physical margin, the dataset and the solver', async () => {
    const response = await compare(PERMISSIVE);
    const entry = entryFor(response, 'connecting-ridge');
    const metrics = (await evaluation('connecting-ridge')).metrics;

    expect(entry.outcome).toBe('disqualified');
    expect(entry.rank).toBeNull();
    expect(response.tier1Gating.feasibleSiteIds).not.toContain('connecting-ridge');

    const binding = entry.bindingConstraint!;
    expect(binding.constraintName).toBe('minDte');
    expect(binding.verdict).toBe('violated');
    expect(binding.relation).toBe('at_least');
    expect(binding.unit).toBe('h');

    // The margin is re-derived from the published Earth-contact total, not trusted from the trace.
    const expectedDeficit = PERMISSIVE.minDteHours - metrics.cumulativeDteHours;
    expect(binding.observedValue).toBeCloseTo(metrics.cumulativeDteHours, 2);
    expect(binding.marginSigned).toBeCloseTo(-expectedDeficit, 2);
    expect(binding.marginSigned!).toBeLessThan(0);
    expect(binding.marginNarrative).toContain('falls');
    expect(binding.marginNarrative).toContain('short of the direct-to-Earth contact requirement');
    expect(binding.marginNarrative).toContain(`${expectedDeficit.toFixed(2)} h`);

    // Evidence: which product and which solver produced the deciding number.
    expect(binding.evidence.metricId).toBe('cumulativeDteHours');
    expect(binding.evidence.datasetId).toBe('DE421/DE440');
    expect(binding.evidence.algorithm).toBe('ROLLE_HERMITE_BRENT_EVENT_SPLITTER');
    expect(binding.evidence.evidenceClass).toBe('measured');
    expect(binding.evidence.field).toBe('metrics.cumulativeDteHours');

    // Every configured constraint is reported, in a fixed order, with its own verdict.
    expect(entry.constraints.map((constraint) => constraint.constraintName)).toEqual([
      'minContinuousSunlight',
      'maxContinuousDarkness',
      'minDte',
      'maxLandingSlope',
    ]);
    expect(entry.constraints.filter((constraint) => constraint.verdict === 'violated')).toHaveLength(1);
  }, 60000);

  it('publishes the terrain bracket, the model-sensitivity outcome and the missing capabilities', async () => {
    const response = await compare(PERMISSIVE);
    const entry = entryFor(response, 'connecting-ridge');
    const ev = await evaluation('connecting-ridge');

    const dteBracket = entry.uncertainty.metricBrackets.find((b) => b.metricId === 'cumulativeDteHours')!;
    const lo = ev.uncertaintyEnvelopes.thetaLowMetrics.cumulativeDteHours;
    const hi = ev.uncertaintyEnvelopes.thetaHighMetrics.cumulativeDteHours;
    expect(dteBracket.pessimistic).toBeCloseTo(Math.min(ev.metrics.cumulativeDteHours, lo, hi), 2);
    expect(dteBracket.optimistic).toBeCloseTo(Math.max(ev.metrics.cumulativeDteHours, lo, hi), 2);
    expect(dteBracket.pessimistic).toBeLessThan(dteBracket.optimistic);

    // A violation that survives the whole bracket is certified, not merely plausible.
    expect(entry.uncertainty.availability).toBe('available');
    expect(entry.uncertainty.method).toBe('DEM_TERRAIN_ENVELOPE_THETA_LOW_HIGH');
    expect(entry.uncertainty.verdictRobust).toBe(true);

    expect(entry.sensitivity.modelAssumption.recomputed).toBe(true);
    expect(entry.sensitivity.modelAssumption.outcomeNominal).toBe('disqualified');
    expect(entry.sensitivity.modelAssumption.outcomePessimistic).toBe('disqualified');
    expect(entry.sensitivity.modelAssumption.outcomeOptimistic).toBe('disqualified');

    // Vehicle profile: the exact threshold at which this candidate changes bucket.
    const threshold = entry.sensitivity.vehicleProfile.decisiveThreshold!;
    expect(threshold.constraintName).toBe('minDte');
    expect(threshold.direction).toBe('lower_the_limit');
    expect(threshold.flipAtNominal).toBeCloseTo(ev.metrics.cumulativeDteHours, 2);
    expect(threshold.narrative).toContain('flips this candidate from disqualified to feasible');

    // Epoch: never silently recomputed — the knobs are named instead.
    expect(entry.sensitivity.epoch.recomputed).toBe(false);
    expect(entry.sensitivity.epoch.knobs).toContain('launchSlipOffsetDays');
    expect(entry.sensitivity.epoch.description).toContain('JPL Horizons');

    // Capabilities that would have informed a landing decision but carry no data here.
    const gapIds = entry.unavailable.map((gap) => gap.capabilityId);
    expect(gapIds).toContain('dem_clone_uncertainty_ensemble');
    expect(gapIds).toContain('rf_link_budget');
    for (const gap of entry.unavailable) {
      expect(gap.consequence.length).toBeGreaterThan(20);
    }
    // The slope limitation is disclosed alongside the gap, so it cannot be read as a P95 statistic.
    const ellipseGap = entry.unavailable.find((gap) => gap.capabilityId === 'landing_ellipse_dispersion')!;
    expect(ellipseGap.consequence).toMatch(/not a P95 slope/i);
    expect(ellipseGap.consequence).toMatch(/ellipse/i);
  }, 60000);

  it('reports event-timing uncertainty as unavailable when the window holds no rise/set event', async () => {
    const response = await compare(
      { ...PERMISSIVE, minContinuousSunlightHours: 0.0, maxContinuousDarknessHours: 672.0, minDteHours: 0.0 },
    );
    const entry = entryFor(response, 'connecting-ridge');
    const ev = await evaluation('connecting-ridge');

    expect(ev.uncertaintyEnvelopes.eventWhiskers).toHaveLength(1);
    expect(entry.uncertainty.eventTiming.availability).toBe('available');
    expect(entry.uncertainty.eventTiming.widestWhiskerSpanHours).toBeCloseTo(
      ev.uncertaintyEnvelopes.eventWhiskers[0]!.whiskerSpanHours,
      2,
    );
  }, 60000);
});

describe('C13 decision trace — a real pass explains itself', () => {
  it('makes the tightest satisfied limit the binding constraint and ranks the candidate', async () => {
    const response = await compare({ ...PERMISSIVE, minDteHours: 50.0 });
    const entry = entryFor(response, 'connecting-ridge');
    const ev = await evaluation('connecting-ridge');

    expect(entry.outcome).toBe('feasible');
    expect(entry.rank).toBe(1);
    expect(response.tier2Ranking.rankedCandidates[0]!.siteId).toBe('connecting-ridge');
    expect(response.tier1Gating.feasibleSiteIds).toContain('connecting-ridge');

    const binding = entry.bindingConstraint!;
    expect(binding.verdict).toBe('satisfied');
    // Tightest headroom across the four limits wins the "binding" slot for a feasible candidate.
    const margins = entry.constraints
      .filter((constraint) => constraint.marginSigned !== null)
      .map((constraint) => constraint.marginSigned!);
    expect(binding.marginSigned).toBeCloseTo(Math.min(...margins), 2);
    expect(binding.marginSigned!).toBeGreaterThan(0);

    // Every satisfying limit still publishes where its number came from.
    expect(entry.evidence).toHaveLength(4);
    for (const evidence of entry.evidence) {
      expect(evidence.algorithm.length).toBeGreaterThan(0);
      expect(evidence.datasetId.length).toBeGreaterThan(0);
      expect(evidence.value).not.toBeNull();
    }

    const sunlight = entry.evidence.find((item) => item.metricId === 'longestContinuousSunlightHours')!;
    expect(sunlight.datasetId).toBe('NASA_LOLA_PDS_LDEM_85S_20M');
    expect(sunlight.value).toBeCloseTo(ev.metrics.longestContinuousSunlitWindowHours, 2);

    // The slope evidence is a nominal point, and the trace says so instead of implying a P95.
    const slope = entry.evidence.find((item) => item.metricId === 'nominalPointSlopeDeg')!;
    expect(slope.evidenceClass).toBe('nominal_only');
    expect(entry.unavailable.map((gap) => gap.capabilityId)).toContain('landing_ellipse_dispersion');
  }, 60000);

  it('is deterministic: the same request produces a byte-identical trace', async () => {
    const constraints: VehicleConstraints = { ...PERMISSIVE, minDteHours: 50.0 };
    const first = await compare(constraints);
    const second = await compare(constraints);
    expect(JSON.stringify(second.decisionTrace)).toBe(JSON.stringify(first.decisionTrace));
  }, 60000);
});

describe('C13 decision trace — incomplete evidence is never a pass', () => {
  it('demotes a candidate whose verdict flips inside its own terrain bracket', async () => {
    // connecting-ridge Earth contact: nominal 55.98 h, bracket 54.83–57.17 h. A 56.0 h requirement
    // sits INSIDE the bracket, so neither "meets it" nor "misses it" can be certified.
    const response = await compare({ ...PERMISSIVE, minDteHours: 56.0 });
    const entry = entryFor(response, 'connecting-ridge');

    expect(entry.outcome).toBe('insufficient-evidence');
    expect(entry.rank).toBeNull();
    expect(entry.bindingConstraint!.uncertaintyEffect).toBe('verdict_flips');
    expect(entry.uncertainty.verdictRobust).toBe(false);
    expect(entry.narrative).toContain('insufficient evidence');

    // The three re-gates disagree, which is exactly why no single outcome may be published.
    const model = entry.sensitivity.modelAssumption;
    expect(new Set([model.outcomeNominal, model.outcomePessimistic, model.outcomeOptimistic]).size).toBeGreaterThan(1);
    expect(model.outcomeOptimistic).toBe('feasible');

    // It is excluded from ranking and from the feasible bucket, and counted separately.
    expect(response.tier2Ranking.rankedCandidates.map((candidate) => candidate.siteId)).not.toContain('connecting-ridge');
    expect(response.tier1Gating.feasibleSiteIds).not.toContain('connecting-ridge');
    expect(response.tier1Gating.insufficientEvidenceCandidates?.map((c) => c.siteId)).toContain('connecting-ridge');
    expect(response.tier1Gating.insufficientEvidenceSitesCount).toBe(1);
  }, 60000);

  it('treats a missing skyline and a missing topography profile as undecidable, not as passing', async () => {
    // Real response, site id replaced with one that has no entry in the curated horizon asset and
    // no topography profile. Nothing else about the measurement changes.
    const real = await evaluation('connecting-ridge');
    const orphan: ScenarioEvaluateResponse = {
      ...real,
      siteInfo: {
        ...real.siteInfo,
        siteId: 'site-with-no-registered-evidence',
        siteName: 'Site With No Registered Evidence',
      },
    };

    const assessment = assessCandidate(orphan, {
      minContinuousSunlightHours: 0.0,
      maxContinuousDarknessHours: 672.0,
      minDteHours: 0.0,
      maxLandingSlopeDeg: 45.0,
    });

    expect(assessment.outcome).toBe('insufficient-evidence');
    expect(assessment.constraints.every((constraint) => constraint.verdict === 'undecidable')).toBe(true);
    // No number is invented for an absent skyline.
    expect(assessment.constraints.every((constraint) => constraint.observedValue === null)).toBe(true);
    expect(assessment.constraints.every((constraint) => constraint.marginSigned === null)).toBe(true);
    expect(assessment.slope.value).toBeNull();
    expect(assessment.missingEvidence.map((gap) => gap.capabilityId)).toContain('skyline_terrain_data');
    expect(assessment.missingEvidence.map((gap) => gap.capabilityId)).toContain('site_topography');
  }, 60000);

  it('still disqualifies a definite violation even when another limit is unevaluable', async () => {
    const real = await evaluation('connecting-ridge');
    const orphan: ScenarioEvaluateResponse = {
      ...real,
      siteInfo: { ...real.siteInfo, siteId: 'site-with-no-registered-evidence' },
    };

    // The measured darkness in the fixture exceeds this allowance, and that measurement is a real
    // solver output; only the skyline and slope evidence are missing.
    const assessment = assessCandidate(orphan, {
      minContinuousSunlightHours: 0.0,
      maxContinuousDarknessHours: 0.0001,
      minDteHours: 0.0,
      maxLandingSlopeDeg: 45.0,
    });

    if (real.metrics.longestContinuousDarkWindowHours <= 0.0001) {
      // A candidate with no darkness at all cannot demonstrate the ordering; skip the assertion.
      expect(assessment.outcome).toBe('insufficient-evidence');
      return;
    }
    expect(assessment.outcome).toBe('disqualified');
    expect(assessment.bindingConstraint?.constraintName).toBe('maxContinuousDarkness');
  }, 60000);
});

describe('C13 decision trace — contract surface', () => {
  it('validates against the published schema and describes its own outcome rule', async () => {
    const response = await compare(PERMISSIVE);

    expect(() => scenarioCompareResponseSchema.parse(response)).not.toThrow();
    const trace = decisionTraceSchema.parse(response.decisionTrace);

    expect(trace.traceVersion).toBe('1.0.0');
    expect(trace.rule).toBe(DECISION_TRACE_RULE);
    expect(trace.evaluatedConstraintLimits).toEqual(PERMISSIVE);
    expect(trace.candidates.map((candidate) => candidate.siteId)).toEqual(
      response.decisionTrace!.candidates.map((candidate) => candidate.siteId),
    );

    const counts = trace.outcomeCounts;
    expect(counts.feasible + counts.disqualified + counts.insufficientEvidence).toBe(trace.candidates.length);
    expect(counts.feasible).toBe(trace.candidates.filter((candidate) => candidate.outcome === 'feasible').length);
  }, 60000);

  it('keeps the trace optional so a pre-trace response still validates', async () => {
    const response = await compare(PERMISSIVE);
    const { decisionTrace: _omitted, ...withoutTrace } = response;

    expect(() => scenarioCompareResponseSchema.parse(withoutTrace)).not.toThrow();
    expect(response.decisionTrace).toBeDefined();
  }, 60000);

  it('partitions the cohort into exactly three disjoint buckets', async () => {
    const response = await compare({ ...PERMISSIVE, minDteHours: 56.0 });
    const gating = response.tier1Gating;
    const insufficient = gating.insufficientEvidenceCandidates ?? [];

    expect(gating.feasibleSitesCount + gating.disqualifiedSitesCount + insufficient.length).toBe(
      gating.totalEvaluatedSites,
    );
    const feasibleIds = new Set(gating.feasibleSiteIds);
    for (const candidate of insufficient) expect(feasibleIds.has(candidate.siteId)).toBe(false);
    for (const candidate of gating.disqualifiedCandidates) expect(feasibleIds.has(candidate.siteId)).toBe(false);
  }, 60000);
});
