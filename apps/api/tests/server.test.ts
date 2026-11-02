import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';

const app = createServerApp();
const rawHandler = createHandler(app);
const handler = (req: Request) => (rawHandler as any)(req, {} as any);

test('NextRush Server: GET /api/health returns online status and runtime telemetry', async () => {
  const req = new Request('http://localhost:3001/api/health', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'online');
  assert.equal(data.framework, 'NextRush');
  assert.equal(data.runtime, 'Bun');
  assert.ok(typeof data.epoch === 'string');
});

test('NextRush Server: POST /api/ephemeris/conditions calculates valid lunar conditions', async () => {
  const payload = {
    siteId: 'connecting-ridge',
    epochMs: Date.UTC(2026, 9, 26, 12, 0, 0),
    calculationMode: 'geometry-only',
  };

  const req = new Request('http://localhost:3001/api/ephemeris/conditions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.siteId, 'connecting-ridge');
  assert.ok(data.solarElevationDeg !== undefined);
  assert.ok(data.earthElevationDeg !== undefined);
  assert.ok(data.earthDistanceKm > 350000);
});

test('NextRush Server: POST /api/ephemeris/conditions rejects invalid input with 400 and Zod issues', async () => {
  const req = new Request('http://localhost:3001/api/ephemeris/conditions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId: '', epochMs: 'invalid' }),
  });

  const res = await handler(req);
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.equal(data.error, 'Validation Error');
  assert.ok(Array.isArray(data.issues));
  assert.ok(data.issues.length >= 2);
});

test('NextRush Server: POST /api/telecom/link-budget calculates DSN RF margin', async () => {
  const payload = {
    siteId: 'connecting-ridge',
    epochMs: Date.UTC(2026, 9, 26, 12, 0, 0),
    band: 'xBandDownlink',
    transmitterPowerWatts: 15,
    dataRateMbps: 2.0,
  };

  const req = new Request('http://localhost:3001/api/telecom/link-budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.linkBudget !== undefined);
  assert.ok(data.linkBudget.linkMarginDb !== undefined);
  assert.ok(data.dsnTracking !== undefined);
  assert.ok(data.dsnTracking.activeStation !== undefined);
});

test('NextRush Server: POST /api/telecom/link-budget rejects invalid payload with 400', async () => {
  const req = new Request('http://localhost:3001/api/telecom/link-budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId: 'connecting-ridge', epochMs: 1793016000000, band: 'invalid-band' }),
  });

  const res = await handler(req);
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.equal(data.error, 'Validation Error');
});

test('NextRush Server: POST /api/volatiles/prospect evaluates hydrogen wt% and Diviner temp', async () => {
  const req = new Request('http://localhost:3001/api/volatiles/prospect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latDeg: -89.68,
      lonDeg: 125.0,
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.data !== undefined);
  assert.equal(body.data.isPsr, true);
  assert.ok(body.data.divinerTempKelvin < 110);
  assert.ok(body.data.hydrogenWeightPct > 0.1);
  assert.ok(body.data.isruFeasibilityScore > 0);
});

test('NextRush Server: POST /api/volatiles/prospect rejects invalid coordinates with 400', async () => {
  const req = new Request('http://localhost:3001/api/volatiles/prospect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latDeg: 10.0, // Invalid: outside south pole
      lonDeg: 0,
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.equal(data.error, 'Invalid volatile prospecting payload');
});

test('NextRush Server: POST /api/windows/optimize finds ranked Pareto windows', async () => {
  const req = new Request('http://localhost:3001/api/windows/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: 'connecting-ridge',
      startEpochMs: Date.UTC(2026, 9, 1),
      endEpochMs: Date.UTC(2026, 11, 31),
      stayDurationDays: 14,
      topN: 3,
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.data !== undefined);
  assert.equal(body.data.siteId, 'connecting-ridge');
  assert.ok(body.data.topWindows.length > 0);
  assert.equal(body.data.topWindows[0].rank, 1);
});

test('NextRush Server: POST /api/windows/optimize rejects missing fields with 400', async () => {
  const req = new Request('http://localhost:3001/api/windows/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteId: '' }),
  });

  const res = await handler(req);
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.equal(data.error, 'Invalid landing window optimization payload');
});

test('NextRush Server: POST /api/windows/optimize rejects inverted dates and >365-day spans with 400', async () => {
  // Inverted dates
  const invertedReq = new Request('http://localhost:3001/api/windows/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: 'connecting-ridge',
      startEpochMs: 1777464000000,
      endEpochMs: 1774872000000,
    }),
  });
  const invertedRes = await handler(invertedReq);
  assert.equal(invertedRes.status, 400);
  const invertedData = await invertedRes.json();
  assert.equal(invertedData.error, 'Invalid landing window optimization payload');
  assert.ok(invertedData.issues.some((i: any) => i.message.includes('endEpochMs must be greater than or equal to startEpochMs')));

  // Search span > 365 days
  const longSpanReq = new Request('http://localhost:3001/api/windows/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: 'connecting-ridge',
      startEpochMs: 1774872000000,
      endEpochMs: 1774872000000 + 366 * 86400 * 1000,
    }),
  });
  const longSpanRes = await handler(longSpanReq);
  assert.equal(longSpanRes.status, 400);
  const longSpanData = await longSpanRes.json();
  assert.equal(longSpanData.error, 'Invalid landing window optimization payload');
  assert.ok(longSpanData.issues.some((i: any) => i.message.includes('365 days')));
});


test('NextRush Server: POST /api/telecom/link-budget evaluates Ka-band 26 GHz RF path loss', async () => {
  const req = new Request('http://localhost:3001/api/telecom/link-budget', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: 'connecting-ridge',
      epochMs: 1793016000000,
      band: 'kaBandDownlink',
      transmitterPowerWatts: 50,
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.linkBudget !== undefined);
  assert.equal(data.linkBudget.frequencyGhz, 32.0);
  assert.ok(data.linkBudget.fsplDb > 220); // Ka-band produces >220 dB FSPL
});

test('NextRush Server: POST /api/windows/optimize handles custom thresholds and limits topN', async () => {
  const req = new Request('http://localhost:3001/api/windows/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      siteId: 'connecting-ridge',
      startEpochMs: Date.UTC(2026, 9, 1),
      endEpochMs: Date.UTC(2026, 11, 31),
      stayDurationDays: 7,
      minSunlightPct: 20,
      maxContinuousShadowHours: 200,
      topN: 2,
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const body = await res.json();
  assert.equal(body.success, true);
  assert.ok(body.data.topWindows.length <= 2);
});

test('NextRush Server: handles 404 for unknown endpoints gracefully', async () => {
  const req = new Request('http://localhost:3001/api/unknown-endpoint', { method: 'GET' });
  const res = await handler(req);

  assert.equal(res.status, 404);
});
