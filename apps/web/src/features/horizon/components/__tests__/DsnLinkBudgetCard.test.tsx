import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DsnLinkBudgetCard } from '../DsnLinkBudgetCard';

test('DsnLinkBudgetCard renders DSN 810-005 Top noise and ITU-R P.526-16 diffraction metrics', () => {
  const html = renderToStaticMarkup(
    React.createElement(DsnLinkBudgetCard, {
      siteId: 'shackleton-rim',
      epochMs: Date.UTC(2026, 9, 26, 12, 0, 0),
      earthDistanceKm: 384400,
      earthElevationDeg: 8.5,
      isObstructed: false,
    })
  );

  assert.ok(html.includes('NASA Deep Space Network (DSN) &amp; RF Link Budget'), 'Header must render');
  assert.ok(html.includes('DSN 810-005 T_op:'), 'Card must render DSN 810-005 Top noise temperature');
  assert.ok(html.includes('ITU-R P.526-16'), 'Card must render ITU-R P.526-16 diffraction indicator');
  assert.ok(html.includes('ANALYTICAL BASELINE') || html.includes('LIVE NASA DSN'), 'Telemetry source badge must render');
  assert.ok(html.includes('GOLDSTONE'), 'Goldstone station box must render');
  assert.ok(html.includes('MADRID'), 'Madrid station box must render');
  assert.ok(html.includes('CANBERRA'), 'Canberra station box must render');
});
