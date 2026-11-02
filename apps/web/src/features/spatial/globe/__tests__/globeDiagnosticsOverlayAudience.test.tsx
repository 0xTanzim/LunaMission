import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobeDiagnosticsOverlay } from '../components/GlobeDiagnosticsOverlay';
import { GlobeDiagnosticsMetrics } from '../scene/globeSceneBuilderTypes';
import { CANDIDATE_SITES } from '@luna/contracts';

/** Task 5.3: flyover progress feedback + explicit audience labeling on the diagnostics panel. */

const baseMetrics: GlobeDiagnosticsMetrics = {
  fps: 60, frameTimeMs: 16.6, frameTimeP95Ms: 18.2, drawCalls: 42, triangles: 120000,
  cameraDistance: 2.2, cameraTargetDistance: 0.3, cameraNear: 0.05,
  pixelRatio: 1, isSoftwareGl: false,
};

const site = CANDIDATE_SITES[0]!;
const render = (getDiagnostics: () => GlobeDiagnosticsMetrics | null) =>
  renderToStaticMarkup(
    React.createElement(GlobeDiagnosticsOverlay, {
      getDiagnostics, selectedSite: site, isVisible: true,
    }),
  );

test('diagnostics: shows the flyover orbit progress while the auto-orbit is active', () => {
  const html = render(() => ({ ...baseMetrics, flyoverOrbitDeg: 42 }));
  assert.ok(html.includes('42° / 360°'), 'flyover progress row must show the accumulated angle');
  assert.ok(html.includes('auto-circling'), 'progress must describe what the camera is doing');
});

test('diagnostics: omits the flyover row when the auto-orbit is off', () => {
  const html = render(() => baseMetrics);
  assert.ok(!html.includes('Flyover Orbit'), 'no flyover row when flyover is disabled');
});

test('diagnostics: states its audience and disclaims flight telemetry', () => {
  const html = render(() => baseMetrics);
  assert.ok(html.includes('Audience: engineering review'), 'audience label present');
  assert.ok(html.includes('not spacecraft telemetry'), 'must disclaim flight telemetry');
});
