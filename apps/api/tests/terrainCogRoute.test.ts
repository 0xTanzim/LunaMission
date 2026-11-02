import test from 'node:test';
import assert from 'node:assert/strict';
import { createServerApp } from '@server/app';
import { createHandler } from '@nextrush/adapter-bun';

function createDispatcher() {
  const app = createServerApp();
  const rawHandler = createHandler(app);
  return async (path: string, method: 'GET' | 'POST' = 'GET', body?: unknown) => {
    const url = `http://localhost:3001${path}`;
    const init: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body !== undefined && method !== 'GET') {
      init.body = JSON.stringify(body);
    }
    const req = new Request(url, init);
    const res = await (rawHandler as any)(req, {} as any);
    const data = await res.json().catch(() => null);
    return { status: res.status, data };
  };
}

const dispatch = createDispatcher();

test('NextRush Server: POST /api/terrain/tiered-elevation (4-Tier Cascade) resolves Peak near Cabeus B (-83.65°S)', async () => {
  const { status, data } = await dispatch('/api/terrain/tiered-elevation', 'POST', {
    latitudeDeg: -83.65,
    longitudeDeg: 291.27,
  });

  assert.equal(status, 200);
  assert.equal(data.activeTier, 4);
  assert.equal(data.resolutionMetersPerPx, 20);
  assert.equal(data.resolutionSmoothingBiasWarning, true);
  assert.ok(typeof data.elevationMeters === 'number');
});

test('NextRush Server: POST /api/terrain/tiered-elevation resolves Malapert Massif (-85.9°S) via Tier 2', async () => {
  const { status, data } = await dispatch('/api/terrain/tiered-elevation', 'POST', {
    latitudeDeg: -85.9,
    longitudeDeg: 2.9,
  });

  assert.equal(status, 200);
  assert.equal(data.activeTier, 2);
  assert.equal(data.resolutionMetersPerPx, 5);
  assert.equal(data.resolutionSmoothingBiasWarning, false);
});

test('NextRush Server: POST /api/terrain/tiered-elevation rejects non-polar coordinates with 400', async () => {
  const { status, data } = await dispatch('/api/terrain/tiered-elevation', 'POST', {
    latitudeDeg: -75.0,
    longitudeDeg: 45.0,
  });

  assert.equal(status, 400);
  assert.ok(data.error !== undefined);
});
