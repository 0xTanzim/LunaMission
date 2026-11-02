import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CANDIDATE_SITES } from '@luna/contracts';
import { generateTopocentricHorizonRadar } from '@/domain/celestial/horizonProfile';
import { HorizonClearanceTelemetry } from '../components/HorizonClearanceTelemetry';
import { HorizonMastControlBar } from '../components/HorizonMastControlBar';
import { DsnLinkBudgetCard } from '../components/DsnLinkBudgetCard';

const epochMs = Date.UTC(2026, 9, 26, 12, 0, 0);
const site = CANDIDATE_SITES[0]!;
const radar = generateTopocentricHorizonRadar(site, new Date(epochMs), 'geometry-only');

/**
 * Observable-honesty guards for the horizon workspace.
 * Invariants under test: geometric Earth visibility is not an RF link budget, and solar-disk
 * visibility is not generated electrical power (lunar-landing-site-science SKILL.md).
 */

test('Horizon clearance telemetry: Earth readout is geometric line-of-sight, never "Direct Link"', () => {
  const html = renderToStaticMarkup(
    React.createElement(HorizonClearanceTelemetry, {
      currentSun: radar.currentSun,
      currentEarth: radar.currentEarth,
    }),
  );

  const lower = html.toLowerCase();
  assert.ok(lower.includes('geometric line of sight'), 'Earth card must name the geometric observable');
  assert.ok(!html.includes('Direct Link'), 'a clear path must not be presented as an established link');
  assert.ok(!lower.includes('guaranteed') && !lower.includes('assured'));
});

test('Horizon mast control: solar penumbra value is labelled as a disk fraction, not power', () => {
  const html = renderToStaticMarkup(
    React.createElement(HorizonMastControlBar, {
      mastHeightMeters: 2,
      onMastHeightChange: () => undefined,
      solarFraction: 0.42,
    }),
  );
  assert.ok(html.includes('not generated electrical power'), 'disk fraction must not imply watts');
  assert.ok(html.includes('42.0%'));
});

test('DSN card: title keeps the RF budget wording while separating it from geometric visibility', () => {
  const html = renderToStaticMarkup(
    React.createElement(DsnLinkBudgetCard, {
      siteId: site.id,
      epochMs,
      earthDistanceKm: 384400,
      earthElevationDeg: 8.5,
      isObstructed: false,
    }),
  );

  const lower = html.toLowerCase();
  assert.ok(html.includes('RF Link Budget'), 'existing RF budget labelling is preserved');
  assert.ok(lower.includes('rf estimate'), 'card must state that the figures are modelled');
  assert.ok(lower.includes('geometric line-of-sight'), 'card must name the separate geometric observable');
  assert.ok(lower.includes('not an rf link budget'), 'card must state that geometry is not a link budget');
  assert.ok(lower.includes('link closure'), 'card must not claim link closure from clear geometry');
  assert.ok(!html.includes('DSN Carrier Locked'), 'a modelled margin is not an observed carrier lock');
  assert.ok(!html.includes('Loss of Signal (LOS)'), '"LOS" must not be used for loss of signal');
  assert.ok(!html.includes('0 dB (LOS)'));
  assert.ok(!html.includes('(Clear)'), 'a zero modelled loss must not be labelled "Clear"');
  assert.ok(!lower.includes('guaranteed') && !lower.includes('assured'));
});

test('DSN card: an uncomputed budget never renders a placeholder margin', () => {
  const html = renderToStaticMarkup(
    React.createElement(DsnLinkBudgetCard, {
      siteId: site.id,
      epochMs,
      earthDistanceKm: 384400,
      earthElevationDeg: -0.5,
      isObstructed: true,
    }),
  );

  assert.ok(
    html.includes('RF Margin Pending'),
    'before the API answers the margin must read as pending, not pass or fail',
  );
  assert.ok(html.includes('Not computed'), 'metric tiles must not show placeholder numbers');
  assert.ok(html.includes('No placeholder margin is shown'));
  assert.ok(!html.includes('(LOS)'), '"LOS" must never appear as a link-state label');
  assert.ok(!html.includes('DSN Carrier Locked'));
});
