import { useEffect, useRef } from 'react';
import { apiClient } from '@/shared/api/apiClient';
import { useScenarioState } from './useScenarioState';
import {
  EVALUATION_CACHE,
  getScenarioEvaluationCacheKey,
} from '@/features/analyze/hooks/scenarioEvaluationCache';

/**
 * Global background evaluator running at CockpitAppShell level.
 * Guarantees calculationStatus is automatically resolved across all projections
 * (Explore, Analyze, Compare) so the status badge never hangs indefinitely in "SOLVING ROOTS...".
 */
export function useScenarioBackgroundEvaluator(): void {
  const { state, setCalculationStatus } = useScenarioState();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isCancelled = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const ac = new AbortController();
    abortControllerRef.current = ac;

    const runEvaluation = async () => {
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

        const cacheKey = getScenarioEvaluationCacheKey(payload);
        const cached = EVALUATION_CACHE.get(cacheKey);
        if (cached) {
          if (!isCancelled) {
            setCalculationStatus(cached.status, cached.calculationId);
          }
          return;
        }

        const response = await apiClient.evaluateScenario(payload, ac.signal);
        if (!isCancelled) {
          EVALUATION_CACHE.set(cacheKey, response);
          setCalculationStatus(response.status, response.calculationId);
        }
      } catch (err: unknown) {
        if (
          !isCancelled &&
          !(err instanceof DOMException && err.name === 'AbortError') &&
          !((err as any)?.name === 'AbortError')
        ) {
          setCalculationStatus('failed');
        }
      }
    };

    runEvaluation();

    return () => {
      isCancelled = true;
      ac.abort();
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
  ]);
}
