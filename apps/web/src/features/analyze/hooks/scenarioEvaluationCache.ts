import type { ScenarioEvaluateResponse } from '@luna/contracts';

export const EVALUATION_CACHE = new Map<string, ScenarioEvaluateResponse>();

export function getScenarioEvaluationCacheKey(params: {
  siteId: string;
  startUtc: string;
  stopUtc: string;
  observerMastHeightM: number;
  sunVisibilityCriterion: string;
  earthVisibilityCriterion: string;
  launchSlipOffsetDays?: number;
}): string {
  return `${params.siteId}:${params.startUtc}:${params.stopUtc}:${params.observerMastHeightM}:${params.sunVisibilityCriterion}:${params.earthVisibilityCriterion}:${params.launchSlipOffsetDays ?? 0}`;
}
