import { useEffect, useState } from 'react';
import type { ScenarioCompareResponse, VehicleConstraints } from '@luna/contracts';
import { apiClient } from '../../../shared/api/apiClient';
import { classifyApiError, type ClassifiedApiError } from '../../../shared/api/errorClassifier';
import { useScenarioState } from '../../../app/state/useScenarioState';
import {
  buildComparisonRequest,
  getComparisonCacheKey,
  toComparisonPayload,
  type ComparisonScenarioInputs,
} from '../model/comparisonRequest';

const COMPARISON_CACHE = new Map<string, ScenarioCompareResponse>();

export interface UseScenarioComparisonResult {
  data: ScenarioCompareResponse | null;
  error: ClassifiedApiError | null;
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Three-tier comparison fetch for a candidate cohort.
 *
 * Results are memoized per cache identity so switching between pairwise selections
 * inside the same cohort does not recompute identical evaluations.
 */
export function useScenarioComparison(
  cohortSiteIds: string[],
  constraints?: VehicleConstraints,
  pairwiseSelection?: { siteIdA?: string; siteIdB?: string },
): UseScenarioComparisonResult {
  const { state, setCalculationStatus } = useScenarioState();

  const inputs: ComparisonScenarioInputs = {
    startUtc: state.missionEpoch.startUtc,
    stopUtc: state.missionEpoch.stopUtc,
    observerMastHeightM: state.observerMastHeightM,
    sunVisibilityCriterion: state.sunVisibilityCriterion,
    earthVisibilityCriterion: state.earthVisibilityCriterion,
    launchSlipOffsetDays: state.launchSlipOffsetDays,
  };
  const request = buildComparisonRequest(inputs, cohortSiteIds, constraints, pairwiseSelection);
  const cacheKey = getComparisonCacheKey(request);

  const [data, setData] = useState<ScenarioCompareResponse | null>(() => COMPARISON_CACHE.get(cacheKey) ?? null);
  const [error, setError] = useState<ClassifiedApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(
    () => cohortSiteIds.length >= 2 && !COMPARISON_CACHE.has(cacheKey),
  );
  const [refetchCounter, setRefetchCounter] = useState(0);

  useEffect(() => {
    if (cohortSiteIds.length < 2) {
      setData(null);
      setIsLoading(false);
      return;
    }

    let isCancelled = false;
    const cached = COMPARISON_CACHE.get(cacheKey);
    if (cached && refetchCounter === 0) {
      setData(cached);
      setIsLoading(false);
      setCalculationStatus(cached.status, cached.calculationId);
      return;
    }

    setIsLoading(!cached);
    setError(null);
    setCalculationStatus('loading');

    void (async () => {
      try {
        const response = await apiClient.compareScenarios(toComparisonPayload(request));
        if (isCancelled) return;
        COMPARISON_CACHE.set(cacheKey, response);
        setData(response);
        setIsLoading(false);
        setCalculationStatus(response.status, response.calculationId);
      } catch (err) {
        if (isCancelled) return;
        setError(classifyApiError(err));
        setIsLoading(false);
        setCalculationStatus('failed');
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [
    cohortSiteIds,
    constraints,
    pairwiseSelection?.siteIdA,
    pairwiseSelection?.siteIdB,
    state.missionEpoch.startUtc,
    state.missionEpoch.stopUtc,
    state.observerMastHeightM,
    state.sunVisibilityCriterion,
    state.earthVisibilityCriterion,
    state.launchSlipOffsetDays,
    refetchCounter,
    setCalculationStatus,
    cacheKey,
  ]);

  return { data, error, isLoading, refetch: () => setRefetchCounter((c) => c + 1) };
}
