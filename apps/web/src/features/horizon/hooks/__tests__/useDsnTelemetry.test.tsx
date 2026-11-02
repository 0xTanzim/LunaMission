import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { useDsnTelemetry } from '../useDsnTelemetry';

test('useDsnTelemetry: mounts cleanly with authoritative nextrush_server source and loading status', () => {
  let capturedState!: ReturnType<typeof useDsnTelemetry>;

  const Harness = () => {
    capturedState = useDsnTelemetry({
      epochMs: Date.UTC(2026, 9, 26, 12, 0, 0),
    });
    return (
      <div data-testid="dsn-telemetry-harness">
        <span id="source">{capturedState.source}</span>
        <span id="status">{capturedState.status}</span>
        <span id="is-live">{capturedState.isLive ? 'live' : 'offline'}</span>
      </div>
    );
  };

  const html = renderToStaticMarkup(<Harness />);
  assert.ok(html.includes('nextrush_server'));
  assert.ok(html.includes('loading'));
  assert.ok(html.includes('offline'));
  assert.equal(capturedState.isLive, false);
  assert.equal(capturedState.source, 'nextrush_server');
  assert.equal(capturedState.status, 'loading');
});

test('useDsnTelemetry: parses live feed and sets isLive to true on server success', async () => {
  const mockLiveResponse = {
    status: 'live_feed',
    timestampIso: new Date().toISOString(),
    feedTimestampMs: Date.now(),
    latencyMs: 85,
    stations: [
      {
        id: 'gdscc',
        friendlyName: 'Goldstone Deep Space Communications Complex',
        timeUtcMs: Date.now(),
        timeZoneOffsetMs: -28800000,
        dishes: [
          {
            dishName: 'DSS-14 (70m)',
            azimuthDeg: 120.0,
            elevationDeg: 45.0,
            windSpeedKmh: 5.0,
            isMspa: false,
            isArray: false,
            isDdor: false,
            activity: 'TRACKING_LRO',
            upSignals: [],
            downSignals: [],
            targets: [],
          },
        ],
        topocentric: { elevationDeg: 45.0, azimuthDeg: 120.0, isVisible: true, horizonMaskDeg: 10.0 },
      },
    ],
    activeStationId: 'gdscc',
    lunarTrackingSummary: {
      activeLunarDishes: 1,
      trackedSpacecraft: ['LRO'],
      primaryTrackingDish: 'DSS-14 (70m)',
      downlinkBand: 'X-Band',
      linkMarginDb: 11.2,
      linkState: 'locked',
    },
    provenance: {
      source: 'https://eyes.nasa.gov/dsn/data/dsn.xml',
      endpoint: '/api/telemetry/dsn',
      cached: false,
      cacheTtlSeconds: 10,
    },
  };

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify(mockLiveResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    let capturedState!: ReturnType<typeof useDsnTelemetry>;
    const Harness = () => {
      capturedState = useDsnTelemetry();
      return <div>{capturedState.telemetry.stations.length}</div>;
    };

    renderToStaticMarkup(<Harness />);
    assert.ok(capturedState);
    assert.equal(typeof capturedState.refresh, 'function');

    await capturedState.refresh();
    assert.equal(capturedState.isLive, true);
    assert.equal(capturedState.source, 'nextrush_server');
    assert.equal(capturedState.status, 'valid');
    assert.equal(capturedState.telemetry.lunarTrackingSummary.linkMarginDb, 11.2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
