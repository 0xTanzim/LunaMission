import test from 'node:test';
import assert from 'node:assert/strict';
import { NASA_SVS_LEGEND_TICKS } from '../../../../domain/terrain/nasaSvsColorRamp';
import { getNasaSvsElevationLegendGradient } from '../components/NasaSvsElevationLegend';

test('NasaSvsElevationLegend: constructs a valid CSS linear-gradient string spanning -9km to +9km palette', () => {
  const gradient = getNasaSvsElevationLegendGradient();
  assert.ok(gradient.includes('linear-gradient'));
  assert.ok(gradient.includes('#2b0057')); // Lowest stop (-9000m)
  assert.ok(gradient.includes('#4fd33e')); // Datum stop (0m)
  assert.ok(gradient.includes('#f060c0')); // Highest stop (+9000m)
});

test('NasaSvsElevationLegend: exposes all 9 standard NASA SVS 3727 elevation ticks (-8 km to +8 km)', () => {
  assert.equal(NASA_SVS_LEGEND_TICKS.length, 9);
  assert.deepEqual(
    NASA_SVS_LEGEND_TICKS.map((t) => t.km),
    [-8, -6, -4, -2, 0, 2, 4, 6, 8]
  );
});
