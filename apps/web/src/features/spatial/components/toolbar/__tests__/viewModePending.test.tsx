import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ViewModeSelector } from '../ViewModeSelector';
import { GlobeLoadingOverlay } from '../../../globe/components/GlobeStatusOverlay';

test('view mode selector marks the active mode busy while the globe scene loads', () => {
  const pending = renderToStaticMarkup(
    <ViewModeSelector viewMode="globe3d" onViewModeChange={() => {}} globePending />,
  );
  assert.ok(pending.includes('aria-busy="true"'), 'active mode button must expose aria-busy while pending');

  const settled = renderToStaticMarkup(
    <ViewModeSelector viewMode="globe3d" onViewModeChange={() => {}} globePending={false} />,
  );
  assert.ok(!settled.includes('aria-busy'), 'no aria-busy once the globe is ready');

  // Inactive buttons never read as busy, even while the globe loads.
  const pendingIn2d = renderToStaticMarkup(
    <ViewModeSelector viewMode="map2d" onViewModeChange={() => {}} globePending />,
  );
  assert.ok(!pendingIn2d.includes('aria-busy="true"'), 'only the active mode button may read as busy');
});

test('globe loading overlay is an announced status region', () => {
  const html = renderToStaticMarkup(<GlobeLoadingOverlay />);
  assert.ok(html.includes('role="status"'), 'overlay must be a status region');
  assert.ok(html.toLowerCase().includes('loading'), 'overlay must state that loading is in progress');
});
