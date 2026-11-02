import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobeLegend } from '../GlobeLegend';

function renderLegend(showPsr?: boolean) {
  return renderToStaticMarkup(
    React.createElement(GlobeLegend, {
      earthElevationDisplay: '+3.2° elev',
      isCompact: true,
      showPsr,
    }),
  );
}

test('globe legend: compact PSR chip labels the footprint as modeled', () => {
  const html = renderLegend(true);
  assert.ok(html.includes('PSR (modeled footprint)'), 'compact legend must include the PSR chip');
  assert.ok(html.includes('repeating-linear-gradient'), 'chip swatch must use the hatch pattern');
});

test('globe legend: PSR chip omitted when the overlay is off', () => {
  assert.equal(renderLegend(false).includes('PSR'), false);
});
