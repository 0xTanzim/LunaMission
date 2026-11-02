import { useEffect, useState, useRef, useCallback } from 'react';
import type { ScenarioEvaluateResponse } from '@luna/contracts';
import { apiClient } from '../../../shared/api/apiClient';
import { classifyApiError, type ClassifiedApiError } from '../../../shared/api/errorClassifier';
import { useScenarioState } from '../../../app/state/useScenarioState';
import { EVALUATION_CACHE, getScenarioEvaluationCacheKey } from './scenarioEvaluationCache';

export function useScenarioEvaluation() {
  const { state, setCalculationStatus } = useScenarioState();
  const [data, setData] = useState<ScenarioEvaluateResponse | null>(() => {
    const key = getScenarioEvaluationCacheKey({
      siteId: state.primarySiteId,
      startUtc: state.missionEpoch.startUtc,
      stopUtc: state.missionEpoch.stopUtc,
      observerMastHeightM: state.observerMastHeightM,
      sunVisibilityCriterion: state.sunVisibilityCriterion,
      earthVisibilityCriterion: state.earthVisibilityCriterion,
      launchSlipOffsetDays: state.launchSlipOffsetDays,
    });
    return EVALUATION_CACHE.get(key) ?? null;
  });
  const [error, setError] = useState<ClassifiedApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const refetch = useCallback(() => setRetryCount((c) => c + 1), []);

  useEffect(() => {
    let isCancelled = false;
    const cacheKey = getScenarioEvaluationCacheKey({
      siteId: state.primarySiteId,
      startUtc: state.missionEpoch.startUtc,
      stopUtc: state.missionEpoch.stopUtc,
      observerMastHeightM: state.observerMastHeightM,
      sunVisibilityCriterion: state.sunVisibilityCriterion,
      earthVisibilityCriterion: state.earthVisibilityCriterion,
      launchSlipOffsetDays: state.launchSlipOffsetDays,
    });

    const cached = EVALUATION_CACHE.get(cacheKey);
    if (cached && retryCount === 0) {
      setData(cached);
      setCalculationStatus(cached.status, cached.calculationId);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setCalculationStatus('loading');

    const fetchEvaluation = async () => {
      try {
        const payload = {
          siteId: state.primarySiteId,
          startUtc: state.missionEpoch.startUtc,
          stopUtc: state.missionEpoch.stopUtc,
          observerMastHeightM: state.observerMastHeightM,
          sunVisibilityCriterion: state.sunVisibilityCriterion,
          earthVisibilityCriterion: state.earthVisibilityCriterion,
          launchSlipOffsetDays: state.launchSlipOffsetDays,
          sampleIntervalSec: 600,
        };
        const response = await apiClient.evaluateScenario(payload);

        if (!isCancelled) {
          EVALUATION_CACHE.set(cacheKey, response);
          setData(response);
          setCalculationStatus(response.status, response.calculationId);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          const classified = classifyApiError(err);
          setError(classified);
          setCalculationStatus('failed');
          setIsLoading(false);
        }
      }
    };

    fetchEvaluation();

    return () => {
      isCancelled = true;
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [
    state.primarySiteId,
    state.missionEpoch.startUtc,
    state.missionEpoch.stopUtc,
    state.observerMastHeightM,
    state.sunVisibilityCriterion,
    state.earthVisibilityCriterion,
    state.launchSlipOffsetDays,
    setCalculationStatus,
    retryCount,
  ]);

  return { data, error, isLoading, refetch };
}
