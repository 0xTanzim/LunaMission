/**
 * Pure mapping between the Time Explorer's data space (sample index, epoch,
 * topocentric elevation) and the SVG frame it is drawn in. Kept free of React
 * so the axis maths can be asserted directly; see `timeChartGeometry.test.ts`.
 */

import type { TimelineDataPoint } from '@/domain/celestial/timeline';

export const TIME_CHART_WIDTH = 960;
export const TIME_CHART_HEIGHT = 220;
const TIME_CHART_PADDING = { top: 30, right: 35, bottom: 40, left: 50 } as const;

/** Fixed vertical range so switching windows never rescales the elevation axis. */
export const TIME_CHART_MIN_ELEV_DEG = -10;
export const TIME_CHART_MAX_ELEV_DEG = 16;
export const TIME_CHART_GRID_ELEV_DEG = [-10, -5, 0, 5, 10, 15] as const;

/** Hour labels thin out as the window widens, otherwise the axis overprints. */
export const TIME_CHART_TICK_EVERY_STEPS: Record<number, number> = {
  24: 3,
  168: 4,
  720: 5,
};

const MS_PER_HOUR = 3_600_000;

export const PLOT_LEFT = TIME_CHART_PADDING.left;
export const PLOT_RIGHT = TIME_CHART_WIDTH - TIME_CHART_PADDING.right;
export const PLOT_TOP = TIME_CHART_PADDING.top;
export const PLOT_BOTTOM = TIME_CHART_HEIGHT - TIME_CHART_PADDING.bottom;
export const PLOT_WIDTH = PLOT_RIGHT - PLOT_LEFT;
export const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

export function elevationToY(elevationDeg: number): number {
  const clamped = Math.max(TIME_CHART_MIN_ELEV_DEG, Math.min(TIME_CHART_MAX_ELEV_DEG, elevationDeg));
  const ratio =
    (clamped - TIME_CHART_MIN_ELEV_DEG) / (TIME_CHART_MAX_ELEV_DEG - TIME_CHART_MIN_ELEV_DEG);
  return PLOT_TOP + PLOT_HEIGHT * (1 - ratio);
}

export function indexToX(index: number, total: number): number {
  if (total <= 1) return PLOT_LEFT;
  return PLOT_LEFT + (index / (total - 1)) * PLOT_WIDTH;
}

/**
 * Polyline for one series. Gaps stay gaps: the point is dropped rather than
 * interpolated, and the surviving points keep their original slot so the
 * horizontal spacing still encodes time.
 */
export function seriesPath(
  points: TimelineDataPoint[],
  pick: (point: TimelineDataPoint) => number | null,
): string {
  let path = '';
  points.forEach((point, index) => {
    const value = pick(point);
    if (value === null) return;
    const x = indexToX(index, points.length).toFixed(1);
    const y = elevationToY(value).toFixed(1);
    path += `${path ? 'L' : 'M'} ${x} ${y} `;
  });
  return path.trim();
}

/** Fraction [0,1] of the sampled span at which `epochMs` falls. */
export function spanRatio(epochMs: number, firstPointMs: number, lastPointMs: number): number {
  const spanMs = Math.max(1, lastPointMs - firstPointMs);
  return Math.max(0, Math.min(1, (epochMs - firstPointMs) / spanMs));
}

export function cursorXForEpoch(
  epochMs: number,
  firstPointMs: number,
  lastPointMs: number,
): number {
  return PLOT_LEFT + spanRatio(epochMs, firstPointMs, lastPointMs) * PLOT_WIDTH;
}

/** Device pixels to user-space pixels; the SVG is scaled by its rendered width. */
export function userXFromClientX(clientX: number, rectLeft: number, rectWidth: number): number {
  return ((clientX - rectLeft) / rectWidth) * TIME_CHART_WIDTH;
}

/** Epoch under the pointer, snapped to the window's stepping increment. */
export function epochFromClientX(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  firstPointMs: number,
  lastPointMs: number,
  stepHours: number,
): number {
  const boundedX = Math.max(PLOT_LEFT, Math.min(PLOT_RIGHT, userXFromClientX(clientX, rectLeft, rectWidth)));
  const relRatio = (boundedX - PLOT_LEFT) / PLOT_WIDTH;
  const spanMs = Math.max(1, lastPointMs - firstPointMs);
  const targetMs = firstPointMs + relRatio * spanMs;
  const stepMs = stepHours * MS_PER_HOUR;
  return Math.round(targetMs / stepMs) * stepMs;
}

/**
 * Which sample the pointer is over, following the rule the chart has always had:
 * leaving the plot area clears the highlight, while a pointer inside the plot
 * that resolves to no sample keeps the previous one.
 */
export function nextHoveredIndex(
  clientX: number,
  rectLeft: number,
  rectWidth: number,
  pointCount: number,
  previous: number | null,
): number | null {
  const clickX = userXFromClientX(clientX, rectLeft, rectWidth);
  if (clickX < PLOT_LEFT || clickX > PLOT_RIGHT) return null;
  const relRatio = (clickX - PLOT_LEFT) / PLOT_WIDTH;
  const index = Math.round(relRatio * (pointCount - 1));
  return index >= 0 && index < pointCount ? index : previous;
}

export function tickLabel(point: TimelineDataPoint, windowHours: number): string {
  return windowHours === 24
    ? point.timestampUtc.substring(11, 16)
    : `${point.timestampUtc.substring(5, 10)} ${point.timestampUtc.substring(11, 16)}`;
}

export function showTickAt(index: number, pointCount: number, windowHours: number): boolean {
  const interval = TIME_CHART_TICK_EVERY_STEPS[windowHours] ?? 1;
  return index % interval === 0 || index === pointCount - 1;
}
