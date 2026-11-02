import test from 'node:test';
import assert from 'node:assert/strict';
import { getNasaSvsElevationNormalizedRgb } from '../../../../domain/terrain/nasaSvsColorRamp';
import { generateSvsFalseColorPixels } from '../scene/globeSurfaceMaterial';

test('globeSurfaceMaterial: maps 8-bit heightmap pixels to the NASA SVS 3727 color ramp correctly', () => {
  // 4 pixels: black (0), dark gray (64), mid gray (128), white (255)
  const inputPixels = new Uint8ClampedArray([
    0, 0, 0, 255,
    64, 64, 64, 255,
    128, 128, 128, 255,
    255, 255, 255, 255,
  ]);

  const output = generateSvsFalseColorPixels(inputPixels);
  assert.equal(output.length, 16);

  // Pixel 0 (elevation 0% -> -9000m): Deep purple
  const minColor = getNasaSvsElevationNormalizedRgb(0);
  assert.equal(output[0], minColor[0]);
  assert.equal(output[1], minColor[1]);
  assert.equal(output[2], minColor[2]);
  assert.equal(output[3], 255);

  // Pixel 3 (elevation 100% -> +9000m): Magenta/white
  const maxColor = getNasaSvsElevationNormalizedRgb(1.0);
  assert.equal(output[12], maxColor[0]);
  assert.equal(output[13], maxColor[1]);
  assert.equal(output[14], maxColor[2]);
  assert.equal(output[15], 255);
});
