import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { ApiClient } from '../apiClient';
import type { ScenarioEvaluateRequest } from '@luna/contracts';
import mockScenarioEvaluation from './fixtures/mockScenarioEvaluation.json';
import mockSiteCatalog from './fixtures/mockSiteCatalog.json';

describe('ApiClient Concurrency & In-Flight Promise Sharing', () => {
  const originalFetch = globalThis.fetch;
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient('http://localhost:3001');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('deduplicates concurrent evaluateScenario requests into a single in-flight fetch', async () => {
    let fetchCount = 0;
    const req: ScenarioEvaluateRequest = {
      siteId: 'shackleton-rim',
      startUtc: '2026-11-01T00:00:00.000Z',
      stopUtc: '2026-11-01T01:00:00.000Z',
      observerMastHeightM: 2.0,
      sunVisibilityCriterion: 'upperLimb',
      earthVisibilityCriterion: 'center',
      launchSlipOffsetDays: 0,
      sampleIntervalSec: 600,
    };

    globalThis.fetch = (async (_url: string | URL | Request, _init?: RequestInit) => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 25));
      return new Response(JSON.stringify(mockScenarioEvaluation), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const [res1, res2] = await Promise.all([
      client.evaluateScenario(req),
      client.evaluateScenario(req),
    ]);

    expect(fetchCount).toBe(1);
    expect(res1.calculationId).toBe(mockScenarioEvaluation.calculationId);
    expect(res2.calculationId).toBe(mockScenarioEvaluation.calculationId);
  });

  it('deduplicates concurrent fetchSiteCatalog requests into a single in-flight fetch', async () => {
    let fetchCount = 0;

    globalThis.fetch = (async (_url: string | URL | Request) => {
      fetchCount++;
      await new Promise((r) => setTimeout(r, 25));
      return new Response(JSON.stringify(mockSiteCatalog), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as unknown as typeof fetch;

    const [cat1, cat2] = await Promise.all([
      client.fetchSiteCatalog(),
      client.fetchSiteCatalog(),
    ]);

    expect(fetchCount).toBe(1);
    expect(cat1.sites.length).toBeGreaterThan(0);
    expect(cat2.sites.length).toBe(cat1.sites.length);
    expect(cat1.sites[0].id).toBe(mockSiteCatalog.sites[0].id);
  });

  it('forwards AbortSignal and aborts when signal is triggered', async () => {
    globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          resolve(new Response(JSON.stringify({ status: 'valid' })));
        }, 100);

        if (init?.signal) {
          init.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            const err = new Error('The operation was aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    }) as unknown as typeof fetch;

    const controller = new AbortController();
    const req: ScenarioEvaluateRequest = {
      siteId: 'connecting-ridge',
      startUtc: '2026-11-01T00:00:00.000Z',
      stopUtc: '2026-11-02T00:00:00.000Z',
      observerMastHeightM: 2.0,
      sunVisibilityCriterion: 'upperLimb',
      earthVisibilityCriterion: 'center',
      launchSlipOffsetDays: 0,
      sampleIntervalSec: 600,
    };

    const promise = client.evaluateScenario(req, controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow();
  });
});
