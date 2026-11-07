/**
 * Canonical Typed REST Flight-Deck API Client
 * Governed by docs/phase-3/API_CONTRACT.md and FRONTEND_ARCHITECTURE.md § 3.1.
 * Strictly consumes backend REST endpoints with zero client-side astronomical math.
 * Enhanced with Single-Flight in-flight request deduplication and AbortSignal support.
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
  private inFlightMap = new Map<string, Promise<unknown>>();

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  public clearInFlight(): void {
    this.inFlightMap.clear();
  }

  public async evaluateScenario(
    request: ScenarioEvaluateRequest,
    signal?: AbortSignal,
  ): Promise<ScenarioEvaluateResponse> {
    const cacheKey = scenarioEvaluationCache.computeKey(request);
    const cached = scenarioEvaluationCache.get(cacheKey) as ScenarioEvaluateResponse | null;
    if (cached) return cached;

    if (this.inFlightMap.has(cacheKey)) {
      return this.inFlightMap.get(cacheKey) as Promise<ScenarioEvaluateResponse>;
    }

    const promise = (async () => {
      const res = await fetch(`${this.baseUrl}/api/v1/scenarios/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw errJson;
      }

      const json = await res.json();
      const parsed = canonicalScenarioEvaluateResponseSchema.parse(json);
      scenarioEvaluationCache.set(cacheKey, parsed);
      return parsed;
    })().finally(() => {
      this.inFlightMap.delete(cacheKey);
    });

    this.inFlightMap.set(cacheKey, promise);
    return promise;
  }

  public async compareScenarios(
    request: ScenarioCompareRequest,
    signal?: AbortSignal,
  ): Promise<ScenarioCompareResponse> {
    const cacheKey = scenarioComparisonCache.computeKey(request);
    const cached = scenarioComparisonCache.get(cacheKey) as ScenarioCompareResponse | null;
    if (cached) return cached;

    if (this.inFlightMap.has(cacheKey)) {
      return this.inFlightMap.get(cacheKey) as Promise<ScenarioCompareResponse>;
    }

    const promise = (async () => {
      const res = await fetch(`${this.baseUrl}/api/v1/scenarios/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw errJson;
      }

      const json = await res.json();
      const parsed = canonicalScenarioCompareResponseSchema.parse(json);
      scenarioComparisonCache.set(cacheKey, parsed);
      return parsed;
    })().finally(() => {
      this.inFlightMap.delete(cacheKey);
    });

    this.inFlightMap.set(cacheKey, promise);
    return promise;
  }

  public async fetchSiteCatalog(signal?: AbortSignal): Promise<SiteCatalogResponse> {
    const cacheKey = '__site_catalog__';
    if (this.inFlightMap.has(cacheKey)) {
      return this.inFlightMap.get(cacheKey) as Promise<SiteCatalogResponse>;
    }

    const promise = (async () => {
      const res = await fetch(`${this.baseUrl}/api/v1/sites`, { signal });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw errJson;
      }
      const json = await res.json();
      return siteCatalogResponseSchema.parse(json);
    })().finally(() => {
      this.inFlightMap.delete(cacheKey);
    });

    this.inFlightMap.set(cacheKey, promise);
    return promise;
  }
}

export const apiClient = new ApiClient();
