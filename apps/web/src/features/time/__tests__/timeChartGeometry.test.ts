import test from 'node:test';
import assert from 'node:assert/strict';

import type { TimelineDataPoint } from '@/domain/celestial/timeline';
import {
  elevationToY,
  epochFromClientX,
  indexToX,
  nextHoveredIndex,
  PLOT_BOTTOM,
  PLOT_LEFT,
  PLOT_RIGHT,
  PLOT_TOP,
  seriesPath,
  showTickAt,
  spanRatio,
  TIME_CHART_MAX_ELEV_DEG,
  TIME_CHART_MIN_ELEV_DEG,
  tickLabel,
} from '@/features/time/model/chart/timeChartGeometry';

const HOUR_MS = 3_600_000;
const T0 = Date.UTC(2026, 9, 21, 0, 0, 0);

function sample(index: number, sun: number | null, earth: number | null): TimelineDataPoint {
  return {
    timestampUtc: new Date(T0 + index * HOUR_MS).toISOString().replace('.000Z', 'Z'),
    epochMs: T0 + index * HOUR_MS,
    sunElevationDeg: sun,
    earthElevationDeg: earth,
    solarIlluminated: sun !== null && sun > 0,
    earthVisible: earth !== null && earth > 0,
  };
}

/** The svg is laid out at 960 user units; a 960 px rect means a 1:1 mapping. */
const RECT_LEFT = 0;
const RECT_WIDTH = 960;

test('Chart: the elevation range maps onto the plot height and clamps outside it', () => {
  assert.equal(elevationToY(TIME_CHART_MAX_ELEV_DEG), PLOT_TOP);
  assert.equal(elevationToY(TIME_CHART_MIN_ELEV_DEG), PLOT_BOTTOM);
  assert.ok(elevationToY(8) < elevationToY(0), 'higher elevation must sit higher on screen');
  assert.equal(elevationToY(90), PLOT_TOP);
  assert.equal(elevationToY(-90), PLOT_BOTTOM);
});

test('Chart: samples span the full plot width and a lone sample parks at the left edge', () => {
  assert.equal(indexToX(0, 5), PLOT_LEFT);
  assert.equal(indexToX(4, 5), PLOT_RIGHT);
  assert.equal(indexToX(2, 5), (PLOT_LEFT + PLOT_RIGHT) / 2);
  assert.equal(indexToX(0, 1), PLOT_LEFT);
});

test('Chart: unavailable samples are dropped, not interpolated, and keep their slot', () => {
  const points = [sample(0, 1, 1), sample(1, null, 1), sample(2, 3, null), sample(3, 5, 5)];
  const sun = seriesPath(points, (p) => p.sunElevationDeg);
  const commands = sun.split(' ').filter((token) => token === 'M' || token === 'L');
  assert.deepEqual(commands, ['M', 'L', 'L'], 'three available samples, one move');

  const sunXs = sun.match(/(-?[\d.]+) -?[\d.]+/g)!.map((pair) => Number(pair.split(' ')[0]));
  assert.deepEqual(sunXs, [indexToX(0, 4), indexToX(2, 4), indexToX(3, 4)].map((x) => Number(x.toFixed(1))));

  const earth = seriesPath(points, (p) => p.earthElevationDeg);
  assert.equal(earth.split(' ').filter((t) => t === 'M' || t === 'L').length, 3);
});

test('Chart: scrubbing snaps to the window step and clamps to the plot area', () => {
  const first = T0;
  const last = T0 + 24 * HOUR_MS;
  const snapped = epochFromClientX(480, RECT_LEFT, RECT_WIDTH, first, last, 6);
  assert.equal(snapped % (6 * HOUR_MS), 0, 'must land on a whole step boundary');
  assert.ok(Math.abs(snapped - (first + 12 * HOUR_MS)) <= 6 * HOUR_MS);

  assert.equal(
    epochFromClientX(-5000, RECT_LEFT, RECT_WIDTH, first, last, 1),
    Math.round(first / HOUR_MS) * HOUR_MS,
  );
  assert.ok(
    epochFromClientX(5000, RECT_LEFT, RECT_WIDTH, first, last, 1) <=
      Math.round(last / HOUR_MS) * HOUR_MS,
  );
});

test('Chart: hover follows the nearest sample, clears off-plot and holds when there is none', () => {
  const count = 25;
  assert.equal(nextHoveredIndex(480, RECT_LEFT, RECT_WIDTH, count, 0), Math.round(((480 - PLOT_LEFT) / (PLOT_RIGHT - PLOT_LEFT)) * (count - 1)));
  assert.equal(nextHoveredIndex(10, RECT_LEFT, RECT_WIDTH, count, 7), null, 'left gutter clears the highlight');
  assert.equal(nextHoveredIndex(950, RECT_LEFT, RECT_WIDTH, count, 7), null, 'right gutter clears the highlight');
  assert.equal(nextHoveredIndex(480, RECT_LEFT, RECT_WIDTH, 0, 4), 4, 'no samples keeps the previous index');
});

test('Chart: cursor ratio and tick density stay inside their declared bands', () => {
  const first = T0;
  const last = T0 + 24 * HOUR_MS;
  assert.equal(spanRatio(first - HOUR_MS, first, last), 0);
  assert.equal(spanRatio(last + HOUR_MS, first, last), 1);
  assert.equal(spanRatio(first + 12 * HOUR_MS, first, last), 0.5);

  assert.ok(showTickAt(0, 25, 24) && showTickAt(3, 25, 24) && !showTickAt(1, 25, 24));
  assert.ok(showTickAt(24, 25, 24), 'the final sample is always labelled');
  assert.ok(!showTickAt(1, 25, 168) && showTickAt(4, 25, 168));

  assert.equal(tickLabel(sample(3, 1, 1), 24), '03:00');
  assert.equal(tickLabel(sample(3, 1, 1), 168), '10-21 03:00');
});
