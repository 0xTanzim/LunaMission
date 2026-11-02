import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ScientificMapLegend } from '@/features/spatial/map/components/ScientificMapLegend';

describe('DEF-07: ScientificMapLegend Accessibility (legendA11y.test.ts)', () => {
  test('select element for scientific map layer has accessible aria-label', () => {
    const html = renderToString(
      React.createElement(ScientificMapLegend, {
        mode: 'topography',
        onSelectMode: () => {},
      })
    );

    // Axe-core requires form controls to have accessible name
    expect(html).toContain('data-testid="select-scientific-layer"');
    expect(html).toContain('aria-label="Select Scientific Map Product Layer"');
  });
});
