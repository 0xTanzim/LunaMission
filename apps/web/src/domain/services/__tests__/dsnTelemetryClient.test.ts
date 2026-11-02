import test from 'node:test';
import assert from 'node:assert/strict';
import { dsnTelemetryClient } from '../dsnTelemetryClient';

test('dsnTelemetryClient: returns offline status when backend is unreachable without fake physics', async () => {
  const client = dsnTelemetryClient.withBaseUrl('http://127.0.0.1:59999/api');

  const result = await client.fetchLiveDsnTelemetry('shackleton-rim', Date.UTC(2026, 9, 26, 12, 0, 0));

  assert.equal(result.status, 'offline_fallback');
  assert.equal(result.provenance.source, 'nextrush_server');
  assert.equal(result.stations.length, 0, 'No synthetic stations generated in offline mode');
  assert.equal(result.lunarTrackingSummary.activeLunarDishes, 0);
  assert.equal(result.lunarTrackingSummary.linkState, 'loss_of_signal');
});

test('dsnTelemetryClient: creates clean offline response object', () => {
  const offline = dsnTelemetryClient.createOfflineResponse(Date.UTC(2026, 9, 26, 12, 0, 0));

  assert.equal(offline.status, 'offline_fallback');
  assert.equal(offline.provenance.source, 'nextrush_server');
  assert.equal(offline.activeStationId, null);
  assert.equal(offline.stations.length, 0);
});

test('dsnTelemetryClient: parses server telemetry response when backend succeeds', async () => {
  const mockDsnResponse = {
    status: 'live_feed',
    timestampIso: new Date().toISOString(),
    feedTimestampMs: Date.now(),
    latencyMs: 120,
    stations: [
      {
        id: 'gdscc',
        friendlyName: 'Goldstone Deep Space Communications Complex',
        timeUtcMs: Date.now(),
        timeZoneOffsetMs: -28800000,
        dishes: [
          {
            dishName: 'DSS-14 (70m Mars Dish)',
            azimuthDeg: 145.2,
            elevationDeg: 42.1,
            windSpeedKmh: 12.0,
            isMspa: false,
            isArray: false,
            isDdor: false,
            activity: 'TRACKING_LRO',
            upSignals: [],
            downSignals: [],
            targets: [{ name: 'LRO', id: '85', uplegRangeKm: 384400, downlegRangeKm: 384400, roundTripLightTimeSec: 2.56 }],
          },
        ],
        topocentric: { elevationDeg: 42.1, azimuthDeg: 145.2, isVisible: true, horizonMaskDeg: 10.0 },
      },
    ],
    activeStationId: 'gdscc',
    lunarTrackingSummary: {
      activeLunarDishes: 1,
      trackedSpacecraft: ['LRO'],
      primaryTrackingDish: 'DSS-14',
      downlinkBand: 'X-Band',
      linkMarginDb: 9.8,
      linkState: 'locked',
    },
    provenance: {
      source: 'https://eyes.nasa.gov/dsn/data/dsn.xml',
      endpoint: '/api/telemetry/dsn',
      cached: true,
      cacheTtlSeconds: 10,
    },
  };

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/telemetry/dsn')) {
        return new Response(JSON.stringify(mockDsnResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('Not found', { status: 404 });
    }) as any;

    const client = dsnTelemetryClient.withBaseUrl('/api');
    const result = await client.fetchLiveDsnTelemetry();

    assert.equal(result.status, 'live_feed');
    assert.equal(result.activeStationId, 'gdscc');
    assert.equal(result.lunarTrackingSummary.linkMarginDb, 9.8);
    assert.equal(result.stations[0].dishes[0].dishName, 'DSS-14 (70m Mars Dish)');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
