import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScientificMapLegend } from '../components/ScientificMapLegend';
import { NASA_SVS_POLAR_DOMAIN } from '@/domain/terrain/nasaSvsColorRamp';

const collapsed = (mode: 'topography' | 'volatiles' | 'slope') =>
  renderToStaticMarkup(
    <ScientificMapLegend mode={mode} onSelectMode={() => {}} initialExpanded={false} />,
  );

test('collapsed topography legend still states the painted domain', () => {
  const html = collapsed('topography');
  assert.ok(html.includes('data-testid="legend-collapsed-scale"'));
  assert.ok(html.includes('south-polar domain'));
  assert.ok(html.includes(`${(NASA_SVS_POLAR_DOMAIN.minMeters / 1000).toFixed(1)} km`));
  assert.ok(html.includes(`+${(NASA_SVS_POLAR_DOMAIN.maxMeters / 1000).toFixed(1)} km`));
  // The map is most often viewed closed; a hidden scale leaves the colours uninterpretable.
  assert.ok(!html.includes('-9,000'), 'collapsed legend must not imply the global span');
});

test('collapsed non-quantitative layers point the user at the scale without inventing one', () => {
  for (const mode of ['volatiles', 'slope'] as const) {
    const html = collapsed(mode);
    assert.ok(html.includes('Expand for scale'), `${mode} must invite expanding the legend`);
    assert.ok(!html.includes('data-testid="legend-collapsed-scale"'));
  }
});
