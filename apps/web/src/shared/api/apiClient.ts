/**
 * Canonical Typed REST Flight-Deck API Client
 * Governed by docs/phase-3/API_CONTRACT.md and FRONTEND_ARCHITECTURE.md § 3.1.
 * Strictly consumes backend REST endpoints with zero client-side astronomical math.
 */

import {
  canonicalScenarioEvaluateResponseSchema,
  canonicalScenarioCompareResponseSchema,
  siteCatalogResponseSchema,
  type ScenarioEvaluateRequest,
  type ScenarioEvaluateResponse,
  type ScenarioCompareRequest,
  type ScenarioCompareResponse,
  type SiteCatalogResponse,
} from '@luna/contracts';
import { scenarioEvaluationCache, scenarioComparisonCache } from './queryCache';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  public async evaluateScenario(request: ScenarioEvaluateRequest): Promise<ScenarioEvaluateResponse> {
    const cacheKey = scenarioEvaluationCache.computeKey(request);
    const cached = scenarioEvaluationCache.get(cacheKey) as ScenarioEvaluateResponse | null;
    if (cached) return cached;

    const res = await fetch(`${this.baseUrl}/api/v1/scenarios/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw errJson;
    }

    const json = await res.json();
    const parsed = canonicalScenarioEvaluateResponseSchema.parse(json);
    scenarioEvaluationCache.set(cacheKey, parsed);
    return parsed;
  }

  public async compareScenarios(request: ScenarioCompareRequest): Promise<ScenarioCompareResponse> {
    const cacheKey = scenarioComparisonCache.computeKey(request);
    const cached = scenarioComparisonCache.get(cacheKey) as ScenarioCompareResponse | null;
    if (cached) return cached;

    const res = await fetch(`${this.baseUrl}/api/v1/scenarios/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw errJson;
    }

    const json = await res.json();
    const parsed = canonicalScenarioCompareResponseSchema.parse(json);
    scenarioComparisonCache.set(cacheKey, parsed);
    return parsed;
  }

  public async fetchSiteCatalog(): Promise<SiteCatalogResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/sites`);
    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw errJson;
    }
    const json = await res.json();
    return siteCatalogResponseSchema.parse(json);
  }
}

export const apiClient = new ApiClient();
