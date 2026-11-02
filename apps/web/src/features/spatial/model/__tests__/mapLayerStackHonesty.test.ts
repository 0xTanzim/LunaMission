import test from 'node:test';
import assert from 'node:assert/strict';
import { MAP_BASE_LAYERS } from '../mapLayerStack';

/**
 * Task 5.2: analytical hillshade and time-dependent illumination are distinct
 * presentation modes with distinct labels, and neither is ever worded as
 * measured light. The hillshade's unit must not describe it as an illumination
 * factor, and the illumination layer must disclose its static-model nature.
 */

const hillshade = MAP_BASE_LAYERS.find((l) => l.id === 'hillshade')!;
const illumination = MAP_BASE_LAYERS.find((l) => l.id === 'illumination')!;

test('layer stack: hillshade is labeled analytical and never as an illumination factor', () => {
  assert.match(hillshade.label, /[Aa]nalytical/, 'hillshade label must say analytical');
  assert.doesNotMatch(hillshade.unit + ' ' + hillshade.quantity, /illumination factor/i,
    'hillshade unit must not describe an illumination factor');
  assert.match(hillshade.instrument, /not lunar illumination|not illumination|artificial/i,
    'hillshade instrument must disclose the artificial fixed sun');
});

test('layer stack: hillshade instrument states the fixed sun geometry used by the sampler', () => {
  assert.match(hillshade.instrument, /1\.5°/, 'sampler uses sun elevation 1.5° — metadata must match');
  assert.match(hillshade.instrument, /45°/, 'sampler uses sun azimuth 45° — metadata must match');
});

test('layer stack: illumination discloses its static model nature and is distinct from hillshade', () => {
  assert.notEqual(hillshade.label, illumination.label, 'the two relief/light modes need distinct labels');
  assert.match(illumination.label + ' ' + illumination.quantity, /model/i, 'illumination must say model');
  assert.match(illumination.instrument + ' ' + illumination.quantity, /not time-dependent|static/i,
    'illumination must disclose it is not time-dependent');
  assert.doesNotMatch(illumination.instrument, /measured/i, 'illumination must not claim measured light');
});
