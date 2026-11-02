import test from 'node:test';
import assert from 'node:assert/strict';
import { createHandler } from '@nextrush/adapter-bun';
import { createServerApp } from '@server/app';

const app = createServerApp();
const rawHandler = createHandler(app);
const handler = (req: Request) => (rawHandler as any)(req, {} as any);

test('NextRush Server: POST /api/dossier/generate returns complete dossier package with markdown', async () => {
  const payload = {
    targetName: 'Shackleton Connecting Ridge',
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    epochMs: Date.UTC(2026, 9, 26, 12, 0, 0),
    telecomBand: 'xBandDownlink',
  };

  const req = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.dossier);
  assert.equal(data.dossier.site.name, 'Shackleton Connecting Ridge');
  assert.equal(typeof data.dossier.site.usgsAcc6, 'string');
  assert.equal(data.dossier.site.usgsAcc6.length, 6);
  assert.equal(typeof data.dossier.telecom.diffractionLossDb, 'number');
  assert.ok(data.dossier.telecom.diffractionLossDb >= 0);
  assert.ok(data.dossier.decisionScience);
  assert.equal(typeof data.dossier.decisionScience.topsisScore, 'number');
  assert.ok(data.dossier.decisionScience.topsisScore >= 0 && data.dossier.decisionScience.topsisScore <= 1);
  assert.ok(data.markdown);
  assert.ok(data.markdown.includes('# 🌔 LUNAMISSION EXECUTIVE BRIEFING'));
  assert.ok(data.jsonTelemetry);
  assert.ok(data.provenance);
  assert.equal(data.provenance.generator, 'NextRush Backend Calculation Service');
});

test('NextRush Server: POST /api/dossier/generate rejects non-polar coordinates with 400', async () => {
  const req = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetName: 'Equator Site',
      latitudeDeg: 0.0,
      longitudeDeg: 45.0,
      epochMs: Date.UTC(2026, 9, 26, 12, 0, 0),
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.equal(data.error, 'Validation Error');
  assert.ok(Array.isArray(data.issues));
});

test('NextRush Server: POST /api/dossier/generate rejects missing required fields with 400', async () => {
  const req = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      latitudeDeg: -88.0,
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 400);
});

test('NextRush Server: POST /api/dossier/generate integrates spatiotemporal scenario evaluation and populates dossier.scenario', async () => {
  const payload = {
    targetName: 'Shackleton Connecting Ridge',
    siteId: 'shackleton-connecting-ridge',
    catalogId: 'shackleton-connecting-ridge',
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    startUtc: '2026-11-01T00:00:00.000Z',
    stopUtc: '2026-11-05T00:00:00.000Z',
    observerMastHeightM: 2.0,
    launchSlipOffsetDays: 0,
  };

  const req = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.dossier);
  assert.ok(data.dossier.scenario, 'dossier.scenario must be populated');
  assert.equal(typeof data.dossier.scenario.calculationId, 'string');
  assert.ok(data.dossier.scenario.calculationId.length > 0);
  assert.equal(data.dossier.scenario.lolaHorizonProfile.bins, 360);
  assert.equal(data.dossier.scenario.lolaHorizonProfile.binStatus, 'valid');
  assert.ok(data.dossier.scenario.illuminationWindows.totalIlluminatedHours >= 0);
  assert.ok(data.dossier.scenario.earthLoSWindows.totalEarthLoSHours >= 0);
  assert.equal(data.dossier.scenario.tier1Gating.passed, true);
  assert.equal(data.dossier.provenance.calculationId, data.dossier.scenario.calculationId);
  assert.equal(
    data.dossier.illumination.continuousSunlightHours,
    data.dossier.scenario.illuminationWindows.maxContinuousSunlightHours,
  );
});

test('NextRush Server: POST /api/dossier/generate formats DEM perturbation whiskers into Markdown and JSON telemetry', async () => {
  const payload = {
    targetName: 'Shackleton Connecting Ridge',
    siteId: 'shackleton-connecting-ridge',
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    startUtc: '2026-11-01T00:00:00.000Z',
    stopUtc: '2026-11-05T00:00:00.000Z',
    observerMastHeightM: 2.0,
  };

  const req = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.markdown.includes('## 8. Spatiotemporal Scenario Telemetry & DEM Perturbation Envelopes'));
  assert.ok(data.markdown.includes('LOLA Topographic Profile'));
  assert.ok(data.markdown.includes('DEM Perturbation Whiskers'));

  const parsedJson = JSON.parse(data.jsonTelemetry);
  assert.ok(parsedJson.dossier.scenario);
  assert.ok(Array.isArray(parsedJson.dossier.scenario.eventWhiskers));
  if (parsedJson.dossier.scenario.eventWhiskers.length > 0) {
    const firstWhisker = parsedJson.dossier.scenario.eventWhiskers[0];
    assert.ok(firstWhisker.eventType);
    assert.ok(firstWhisker.tLowUtc);
    assert.ok(firstWhisker.nominalUtc);
    assert.ok(firstWhisker.tHighUtc);
  }
});

test('NextRush Server: POST /api/dossier/generate utilizes CAS cache on repeated evaluation request', async () => {
  const payload = {
    targetName: 'Shackleton Connecting Ridge',
    siteId: 'shackleton-connecting-ridge',
    latitudeDeg: -89.44,
    longitudeDeg: 124.5,
    elevationKm: 1.85,
    startUtc: '2026-11-01T00:00:00.000Z',
    stopUtc: '2026-11-05T00:00:00.000Z',
    observerMastHeightM: 2.0,
  };

  const req1 = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const res1 = await handler(req1);
  assert.equal(res1.status, 200);

  const req2 = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const res2 = await handler(req2);
  assert.equal(res2.status, 200);

  const data2 = await res2.json();
  assert.equal(data2.dossier.scenario.provenance.cacheStatus, 'HIT');
  assert.equal(data2.dossier.scenario.casCacheHit, true);
});

test('NextRush Server: POST /api/dossier/generate falls back gracefully with binStatus "not_available" for custom coordinates', async () => {
  const payload = {
    targetName: 'Custom Crater Peak',
    latitudeDeg: -88.1234,
    longitudeDeg: 45.6789,
    startUtc: '2026-11-01T00:00:00.000Z',
    stopUtc: '2026-11-05T00:00:00.000Z',
  };

  const req = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.dossier.scenario);
  assert.equal(data.dossier.scenario.lolaHorizonProfile.binStatus, 'not_available');
  assert.equal(data.dossier.scenario.lolaHorizonProfile.bins, 0);
  assert.equal(data.dossier.site.name, 'Custom Crater Peak');
});

test('NextRush Server: POST /api/dossier/generate returns RFC 7807 problem details on validation failure', async () => {
  const req = new Request('http://localhost:3001/api/dossier/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetName: 'Invalid Site',
      latitudeDeg: -50.0,
      longitudeDeg: 45.0,
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 400);

  const data = await res.json();
  assert.equal(data.code, 'E_VALIDATION_ERROR');
  assert.equal(data.type, 'https://lunamission.nasa.gov/errors/E_VALIDATION_ERROR');
  assert.ok(Array.isArray(data.invalidParams));
  assert.equal(data.error, 'Validation Error');
  assert.ok(Array.isArray(data.issues));
});

test('NextRush Server: POST /api/dossier/export alias endpoint is functional', async () => {
  const req = new Request('http://localhost:3001/api/dossier/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      targetName: 'Shackleton Connecting Ridge',
      latitudeDeg: -89.44,
      longitudeDeg: 124.5,
    }),
  });

  const res = await handler(req);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.dossier);
  assert.ok(data.markdown);
  assert.ok(data.jsonTelemetry);
});
