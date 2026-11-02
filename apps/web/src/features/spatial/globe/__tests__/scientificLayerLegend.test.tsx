import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScientificLayerLegend } from '../components/ScientificLayerLegend';
import type { ScientificMapLayerMode } from '../../model/spatialPreferences';

/**
 * Task 5.1: the legend must follow the active scientific layer — semantics,
 * units and thresholds of the layer actually painted — and must disappear in
 * natural mode ('none'). Honesty invariants: derived/model surfaces say so and
 * the analytical hillshade is never presented as lunar illumination.
 */

function renderMode(mode: ScientificMapLayerMode): string {
  return renderToStaticMarkup(React.createElement(ScientificLayerLegend, { mode }));
}

test('legend: renders nothing in natural mode and defers topography to the SVS legend', () => {
  assert.equal(renderMode('none'), '', 'natural mode hides the scientific legend');
  assert.equal(renderMode('topography'), '', 'topography keeps its dedicated SVS legend');
});

test('legend: slope mode shows degrees, all four bins and the 15° hazard threshold', () => {
  const html = renderMode('slope');
  // NB: renderToStaticMarkup escapes "<", so bin bounds are asserted via labels.
  for (const marker of ['deg', 'safe', 'moderate', 'caution', 'hazard', '15°', 'derived']) {
    assert.ok(html.toLowerCase().includes(marker.toLowerCase()), `slope legend missing "${marker}"`);
  }
});

test('legend: hillshade is labeled analytical with the fixed 45° artificial sun, never illumination', () => {
  const html = renderMode('hillshade').toLowerCase();
  assert.ok(html.includes('analytical'), 'hillshade must say analytical');
  assert.ok(html.includes('45°'), 'hillshade must state its artificial sun geometry');
  assert.ok(!html.includes('solar illumination') && !html.includes('sunlight'), 'hillshade must not claim real sunlight');
});

test('legend: illumination mode states the static model limitation, not measured light', () => {
  const html = renderMode('illumination').toLowerCase();
  assert.ok(html.includes('model') || html.includes('derived'), 'illumination must disclose its model nature');
  assert.ok(html.includes('not') && html.includes('time-dependent'), 'illumination must disclaim time-dependence');
});

test('legend: temperature mode shows kelvin and the 110 K ice-stability threshold', () => {
  const html = renderMode('temperature');
  assert.ok(html.includes('K'), 'temperature legend must state kelvin');
  assert.ok(html.includes('110'), 'temperature legend must show the 110 K water-ice stability threshold');
});

test('legend: volatiles mode shows neutron-flux units and model provenance', () => {
  const html = renderMode('volatiles').toLowerCase();
  assert.ok(html.includes('cps'), 'volatiles legend must state counts-per-second units');
  assert.ok(html.includes('lend') || html.includes('model'), 'volatiles legend must cite the neutron model');
});

test('legend: geology mode lists the unit classes with a derived-model note', () => {
  const html = renderMode('geology').toLowerCase();
  assert.ok(html.includes('derived'), 'geology must disclose the analytic unit model');
  assert.ok(html.includes('psr'), 'geology legend should include the PSR class');
});
