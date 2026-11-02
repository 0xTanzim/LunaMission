import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';
import { dsnTelemetryResponseSchema } from '@server/schemas/telemetrySchemas';
import { dsnIngestionService } from '@server/services/dsnIngestionService';

const app = createServerApp();
const rawHandler = createHandler(app);
const handler = (req: Request) => (rawHandler as any)(req, {} as any);

// ============================================================================
// Task 2: Endpoint Stress Testing — GET /api/sites
// ============================================================================

test('GET /api/sites: blocks SQL injection probes with 400 Validation Error', async () => {
  const sqlProbes = [
    'category=%27%20OR%201=1%20--',
    'category=%22;%20DROP%20TABLE%20sites;%20--',
    'tier=1%27%20UNION%20SELECT%20*%20FROM%20users--',
    'category=admin%27--',
    'tier=%27%20OR%20%27x%27=%27x',
  ];

  for (const probe of sqlProbes) {
    const req = new Request(`http://localhost:3001/api/sites?${probe}`, { method: 'GET' });
    const res = await handler(req);
    assert.equal(res.status, 400, `Expected 400 for SQL injection probe: ${probe}`);
    const body = await res.json();
    assert.equal(body.error, 'Validation Error');
    assert.ok(Array.isArray(body.issues));
  }
});

test('GET /api/sites: safely strips NoSQL injection attempts and returns valid catalog', async () => {
  const nosqlProbes = [
    'category[$ne]=null',
    'category[$gt]=',
    'category[$regex]=.*',
    'tier[$where]=true',
  ];

  for (const probe of nosqlProbes) {
    const req = new Request(`http://localhost:3001/api/sites?${probe}`, { method: 'GET' });
    const res = await handler(req);
    assert.equal(res.status, 200, `Expected 200 for stripped NoSQL probe: ${probe}`);
    const body = await res.json();
    // Unknown keys are stripped by Zod schema, resolving to default unfiltered catalog
    assert.equal(body.sites.length, 20);
    assert.equal(body.metadata.filteredCount, 20);
  }
});

test('GET /api/sites: strictly rejects unmapped categories and empty parameters with 400', async () => {
  const invalidQueries = [
    'category=jupiter-mission',
    'tier=deep-space-benchmark',
    'category=mars-outpost',
    'category=NULL',
    'category=undefined',
    'category=0',
    'category=false',
    'category=',
    'tier=',
  ];

  for (const q of invalidQueries) {
    const req = new Request(`http://localhost:3001/api/sites?${q}`, { method: 'GET' });
    const res = await handler(req);
    assert.equal(res.status, 400, `Expected 400 for query: ${q}`);
    const body = await res.json();
    assert.equal(body.error, 'Validation Error');
  }
});

test('GET /api/sites: handles rapid bursts of 500 concurrent requests without failure', async () => {
  const t0 = performance.now();
  const requests: Promise<Response>[] = [];

  for (let i = 0; i < 500; i++) {
    const mode = i % 4;
    let url = 'http://localhost:3001/api/sites';
    if (mode === 1) url += '?category=artemis-iii-2024';
    if (mode === 2) url += '?category=clps';
    if (mode === 3) url += '?tier=polar-benchmark';

    requests.push(handler(new Request(url, { method: 'GET' })));
  }

  const responses = await Promise.all(requests);
  const elapsed = performance.now() - t0;

  for (const res of responses) {
    assert.equal(res.status, 200);
  }

  // Ensure high throughput (> 1,000 req/sec)
  const reqPerSec = (500 / (elapsed / 1000));
  assert.ok(reqPerSec > 1000, `Throughput was ${reqPerSec.toFixed(0)} req/s`);
});

// ============================================================================
// Task 3: Endpoint Stress Testing — GET /api/sites/:id Path Traversal & 404
// ============================================================================

test('GET /api/sites/:id: strictly returns 404 on path traversal attempts', async () => {
  const traversalUrls = [
    'http://localhost:3001/api/sites/..%2F..%2Fetc%2Fpasswd',
    'http://localhost:3001/api/sites/%2e%2e%2f%2e%2e%2fetc%2fpasswd',
    'http://localhost:3001/api/sites/%2e%2e%5c%2e%2e%5cwindows%5cwin.ini',
    'http://localhost:3001/api/sites/..%252f..%252fetc%252fpasswd',
    'http://localhost:3001/api/sites/%00/etc/passwd',
  ];

  for (const url of traversalUrls) {
    const req = new Request(url, { method: 'GET' });
    const res = await handler(req);
    assert.equal(res.status, 404, `Expected 404 for traversal attempt: ${url}`);
    const text = await res.text();
    assert.ok(text.includes('error'), 'Expected error payload in JSON');
  }
});

test('GET /api/sites/:id: returns strict 404 for non-existent IDs and special characters', async () => {
  const edgeIds = [
    'non-existent-site-crater-999',
    'null',
    'undefined',
    '0',
    'false',
    'NaN',
    '%27%20OR%201=1%20--',
    '$(whoami)',
    'A'.repeat(500),
  ];

  for (const id of edgeIds) {
    const req = new Request(`http://localhost:3001/api/sites/${id}`, { method: 'GET' });
    const res = await handler(req);
    assert.equal(res.status, 404, `Expected 404 for ID: ${id}`);
    const body = await res.json();
    assert.ok(body.error !== undefined);
  }
});

test('GET /api/sites/:id: returns 200 with complete investigation for valid landing sites', async () => {
  const validSites = ['shackleton-rim', 'haworth-rim', 'malapert-massif', 'connecting-ridge'];

  for (const siteId of validSites) {
    const req = new Request(`http://localhost:3001/api/sites/${siteId}`, { method: 'GET' });
    const res = await handler(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.site.id, siteId);
    assert.equal(body.investigation.id, siteId);
    assert.equal(body.investigation.topography.elevationProfile.length, 48);
  }
});

// ============================================================================
// Task 4: GET /api/telemetry/dsn LRU Cache, Latency (< 5ms), & Non-Blocking Loop
// ============================================================================

test('GET /api/telemetry/dsn: serves cached responses in < 5ms (mean and p99)', async () => {
  // Prime the cache
  const primeReq = new Request('http://localhost:3001/api/telemetry/dsn', { method: 'GET' });
  const primeRes = await handler(primeReq);
  assert.equal(primeRes.status, 200);

  const latencies: number[] = [];

  for (let i = 0; i < 300; i++) {
    const t0 = performance.now();
    const res = await handler(new Request('http://localhost:3001/api/telemetry/dsn', { method: 'GET' }));
    const t1 = performance.now();
    assert.equal(res.status, 200);
    latencies.push(t1 - t0);
  }

  latencies.sort((a, b) => a - b);
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p50 = latencies[Math.floor(latencies.length * 0.50)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const p99 = latencies[Math.floor(latencies.length * 0.99)];

  assert.ok(mean < 5.0, `Expected mean latency < 5ms, got ${mean.toFixed(3)}ms`);
  assert.ok(p99 < 5.0, `Expected p99 latency < 5ms, got ${p99.toFixed(3)}ms`);
});

test('GET /api/telemetry/dsn: does not block event loop during high-frequency burst', async () => {
  let maxLoopLag = 0;
  let lastTick = performance.now();

  const timer = setInterval(() => {
    const now = performance.now();
    const lag = now - lastTick - 1; // Expected ~1ms tick
    if (lag > maxLoopLag) maxLoopLag = lag;
    lastTick = now;
  }, 1);

  // Send 300 concurrent requests
  const promises = Array.from({ length: 300 }, () =>
    handler(new Request('http://localhost:3001/api/telemetry/dsn', { method: 'GET' }))
  );
  await Promise.all(promises);

  clearInterval(timer);

  // Maximum allowed event loop lag is 15ms during intensive burst
  assert.ok(maxLoopLag < 15.0, `Expected event loop lag < 15ms, observed ${maxLoopLag.toFixed(3)}ms`);
});

test('GET /api/telemetry/dsn: provides fully schema-compliant offline fallback when network is unavailable', async () => {
  const originalFetch = globalThis.fetch;
  try {
    // Simulate network blackout
    globalThis.fetch = (async () => {
      throw new Error('ETIMEDOUT: Simulated offline deep space network feed');
    }) as unknown as typeof fetch;

    dsnIngestionService.clearCache();
    const req = new Request('http://localhost:3001/api/telemetry/dsn', { method: 'GET' });
    const res = await handler(req);

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'offline_fallback');
    assert.equal(data.stations.length, 3);
    assert.ok(data.activeStationId !== null);

    // Strict Zod schema validation
    const schemaCheck = dsnTelemetryResponseSchema.safeParse(data);
    assert.equal(schemaCheck.success, true, 'Fallback must strictly adhere to telemetry schema');
  } finally {
    globalThis.fetch = originalFetch;
    dsnIngestionService.clearCache();
  }
});
