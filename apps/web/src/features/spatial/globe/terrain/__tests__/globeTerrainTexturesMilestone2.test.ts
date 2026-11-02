import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_SITES } from '@luna/contracts';
import { createLocalScientificTexture } from '../globeTerrainTextures';
import { getNasaSvsElevationRgb } from '@/domain/terrain/nasaSvsColorRamp';
import { sampleTerrainAtLatLon } from '../lolaSouthPoleDemSampler';

test('globeTerrainTextures: topography mode renders NASA SVS 3727 false color', () => {
  const site = CANDIDATE_SITES[0]; // Connecting Ridge
  const texture = createLocalScientificTexture(site, 'topography', 50.0);

  assert.ok(texture);
  const data = texture.image.data;
  assert.ok(data, 'Texture data must exist');
  assert.equal(data.length, 128 * 128 * 4);

  // Center pixel corresponds to site coordinates
  const centerSample = sampleTerrainAtLatLon(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg);
  const expectedRgb = getNasaSvsElevationRgb(centerSample.elevationMeters);

  // Center pixel in 128x128 texture
  const centerIdx = (64 * 128 + 64) * 4;
  const centerPixelRgb = [data[centerIdx], data[centerIdx + 1], data[centerIdx + 2]];

  assert.ok(
    Math.abs(centerPixelRgb[0] - expectedRgb[0]) < 20 &&
    Math.abs(centerPixelRgb[1] - expectedRgb[1]) < 20 &&
    Math.abs(centerPixelRgb[2] - expectedRgb[2]) < 20,
    `Topography texture should follow NASA SVS palette. Got [${centerPixelRgb}], expected [${expectedRgb}]`,
  );
});

test('globeTerrainTextures: volatiles mode generates authentic LEND neutron overlay', () => {
  const site = CANDIDATE_SITES[0];
  const texture = createLocalScientificTexture(site, 'volatiles', 50.0);

  assert.ok(texture);
  const data = texture.image.data;
  assert.ok(data, 'Texture data must exist');
  assert.equal(data.length, 128 * 128 * 4);

  // Verify that it is NOT the default gray fallback [172, 170, 168]
  let hasNonGrayPixel = false;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r !== 172 || g !== 170 || b !== 168) {
      hasNonGrayPixel = true;
      break;
    }
  }

  assert.ok(hasNonGrayPixel, 'Volatiles mode must not fall back to gray regolith');
});

test('globeTerrainTextures: temperature mode generates authentic Diviner thermal overlay', () => {
  const site = CANDIDATE_SITES[0];
  const texture = createLocalScientificTexture(site, 'temperature', 50.0);

  assert.ok(texture);
  const data = texture.image.data;
  assert.ok(data, 'Texture data must exist');
  assert.equal(data.length, 128 * 128 * 4);

  // Verify that it is NOT the default gray fallback [172, 170, 168]
  let hasNonGrayPixel = false;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r !== 172 || g !== 170 || b !== 168) {
      hasNonGrayPixel = true;
      break;
    }
  }

  assert.ok(hasNonGrayPixel, 'Temperature mode must not fall back to gray regolith');
});
