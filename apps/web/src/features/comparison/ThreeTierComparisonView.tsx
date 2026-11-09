import React, { useState, useEffect } from 'react';
import { useScenarioComparison } from './hooks/useScenarioComparison';
import { useComparisonCohort } from './hooks/useComparisonCohort';
import { useScenarioState } from '../../app/state/useScenarioState';
import { ComparisonWorkspaceHero } from './components/ComparisonWorkspaceHero';
import { ComparisonFunnelStatus } from './components/ComparisonFunnelStatus';
import { ComparisonDecisionSummary } from './components/ComparisonDecisionSummary';
import { ComparisonEmptyState } from './components/ComparisonEmptyState';
import { Tier1VehicleGating } from './Tier1VehicleGating';
import { Tier2LexicographicSort } from './Tier2LexicographicSort';
import { Tier3PairwiseDeltaMatrix } from './Tier3PairwiseDeltaMatrix';
import { VehicleConstraintsBar, MISSION_PRESETS } from './VehicleConstraintsBar';
import { ComparisonCohortBar } from './ComparisonCohortBar';
import { DecisionTracePanel } from './components/DecisionTracePanel';
import { ParetoFrontierPanel } from './components/ParetoFrontierPanel';
import { availableCohortCandidates, isCohortTooSmall, MIN_COHORT_SITES } from './model/cohort';
import { ApiStateView } from '@/shared/ui/ApiStateView';
import type { VehicleConstraints } from '@luna/contracts';

export const ThreeTierComparisonView: React.FC = () => {
  const { state, setPrimarySite, setProjection } = useScenarioState();
  const primaryId = state.primarySiteId;
  const { cohortSiteIds, addSite, removeSite } = useComparisonCohort(primaryId);

  const [constraints, setConstraints] = useState<VehicleConstraints>(() => {
    const survey = MISSION_PRESETS.find((p) => p.id === 'survey');
    return survey ? survey.values : {
      minContinuousSunlightHours: 0.0,
      maxContinuousDarknessHours: 336.0,
      minDteHours: 0.0,
      maxLandingSlopeDeg: 45.0,
    };
  });

  const [pairwiseSelection, setPairwiseSelection] = useState<{ siteIdA?: string; siteIdB?: string }>({});
  const [showRadar, setShowRadar] = useState(false);

  const { data, error, isLoading, refetch } = useScenarioComparison(
    cohortSiteIds,
    constraints,
    pairwiseSelection.siteIdA && pairwiseSelection.siteIdB ? pairwiseSelection : undefined,
  );

  // Auto-pairwise selection: when exactly 2 feasible candidates pass Tier 1
  useEffect(() => {
    if (
      data?.tier2Ranking?.rankedCandidates &&
      data.tier2Ranking.rankedCandidates.length === 2 &&
      (!pairwiseSelection.siteIdA || !pairwiseSelection.siteIdB)
    ) {
      setPairwiseSelection({
        siteIdA: data.tier2Ranking.rankedCandidates[0].siteId,
        siteIdB: data.tier2Ranking.rankedCandidates[1].siteId,
      });
    }
  }, [data?.tier2Ranking?.rankedCandidates, pairwiseSelection]);

  const handleRelaxConstraints = () => {
    const survey = MISSION_PRESETS.find((p) => p.id === 'survey');
    if (survey) setConstraints(survey.values);
  };

  const cohortTooSmall = isCohortTooSmall(cohortSiteIds);
  const availableSites = availableCohortCandidates(cohortSiteIds);
  const showEmptyState = cohortTooSmall || (!isLoading && !error && !data);

  const rankedCandidates = data?.tier2Ranking.rankedCandidates ?? [];
  const selectedSiteAId = pairwiseSelection.siteIdA ?? data?.tier3Pairwise?.siteA.siteId;
  const selectedSiteBId = pairwiseSelection.siteIdB ?? data?.tier3Pairwise?.siteB.siteId;
  const candA = rankedCandidates.find((c) => c.siteId === selectedSiteAId);
  const candB = rankedCandidates.find((c) => c.siteId === selectedSiteBId);

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-8">
      {/* What is being compared, and under which filters */}
      <ComparisonWorkspaceHero comparisonData={data} />

      {/* The cohort manager stays mounted in every state: it is the way out of all of them. */}
      <ComparisonCohortBar
        cohortSiteIds={cohortSiteIds}
        activeSiteId={primaryId}
        availableSites={availableSites}
        disqualifiedCandidates={data?.tier1Gating?.disqualifiedCandidates}
        onAddSite={addSite}
        onRemoveSite={removeSite}
        onRelaxConstraints={handleRelaxConstraints}
        showAddControl={!showEmptyState}
      />

      <VehicleConstraintsBar
        constraints={constraints}
        onChange={setConstraints}
        cohortCount={cohortSiteIds.length}
      />

      {showEmptyState ? (
        <ComparisonEmptyState
          cohortSiteCount={cohortSiteIds.length}
          minimumCohortSize={MIN_COHORT_SITES}
          availableSites={availableSites}
          onAddSite={addSite}
          onRetry={refetch}
        />
      ) : isLoading && !data ? (
        <div data-testid="three-tier-comparison-loading" className="w-full">
          <ApiStateView
            status="loading"
            message="Evaluating Multi-Site Three-Tiered Filtering Pipeline against LOLA DEMs..."
          />
        </div>
      ) : error && !data ? (
        <div data-testid="three-tier-comparison-error" className="w-full">
          <ApiStateView
            status="failed"
            title={error.title || 'Trade Study Evaluation Failed'}
            message={`${error.detail || 'Unable to execute three-tier trade study.'} [Code: ${error.code || 'UNKNOWN'}]`}
            guidance={error.guidance}
            onRetry={error.isRetryable ? refetch : undefined}
          />
        </div>
      ) : data ? (
        <div data-testid="three-tier-comparison-view" className="flex flex-col gap-4 w-full min-w-0">
          {data.status && data.status !== 'valid' && (
            <div data-testid="three-tier-advisory-banner" className="w-full">
              <ApiStateView
                status={data.status as any}
                title={
                  data.status === 'valid-with-limitations'
                    ? 'Comparison Valid With Limitations'
                    : 'Approximate Comparison'
                }
                message={`Multi-site trade study evaluated with status "${data.status}". Physical constraints or approximations apply.`}
                compact
              />
            </div>
          )}

          {/* The funnel's single status: outcome, tone and the next action, stated once. */}
          <ComparisonFunnelStatus
            totalEvaluatedSites={data.tier1Gating.totalEvaluatedSites}
            rankedCount={rankedCandidates.length}
            onRelaxConstraints={handleRelaxConstraints}
          />

          <Tier1VehicleGating
            totalEvaluatedSites={data.tier1Gating.totalEvaluatedSites}
            feasibleSitesCount={data.tier1Gating.feasibleSitesCount}
            disqualifiedSitesCount={data.tier1Gating.disqualifiedSitesCount}
            disqualifiedCandidates={data.tier1Gating.disqualifiedCandidates}
          />

          <ComparisonDecisionSummary
            rankedCandidates={rankedCandidates}
            onPromotePrimary={setPrimarySite}
            onRelaxConstraints={handleRelaxConstraints}
          />

          {/* The frontier before the lexicographic order: rank 1 is not the only survivor. */}
          <ParetoFrontierPanel
            frontier={data.tier2Ranking.paretoFrontier}
            rankedCandidates={rankedCandidates}
          />

          <Tier2LexicographicSort
            rankedCandidates={rankedCandidates}
            selectedSiteAId={selectedSiteAId}
            selectedSiteBId={selectedSiteBId}
            onSelectPairwise={(a, b) => setPairwiseSelection({ siteIdA: a, siteIdB: b })}
            onPromotePrimary={setPrimarySite}
            onInspectInAnalyze={(id) => {
              setPrimarySite(id);
              setProjection('analyze');
            }}
            showRadar={showRadar}
            onToggleRadar={() => setShowRadar((v) => !v)}
            totalEvaluationHours={data?.scenarioConfig?.totalEvaluationHours ?? 336}
          />

          <Tier3PairwiseDeltaMatrix
            pairwiseDelta={data.tier3Pairwise}
            coordinatesA={candA?.coordinates}
            coordinatesB={candB?.coordinates}
            onRelaxConstraints={handleRelaxConstraints}
          />

          <DecisionTracePanel trace={data?.decisionTrace} />
        </div>
      ) : null}
    </div>
  );
};
