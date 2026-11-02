import test from 'node:test';
import assert from 'node:assert/strict';
import { missionServerClient } from '../missionServerClient';

test('Mission Server Client: returns null without synthesizing fake physics when backend is unreachable', async () => {
  // Use a non-existent port to force network failure
  const client = missionServerClient.withBaseUrl('http://127.0.0.1:59999/api');

  const result = await client.getConditions({
    siteId: 'connecting-ridge',
    epochMs: Date.UTC(2026, 9, 26, 12, 0, 0),
    calculationMode: 'geometry-only',
  });

  assert.equal(result, null);
});

test('Mission Server Client: returns null for link budget when backend is unreachable', async () => {
  const client = missionServerClient.withBaseUrl('http://127.0.0.1:59999/api');

  const budget = await client.getLinkBudget({
    siteId: 'connecting-ridge',
    epochMs: Date.UTC(2026, 9, 26, 12, 0, 0),
    band: 'xBandDownlink',
  });

  assert.equal(budget, null);
});

test('Mission Server Client: returns null for volatile prospect when backend is unreachable', async () => {
  const client = missionServerClient.withBaseUrl('http://127.0.0.1:59999/api');

  const prospect = await client.getVolatileProspect({
    latDeg: -89.68,
    lonDeg: 125.0,
  });

  assert.equal(prospect, null);
});

test('Mission Server Client: returns null for landing windows when backend is unreachable', async () => {
  const client = missionServerClient.withBaseUrl('http://127.0.0.1:59999/api');

  const result = await client.optimizeLandingWindows({
    siteId: 'connecting-ridge',
    startEpochMs: Date.UTC(2026, 9, 1),
    endEpochMs: Date.UTC(2026, 11, 31),
    stayDurationDays: 14,
    topN: 2,
  });

  assert.equal(result, null);
});

test('Mission Server Client: returns null for landing safety when backend is unreachable', async () => {
  const client = missionServerClient.withBaseUrl('http://127.0.0.1:59999/api');

  const result = await client.evaluateLandingSafety({
    slopeDeg: 3.5,
    illuminationPct: 80.0,
    earthVisibilityPct: 70.0,
    volatilesScore: 60.0,
    roughnessTheta0Deg: 3.0,
  });

  assert.equal(result, null);
});

test('Mission Server Client: parses live server response with authoritative nextrush_server source', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/landing-safety/evaluate')) {
        return new Response(
          JSON.stringify({
            compositeScore: 85,
            breakdown: { slopeScore: 100, illuminationScore: 80, earthVisibilityScore: 70, volatilesScore: 60, roughnessScore: 70 },
            recommendation: 'GO',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    const client = missionServerClient.withBaseUrl('/api');
    const result = await client.evaluateLandingSafety({
      slopeDeg: 3.5,
      illuminationPct: 80.0,
      earthVisibilityPct: 70.0,
      volatilesScore: 60.0,
      roughnessTheta0Deg: 3.0,
    });

    assert.ok(result);
    assert.equal(result?.source, 'nextrush_server');
    assert.equal(result?.recommendation, 'GO');
    assert.equal(result?.compositeScore, 85);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
