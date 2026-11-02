import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NASA_SVS_COLOR_STOPS,
  NASA_SVS_LEGEND_TICKS,
  getNasaSvsElevationHex,
  getNasaSvsElevationNormalizedRgb,
  getNasaSvsElevationRgb,
} from '../nasaSvsColorRamp';

test('nasaSvsColorRamp: defines exactly 16 color stops spanning -9000m to +9000m', () => {
  assert.equal(NASA_SVS_COLOR_STOPS.length, 16);
  assert.equal(NASA_SVS_COLOR_STOPS[0].elevationMeters, -9000);
  assert.equal(NASA_SVS_COLOR_STOPS[15].elevationMeters, 9000);

  for (let i = 1; i < NASA_SVS_COLOR_STOPS.length; i++) {
    assert.ok(
      NASA_SVS_COLOR_STOPS[i].elevationMeters > NASA_SVS_COLOR_STOPS[i - 1].elevationMeters,
      'Stops must be strictly monotonically increasing'
    );
  }
});

test('nasaSvsColorRamp: interpolates RGB values correctly across key elevation anchors', () => {
  const minRgb = getNasaSvsElevationRgb(-9000);
  assert.deepEqual(minRgb, [NASA_SVS_COLOR_STOPS[0].rgb[0], NASA_SVS_COLOR_STOPS[0].rgb[1], NASA_SVS_COLOR_STOPS[0].rgb[2]]);

  const maxRgb = getNasaSvsElevationRgb(9000);
  assert.deepEqual(maxRgb, [NASA_SVS_COLOR_STOPS[15].rgb[0], NASA_SVS_COLOR_STOPS[15].rgb[1], NASA_SVS_COLOR_STOPS[15].rgb[2]]);

  const datumRgb = getNasaSvsElevationRgb(0);
  const datumStop = NASA_SVS_COLOR_STOPS.find((s) => s.elevationMeters === 0);
  assert.ok(datumStop !== undefined);
  assert.deepEqual(datumRgb, [datumStop!.rgb[0], datumStop!.rgb[1], datumStop!.rgb[2]]);
});

test('nasaSvsColorRamp: clamps out-of-range elevations to the extreme stops', () => {
  const belowMin = getNasaSvsElevationRgb(-15000);
  assert.deepEqual(belowMin, [NASA_SVS_COLOR_STOPS[0].rgb[0], NASA_SVS_COLOR_STOPS[0].rgb[1], NASA_SVS_COLOR_STOPS[0].rgb[2]]);

  const aboveMax = getNasaSvsElevationRgb(15000);
  assert.deepEqual(aboveMax, [NASA_SVS_COLOR_STOPS[15].rgb[0], NASA_SVS_COLOR_STOPS[15].rgb[1], NASA_SVS_COLOR_STOPS[15].rgb[2]]);
});

test('nasaSvsColorRamp: generates valid hex strings', () => {
  const hex = getNasaSvsElevationHex(0);
  assert.match(hex, /^#[0-9a-fA-F]{6}$/);
});

test('nasaSvsColorRamp: maps normalized grayscale [0, 1] to the NASA SVS spectrum', () => {
  const minNorm = getNasaSvsElevationNormalizedRgb(0);
  assert.deepEqual(minNorm, [NASA_SVS_COLOR_STOPS[0].rgb[0], NASA_SVS_COLOR_STOPS[0].rgb[1], NASA_SVS_COLOR_STOPS[0].rgb[2]]);

  const maxNorm = getNasaSvsElevationNormalizedRgb(1);
  assert.deepEqual(maxNorm, [NASA_SVS_COLOR_STOPS[15].rgb[0], NASA_SVS_COLOR_STOPS[15].rgb[1], NASA_SVS_COLOR_STOPS[15].rgb[2]]);

  const midNorm = getNasaSvsElevationNormalizedRgb(0.5);
  assert.ok(midNorm[0] >= 0 && midNorm[0] <= 255);
});

test('nasaSvsColorRamp: provides official NASA SVS 3727 legend scale bar ticks (-8 km to +8 km)', () => {
  assert.equal(NASA_SVS_LEGEND_TICKS.length, 9);
  assert.equal(NASA_SVS_LEGEND_TICKS[0].km, -8);
  assert.equal(NASA_SVS_LEGEND_TICKS[4].km, 0);
  assert.equal(NASA_SVS_LEGEND_TICKS[8].km, 8);
});
