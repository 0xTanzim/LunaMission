import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';
import { PassportDock, PassportSection } from '../PassportDock';

function renderSection(defaultOpen?: boolean, summary?: string) {
  return renderToStaticMarkup(
    React.createElement(PassportSection, {
      title: 'Site Identity',
      definition: 'd',
      defaultOpen,
      summary,
      children: React.createElement('p', null, 'SECTION-BODY'),
    }),
  );
}

test('PassportSection: defaults to collapsed with summary visible and body hidden', () => {
  const html = renderSection(undefined, 'SITE-002 · +3,820 m');
  assert.ok(html.includes('aria-expanded="false"'), 'toggle must announce collapsed state');
  assert.ok(!html.includes('SECTION-BODY'), 'collapsed section must not render its body');
  assert.ok(html.includes('SITE-002 · +3,820 m'), 'collapsed header must keep the at-a-glance summary');
});

test('PassportSection: defaultOpen renders the body expanded', () => {
  const html = renderSection(true, 'SITE-002 · +3,820 m');
  assert.ok(html.includes('aria-expanded="true"'), 'toggle must announce expanded state');
  assert.ok(html.includes('SECTION-BODY'), 'open section must render its body');
  assert.ok(!html.includes('SITE-002 · +3,820 m'), 'summary is redundant while the body is visible');
});

test('PassportDock: only the illumination section opens by default so the dock fits without scrolling', () => {
  const html = renderToStaticMarkup(
    React.createElement(ScenarioProvider, null, React.createElement(PassportDock, { onOpenMethodDetails: () => {} })),
  );

  const expanded = html.match(/aria-expanded="true"/g)?.length ?? 0;
  assert.equal(expanded, 1, 'exactly one passport section should be expanded by default');

  // The sun answer is the core mission question and stays at a glance:
  assert.ok(html.includes('Illumination Intelligence'));
  assert.ok(html.includes('Sun Elevation'), 'illumination body renders by default');
  // Heavy reference detail collapses behind one click instead of forcing three screens of scroll:
  assert.ok(!html.includes('Astronaut EVA'), 'site identity detail must not render while collapsed');
  assert.ok(!html.includes('One-Way Light Time'), 'earth detail must not render while collapsed');
  assert.ok(!html.includes('Explore 360° Horizon Radar'), 'terrain detail must not render while collapsed');

  // Calculation mode toggle remains visible outside collapsed Site Identity section:
  assert.ok(html.includes('Terrain-Aware'), 'Terrain-Aware button must remain visible when Site Identity is collapsed');
  assert.ok(html.includes('Geometry-Only'), 'Geometry-Only button must remain visible when Site Identity is collapsed');
  assert.ok(html.includes('aria-pressed="true"'), 'Active mode button must expose aria-pressed="true"');
});

test('PassportSiteHeader: does not embed Terrain-Aware / Geometry-Only toggle inside Site Identity', () => {
  const { PassportSiteHeader } = require('@/features/passport/ui');
  const html = renderToStaticMarkup(
    React.createElement(ScenarioProvider, null, React.createElement(PassportSiteHeader)),
  );
  assert.ok(!html.includes('Terrain-Aware'), 'Site Identity header must not own Terrain-Aware toggle');
  assert.ok(!html.includes('Geometry-Only'), 'Site Identity header must not own Geometry-Only toggle');
});
