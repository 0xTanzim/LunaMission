import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchHorizonProfile,
  HorizonRequestError,
  HorizonUnsupportedError,
  mapHttpFailureToStatus,
} from '../horizonProfileClient';

const FIXTURE_RESPONSE = {
  siteId: 'shackleton-rim',
  mastHeightMeters: 2,
  azimuthBinsCount: 360,
  stepDeg: 1,
  bins: [
    {
      azimuthDeg: 0,
      azimuthSectorDeg: [0, 1],
      maskElevationDeg: -2.2,
      ridgeDistanceKm: 41.0,
      blockerElevationMeters: 300,
      binStatus: 'valid',
    },
  ],
  provenance: { dataset: 'NASA_LOLA_PGDA', z0ObserverMeters: 639.53, rMaxMeters: 1744600 },
  status: 'valid',
};

function withFetch(stub: (url: string, init: RequestInit) => Promise<Response>) {
  const orig = globalThis.fetch;
  globalThis.fetch = stub as typeof fetch;
  return () => { globalThis.fetch = orig; };
}

test('client: POSTs the mast height to /api/v1/horizons and returns the typed response', async () => {
  let capturedUrl = '';
  let capturedBody = '';
  let capturedMethod = '';
  const restore = withFetch(async (url, init) => {
    capturedUrl = url;
    capturedMethod = init.method ?? '';
    capturedBody = String(init.body ?? '');
    return new Response(JSON.stringify(FIXTURE_RESPONSE), { status: 200 });
  });
  try {
    const response = await fetchHorizonProfile({ siteId: 'shackleton-rim', mastHeightMeters: 2 });
    assert.equal(response.siteId, 'shackleton-rim');
    assert.equal(response.bins[0]!.maskElevationDeg, -2.2);
    assert.equal(capturedUrl, '/api/v1/horizons');
    assert.equal(capturedMethod, 'POST');
    const body = JSON.parse(capturedBody);
    assert.deepEqual(body, { siteId: 'shackleton-rim', mastHeightMeters: 2 });
  } finally {
    restore();
  }
});

test('client: 404 (site not in the curated asset) maps to unsupported', async () => {
  const restore = withFetch(async () => new Response(JSON.stringify({ error: 'Horizon Profile Not Found' }), { status: 404 }));
  try {
    await assert.rejects(
      () => fetchHorizonProfile({ siteId: 'no-such-site', mastHeightMeters: 2 }),
      HorizonUnsupportedError,
    );
  } finally {
    restore();
  }
});

test('client: 400 and network failures map to failed with the server message', async () => {
  const restore400 = withFetch(async () => new Response(JSON.stringify({ error: 'Validation Error' }), { status: 400 }));
  try {
    await assert.rejects(() => fetchHorizonProfile({ siteId: 'shackleton-rim' }), HorizonRequestError);
  } finally {
    restore400();
  }

  const restoreNet = withFetch(async () => { throw new TypeError('network down'); });
  try {
    await assert.rejects(
      () => fetchHorizonProfile({ siteId: 'shackleton-rim' }),
      (err: unknown) => err instanceof HorizonRequestError && /network down|Failed/i.test(err.message),
    );
  } finally {
    restoreNet();
  }
});

test('status mapping: HTTP failure codes map onto the six-state vocabulary', () => {
  assert.equal(mapHttpFailureToStatus(404), 'unsupported');
  assert.equal(mapHttpFailureToStatus(400), 'failed');
  assert.equal(mapHttpFailureToStatus(500), 'failed');
});
