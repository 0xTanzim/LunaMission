/**
 * Multi-Site Scenario Comparison Service
 * Milestone M5: Three-Tiered Filtering Pipeline
 * Governed by docs/phase-3/API_CONTRACT.md § 4, § 4.1 and INFORMATION_ARCHITECTURE.md § 5.
 * Strictly eliminates TOPSIS, WLC, and arbitrary composite scalar scores.
 */

import type {
  RankedFeasibleCandidate,
  ScenarioCompareRequest,
  ScenarioCompareResponse,
  SortMetricKey,
  VehicleConstraints,
} from '@luna/contracts';
import { scenarioCasCache } from './scenarioCasCache';
import {
  executeTier1Gating,
  type IntermediateFeasibleCandidate,
} from './scenarioCompareTier1';
import { selectPairwiseCandidates } from './scenarioComparePairwise';
import { buildTier3PairwiseDelta } from './scenarioCompareTier3';
import { buildDecisionTrace } from './decisionTrace';
import { computeParetoFrontier } from './scenarioPareto';
import { ScenarioError } from './scenarioErrors';
import { scenarioService } from './scenarioService';

export class ScenarioCompareService {
  async compareScenarios(
    request: ScenarioCompareRequest,
    instanceUrl = '/api/v1/scenarios/compare',
  ): Promise<ScenarioCompareResponse> {
    if (!request.siteIds || request.siteIds.length < 2) {
      throw new ScenarioError({
        code: 'E_INSUFFICIENT_SITES',
        title: 'Insufficient Comparison Cohort',
        status: 400,
        detail: 'At least 2 candidate landing sites are required for comparison.',
        remediation: 'Provide between 2 and 20 site IDs in the siteIds array.',
      });
    }

    if (request.siteIds.length > 20) {
      throw new ScenarioError({
        code: 'E_TOO_MANY_SITES',
        title: 'Comparison Cohort Exceeds Maximum',
        status: 400,
        detail: 'A maximum of 20 candidate landing sites may be compared simultaneously.',
        remediation: 'Limit comparison cohort to 20 candidate sites per request.',
      });
    }

    const calculationId = scenarioCasCache.computeScenarioCompareHash(request);
    const cached = await scenarioCasCache.getScenarioComparison(calculationId);
    // A comparison cached before the C13 trace existed has no explanation to publish, and an
    // unexplained verdict is exactly what this feature removes. Recompute instead of serving it.
    if (cached && cached.data.decisionTrace) {
      return {
        ...cached.data,
        provenance: {
          ...cached.data.provenance,
          casCacheHit: true,
        },
      };
    }

    // 1. Concurrently evaluate each candidate site
    const evaluations = await Promise.all(
      request.siteIds.map((siteId) =>
        scenarioService.evaluateScenario({
          siteId,
          startUtc: request.startUtc,
          stopUtc: request.stopUtc,
          observerMastHeightM: request.observerMastHeightM,
          sunVisibilityCriterion: request.sunVisibilityCriterion,
          earthVisibilityCriterion: request.earthVisibilityCriterion,
          launchSlipOffsetDays: request.launchSlipOffsetDays,
          sampleIntervalSec: 600,
        }),
      ),
    );

    const constraints: VehicleConstraints = request.vehicleConstraints ?? {
      minContinuousSunlightHours: 120.0,
      maxContinuousDarknessHours: 16.0,
      minDteHours: 80.0,
      maxLandingSlopeDeg: 10.0,
    };

    // 2. Tier 1: Hard Go/No-Go Vehicle Feasibility Gating
    const { disqualifiedCandidates, feasibleList, insufficientEvidenceCandidates, assessments } =
      executeTier1Gating(evaluations, constraints);

    // 3. Tier 2: Lexicographic Priority Ordering
    const rankingPrefs = request.rankingPreferences ?? {
      primarySortMetric: 'longestContinuousSunlight',
      secondarySortMetric: 'maxContinuousDarkness',
      tertiarySortMetric: 'cumulativeOverlapHours',
      tieToleranceHours: 2.0,
    };
    const hierarchy: SortMetricKey[] = [
      rankingPrefs.primarySortMetric,
      rankingPrefs.secondarySortMetric,
      rankingPrefs.tertiarySortMetric,
    ];

    const getMetricVal = (item: IntermediateFeasibleCandidate, key: SortMetricKey): number => {
      switch (key) {
        case 'longestContinuousSunlight': return item.evaluation.metrics.longestContinuousSunlitWindowHours;
        case 'maxContinuousDarkness': return item.evaluation.metrics.longestContinuousDarkWindowHours;
        case 'cumulativeDteHours': return item.evaluation.metrics.cumulativeDteHours;
        case 'cumulativeOverlapHours': return item.evaluation.metrics.cumulativeOverlapHours;
        case 'cumulativeSunlight': return item.evaluation.metrics.cumulativeSunlitHours;
        case 'maxLandingSlope': return item.slopeDeg;
        case 'terrainUncertaintySpan': return item.uncertaintySpanHours;
      }
    };

    const isLowerBetter = (key: SortMetricKey): boolean =>
      key === 'maxContinuousDarkness' || key === 'maxLandingSlope' || key === 'terrainUncertaintySpan';

    feasibleList.sort((a, b) => {
      for (const m of hierarchy) {
        const vA = getMetricVal(a, m);
        const vB = getMetricVal(b, m);
        const diff = isLowerBetter(m) ? vB - vA : vA - vB;
        if (Math.abs(vA - vB) > rankingPrefs.tieToleranceHours) {
          return diff > 0 ? -1 : 1;
        }
      }
      return 0;
    });

    const rankedCandidates: RankedFeasibleCandidate[] = feasibleList.map((item, idx) => ({
      rank: idx + 1,
      siteId: item.evaluation.siteInfo.siteId,
      siteName: item.evaluation.siteInfo.siteName,
      entityType: item.evaluation.siteInfo.entityType,
      coordinates: item.evaluation.siteInfo.coordinates,
      metrics: {
        longestContinuousSunlightHours: item.evaluation.metrics.longestContinuousSunlitWindowHours,
        maxContinuousDarknessHours: item.evaluation.metrics.longestContinuousDarkWindowHours,
        cumulativeSunlitHours: item.evaluation.metrics.cumulativeSunlitHours,
        solarAccessPercentage: item.evaluation.metrics.solarAccessPercentage,
        cumulativeDteHours: item.evaluation.metrics.cumulativeDteHours,
        dteAccessPercentage: item.evaluation.metrics.dteAccessPercentage,
        cumulativeOverlapHours: item.evaluation.metrics.cumulativeOverlapHours,
        landingSlopeDeg: item.slopeDeg,
        terrainUncertaintySpanHours: item.uncertaintySpanHours,
      },
      sortKeyTrace: hierarchy.map((m) => ({
        metric: m,
        value: Number(getMetricVal(item, m).toFixed(2)),
        tieBroken: false,
      })),
    }));

    // 4. Plan.md § 6.5 non-dominated frontier. Deliberately computed from `rankedCandidates`
    // (the published projection) rather than from the raw evaluations, so the frontier is
    // provably a ranking of exactly the numbers a client can read back out of this response.
    const paretoResult = computeParetoFrontier(rankedCandidates);
    const paretoRankedCandidates: RankedFeasibleCandidate[] = rankedCandidates.map((candidate, index) => {
      const assignment = paretoResult.assignments[index];
      if (!assignment) {
        throw new Error(`Pareto assignment missing for site "${candidate.siteId}".`);
      }
      return { ...candidate, pareto: { rank: assignment.rank, dominatedBy: [...assignment.dominatedBy] } };
    });

    // 5. Tier 3: Focused Pairwise Delta Matrix
    const { candidateA, candidateB } = selectPairwiseCandidates(paretoRankedCandidates, request.pairwiseSelection);
    const tier3Pairwise =
      candidateA && candidateB ? buildTier3PairwiseDelta(candidateA, candidateB) : null;

    // 6. C13 evidence & decision trace: one explained verdict per evaluated candidate, ranked
    // candidates carrying their Tier-2 rank and everything else published as unranked.
    const decisionTrace = buildDecisionTrace({
      assessments,
      constraints,
      ranks: new Map(paretoRankedCandidates.map((candidate) => [candidate.siteId, candidate.rank])),
    });

    const totalEvalHours = (new Date(request.stopUtc).getTime() - new Date(request.startUtc).getTime()) / 3600000.0;

    const response: ScenarioCompareResponse = {
      calculationId,
      status: 'valid',
      scenarioConfig: {
        startUtc: request.startUtc,
        stopUtc: request.stopUtc,
        totalEvaluationHours: Number(totalEvalHours.toFixed(2)),
        launchSlipOffsetDays: request.launchSlipOffsetDays ?? 0.0,
        observerMastHeightM: request.observerMastHeightM ?? 2.0,
        sunVisibilityCriterion: request.sunVisibilityCriterion ?? 'upperLimb',
        earthVisibilityCriterion: request.earthVisibilityCriterion ?? 'center',
      },
      tier1Gating: {
        totalEvaluatedSites: evaluations.length,
        feasibleSitesCount: feasibleList.length,
        disqualifiedSitesCount: disqualifiedCandidates.length,
        feasibleSiteIds: feasibleList.map((f) => f.evaluation.siteInfo.siteId),
        disqualifiedCandidates,
        insufficientEvidenceCandidates,
        insufficientEvidenceSitesCount: insufficientEvidenceCandidates.length,
      },
      tier2Ranking: {
        priorityHierarchy: hierarchy,
        paretoFrontier: paretoResult.frontier,
        rankedCandidates: paretoRankedCandidates,
      },
      tier3Pairwise,
      decisionTrace,
      provenance: {
        calculationId,
        engineVersion: 'LunaMission-Engine-2.0.0',
        timestampUtc: new Date().toISOString(),
        ephemerisSource: 'NASA_JPL_HORIZONS_API_COORD_301',
        ephemerisDataset: 'DE421/DE440',
        timeScaleOffsetTtMinusUtcSec: 69.184,
        terrainModelSource: 'NASA_LOLA_PDS_LDEM_85S_20M',
        terrainSpatialResolutionM: 20.0,
        horizonProfileAzimuthBins: 360,
        solverAlgorithm: 'ROLLE_HERMITE_BRENT_EVENT_SPLITTER',
        rootBracketToleranceSec: 1.0,
        tangentialGrazeToleranceDeg: 1e-7,
        casCacheHit: false,
      },
    };

    await scenarioCasCache.saveScenarioComparison(calculationId, response);
    return response;
  }
}

export const scenarioCompareService = new ScenarioCompareService();
