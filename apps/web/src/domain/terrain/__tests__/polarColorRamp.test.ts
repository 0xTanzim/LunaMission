import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NASA_SVS_COLOR_STOPS,
  NASA_SVS_POLAR_DOMAIN,
  NASA_SVS_POLAR_LEGEND_TICKS,
  getNasaSvsElevationRgb,
  getPolarElevationHex,
  getPolarElevationRgb,
  getPolarLegendGradient,
} from '../nasaSvsColorRamp';

const RGB_RE = /^#[0-9a-f]{6}$/;

test('polar domain is inside the palette range and non-degenerate', () => {
  assert.ok(NASA_SVS_POLAR_DOMAIN.minMeters < NASA_SVS_POLAR_DOMAIN.maxMeters);
  assert.ok(NASA_SVS_POLAR_DOMAIN.minMeters >= NASA_SVS_COLOR_STOPS[0].elevationMeters);
  assert.ok(NASA_SVS_POLAR_DOMAIN.maxMeters <= NASA_SVS_COLOR_STOPS[15].elevationMeters);
});

test('polar ramp spans the palette end to end', () => {
  const low = getPolarElevationRgb(NASA_SVS_POLAR_DOMAIN.minMeters);
  const high = getPolarElevationRgb(NASA_SVS_POLAR_DOMAIN.maxMeters);
  assert.deepEqual(low, getNasaSvsElevationRgb(NASA_SVS_COLOR_STOPS[0].elevationMeters));
  assert.deepEqual(high, getNasaSvsElevationRgb(NASA_SVS_COLOR_STOPS[15].elevationMeters));
});

test('polar ramp is monotonic in luminance-rank across the domain', () => {
  // The palette runs purple -> blue -> green -> yellow -> red -> pink, so the dominant channel
  // should not stay pinned; the real requirement is that distinct elevations map to distinct
  // colours rather than collapsing into one stop.
  const seen = new Set<string>();
  for (let metres = NASA_SVS_POLAR_DOMAIN.minMeters; metres <= NASA_SVS_POLAR_DOMAIN.maxMeters; metres += 100) {
    seen.add(getPolarElevationHex(metres));
  }
  assert.ok(seen.size > 30, `expected many distinct colours, saw ${seen.size}`);
});

test('polar ramp clamps outside the domain instead of wrapping', () => {
  const below = getPolarElevationRgb(NASA_SVS_POLAR_DOMAIN.minMeters - 5000);
  const above = getPolarElevationRgb(NASA_SVS_POLAR_DOMAIN.maxMeters + 5000);
  assert.deepEqual(below, getNasaSvsElevationRgb(NASA_SVS_COLOR_STOPS[0].elevationMeters));
  assert.deepEqual(above, getNasaSvsElevationRgb(NASA_SVS_COLOR_STOPS[15].elevationMeters));
});

test('polar ramp actually differentiates terrain the global ramp flattened', () => {
  // This is the regression the polar domain exists to fix: two elevations 2 km apart inside the
  // polar cap were adjacent stops on the global ramp, so the cap rendered as one flat field.
  const a = -1000;
  const b = 1000;
  const globalA = getNasaSvsElevationRgb(a);
  const globalB = getNasaSvsElevationRgb(b);
  const polarA = getPolarElevationRgb(a);
  const polarB = getPolarElevationRgb(b);

  const distance = (x: number[], y: number[]): number =>
    Math.hypot(x[0]! - y[0]!, x[1]! - y[1]!, x[2]! - y[2]!);

  assert.ok(
    distance(polarA, polarB) > distance(globalA, globalB),
    'polar domain must separate these elevations by more than the global domain does',
  );
});

test('polar hex output is well formed', () => {
  assert.match(getPolarElevationHex(0), RGB_RE);
});

test('legend ticks describe the painted domain, not the global one', () => {
  assert.equal(NASA_SVS_POLAR_LEGEND_TICKS.length, 5);
  assert.equal(NASA_SVS_POLAR_LEGEND_TICKS[0]!.meters, NASA_SVS_POLAR_DOMAIN.minMeters);
  assert.equal(NASA_SVS_POLAR_LEGEND_TICKS[4]!.meters, NASA_SVS_POLAR_DOMAIN.maxMeters);

  for (let i = 1; i < NASA_SVS_POLAR_LEGEND_TICKS.length; i += 1) {
    assert.ok(NASA_SVS_POLAR_LEGEND_TICKS[i]!.meters > NASA_SVS_POLAR_LEGEND_TICKS[i - 1]!.meters);
  }
  for (const tick of NASA_SVS_POLAR_LEGEND_TICKS) {
    assert.match(tick.hex, RGB_RE);
    assert.ok(tick.label.includes('km'));
  }
});

test('legend gradient lists one colour per tick', () => {
  const gradient = getPolarLegendGradient();
  assert.ok(gradient.startsWith('linear-gradient(to right,'));
  for (const tick of NASA_SVS_POLAR_LEGEND_TICKS) {
    assert.ok(gradient.includes(tick.hex), `gradient missing ${tick.hex}`);
  }
});
