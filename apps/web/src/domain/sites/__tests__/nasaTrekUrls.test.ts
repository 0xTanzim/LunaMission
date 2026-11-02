import test from 'node:test';
import assert from 'node:assert/strict';
import { getNasaLunarTrekUrl, getLrocQuickMapUrl } from '../nasaTrekUrls';

test('getNasaLunarTrekUrl: generates parameterized NASA Lunar Trek Web GIS link', () => {
  // Shackleton Crater Rim (-89.9°S, 0.0°E)
  const shackletonUrl = getNasaLunarTrekUrl(-89.9, 0.0, 8);
  assert.ok(shackletonUrl.startsWith('https://trek.nasa.gov/moon/#'));
  assert.ok(shackletonUrl.includes('x=0.0000'));
  assert.ok(shackletonUrl.includes('y=-89.9000'));
  assert.ok(shackletonUrl.includes('z=8'));
  assert.ok(shackletonUrl.includes('p=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A104903'));

  // Chang'e 6 Far Side (-41.64°S, 206.01°E)
  const change6Url = getNasaLunarTrekUrl(-41.64, 206.01);
  assert.ok(change6Url.includes('x=206.0100'));
  assert.ok(change6Url.includes('y=-41.6400'));
  assert.ok(change6Url.includes('z=7')); // default zoom is 7
});

test('getLrocQuickMapUrl: generates parameterized LROC QuickMap archive link', () => {
  const qmUrl = getLrocQuickMapUrl(-89.9, 0.0);
  assert.ok(qmUrl.startsWith('https://quickmap.lroc.asu.edu/'));
  assert.ok(qmUrl.includes('center=0.0000,-89.9000'));
});
