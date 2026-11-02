import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ElevationContourLayer } from '../layers/ElevationContourLayer';
import { ScientificProvenanceBadge } from '../components/ScientificProvenanceBadge';
import { ScientificMapLegend } from '../components/ScientificMapLegend';
import { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import { NASA_SVS_POLAR_LEGEND_TICKS } from '@/domain/terrain/nasaSvsColorRamp';

test('ElevationContourLayer: renders SVG elevation contour paths when visible is true', () => {
  const html = renderToStaticMarkup(
    <svg viewBox="0 0 600 600">
      <ElevationContourLayer visible={true} zoom={1.5} />
    </svg>
  );

  assert.ok(html.includes('elevation-contour-layer'), 'Layer group must be rendered');
  assert.ok(html.includes('circle'), 'Contour circles must be present');
  assert.ok(html.includes('elevation-contour-scale-bar'), 'Contour scale bar must be rendered');
  assert.ok(html.includes('CONTOURS: 1,000m'), 'Scale bar label must be present');
});

test('ElevationContourLayer: returns null when visible is false', () => {
  const html = renderToStaticMarkup(
    <svg viewBox="0 0 600 600">
      <ElevationContourLayer visible={false} zoom={1.0} />
    </svg>
  );

  assert.equal(html, '<svg viewBox="0 0 600 600"></svg>');
});

test('ScientificProvenanceBadge: displays sensor, resolution, IAU 2000 ME, and credits across all modes', () => {
  const modes: ScientificMapLayerMode[] = [
    'topography',
    'slope',
    'volatiles',
    'temperature',
    'illumination',
    'geology',
    'hillshade',
    'none',
  ];

  for (const mode of modes) {
    const html = renderToStaticMarkup(<ScientificProvenanceBadge mode={mode} />);
    assert.ok(html.includes('layer-provenance-badge'), `Mode ${mode} must render provenance badge`);
    assert.ok(html.includes('IAU 2000 ME'), `Mode ${mode} must reference IAU 2000 ME frame`);
    assert.ok(html.includes('Credits:'), `Mode ${mode} must display credits`);
  }
});

test('ScientificMapLegend: displays NASA SVS 3727 ramp in topography mode and includes provenance badge', () => {
  const html = renderToStaticMarkup(
    <ScientificMapLegend mode="topography" onSelectMode={() => {}} />
  );

  assert.ok(html.includes('NASA SVS 3727'), 'Legend must cite NASA SVS 3727 ramp');
  // The legend must describe the domain actually painted, not a hardcoded global span. The polar
  // sheet holds roughly -4.2..+4.6 km, so labelling it -9,000..+9,000 m would mislabel every pixel.
  assert.ok(html.includes('south-polar display domain'), 'Legend must declare the polar display domain');
  assert.ok(!html.includes('-9,000 m (Basin)'), 'Legend must not claim the global elevation span');
  assert.ok(!html.includes('+9,000 m (Highlands)'), 'Legend must not claim the global elevation span');
  for (const tick of [NASA_SVS_POLAR_LEGEND_TICKS[0]!, NASA_SVS_POLAR_LEGEND_TICKS[4]!]) {
    assert.ok(html.includes(tick.label), `Legend must show the painted domain endpoint ${tick.label}`);
  }
  assert.ok(html.includes('layer-provenance-badge'), 'Legend must include provenance badge');
  assert.ok(html.includes('LRO LOLA Laser Altimeter'), 'Legend must state LOLA instrument');
});

test('ScientificMapLegend: displays >=15° hazard threshold in slope mode and includes provenance badge', () => {
  const html = renderToStaticMarkup(
    <ScientificMapLegend mode="slope" onSelectMode={() => {}} />
  );

  assert.ok(html.includes('&ge;15° Hazard') || html.includes('≥15° Hazard'), 'Must show >=15° Hazard');
  assert.ok(html.includes('Tip-Over Limit (≥15°)'), 'Must state tip-over limit');
  assert.ok(html.includes('layer-provenance-badge'), 'Legend must include provenance badge');
  assert.ok(html.includes('Artemis III'), 'Legend must display Artemis III credit badge');
});
