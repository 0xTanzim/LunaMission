import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';
import { TemporalExplorerDock } from '../TemporalExplorerDock';

test('TemporalExplorerDock: opens expanded on the home page so the time series is the default reading', () => {
  const html = renderToStaticMarkup(
    React.createElement(ScenarioProvider, null, React.createElement(TemporalExplorerDock)),
  );

  const toggle = html.match(/<button[^>]*aria-label="Time Explorer"[^>]*>/)?.[0] ?? '';
  assert.ok(toggle.includes('aria-expanded="true"'), 'the dock must start expanded on first render');
  assert.ok(html.includes('topocentric elevation series'), 'the expanded panel body must render by default');
});
