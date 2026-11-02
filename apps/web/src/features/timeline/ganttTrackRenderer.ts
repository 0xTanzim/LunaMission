/**
 * Pure canvas rendering for the multi-track Gantt timeline.
 *
 * Three tracks — solar disk visibility, Earth geometric line-of-sight, concurrent overlap — each
 * cell being the sub-interval's own backend status. Every status is encoded twice: by a
 * design-token fill *and* by a pattern (solid / diagonal hatch / stipple / dots), so no state is
 * carried by colour alone. Track labels live in the DOM beside the canvas, never painted over the
 * data.
 *
 * Layout, top to bottom: date axis → event-sensitivity lane → three status tracks → critical-window
 * lane. `TimelineDimensions` is the *visible* window, not the mission span, so the same drawing code
 * serves the mission overview and a single event window after a zoom.
 */

import type { EvaluatedSubInterval } from '@luna/contracts';
import { chartPalette } from '../sky-ribbon/chartPalette';

export const TIMELINE_HEADER_HEIGHT_PX = 26;
export const WHISKER_LANE_PX = 14;
export const TRACK_HEIGHT_PX = 26;
export const TRACK_GAP_PX = 6;
export const CRITICAL_LANE_PX = 12;
export const GANTT_TRACK_COUNT = 3;

export const TRACKS_TOP_PX = TIMELINE_HEADER_HEIGHT_PX + WHISKER_LANE_PX;
export const CRITICAL_LANE_TOP_PX =
  TRACKS_TOP_PX + GANTT_TRACK_COUNT * TRACK_HEIGHT_PX + (GANTT_TRACK_COUNT - 1) * TRACK_GAP_PX;
export const TOTAL_TIMELINE_HEIGHT_PX = CRITICAL_LANE_TOP_PX + CRITICAL_LANE_PX;

export interface TimelineDimensions {
  width: number;
  startEpochMs: number;
  endEpochMs: number;
}

export type CellPattern = 'solid' | 'diagonal' | 'stipple' | 'dots';

export interface CellPaint {
  readonly fill: string;
  readonly pattern: CellPattern;
  readonly label: string;
}

export function epochToPixelX(epochMs: number, dim: TimelineDimensions): number {
  const span = dim.endEpochMs - dim.startEpochMs;
  if (span <= 0) return 0;
  const fraction = (epochMs - dim.startEpochMs) / span;
  return Math.max(0, Math.min(dim.width, fraction * dim.width));
}

export function pixelXToEpoch(x: number, dim: TimelineDimensions): number {
  if (dim.width <= 0) return dim.startEpochMs;
  const fraction = Math.max(0, Math.min(1, x / dim.width));
  return dim.startEpochMs + fraction * (dim.endEpochMs - dim.startEpochMs);
}

export function trackTopPx(trackIndex: number): number {
  return TRACKS_TOP_PX + trackIndex * (TRACK_HEIGHT_PX + TRACK_GAP_PX);
}

/** Horizontal span of a cell inside the visible window, or null when it is off-screen. */
export function cellSpan(
  startEpochMs: number,
  endEpochMs: number,
  dim: TimelineDimensions,
): { x: number; width: number } | null {
  if (endEpochMs <= dim.startEpochMs || startEpochMs >= dim.endEpochMs) return null;
  const x = epochToPixelX(startEpochMs, dim);
  const right = epochToPixelX(endEpochMs, dim);
  return { x, width: Math.max(1, right - x) };
}

const SUN_PAINT: Record<string, Omit<CellPaint, 'label'>> = {
  full_sun: { fill: 'success', pattern: 'solid' },
  partial_limb: { fill: 'warning', pattern: 'stipple' },
  terrain_shadow: { fill: 'surfaceStrong', pattern: 'diagonal' },
  sub_horizon: { fill: 'canvas', pattern: 'dots' },
};

const EARTH_PAINT: Record<string, Omit<CellPaint, 'label'>> = {
  visible: { fill: 'info', pattern: 'solid' },
  earth_direct: { fill: 'info', pattern: 'solid' },
  terrain_blocked: { fill: 'surfaceStrong', pattern: 'diagonal' },
  earth_occluded: { fill: 'surfaceStrong', pattern: 'diagonal' },
  sub_horizon: { fill: 'canvas', pattern: 'dots' },
  earth_sub_horizon: { fill: 'canvas', pattern: 'dots' },
};

const OVERLAP_PAINT: Record<string, Omit<CellPaint, 'label'>> = {
  sun_and_earth: { fill: 'sun', pattern: 'solid' },
  overlap_active: { fill: 'sun', pattern: 'solid' },
  sun_only: { fill: 'warning', pattern: 'stipple' },
  earth_only: { fill: 'info', pattern: 'stipple' },
  dark_and_blocked: { fill: 'surfaceStrong', pattern: 'diagonal' },
  overlap_inactive: { fill: 'surfaceStrong', pattern: 'diagonal' },
};

const FALLBACK_PAINT: Omit<CellPaint, 'label'> = { fill: 'canvas', pattern: 'dots' };

export const STATUS_LABEL: Record<string, string> = {
  full_sun: 'full sun',
  partial_limb: 'partial limb',
  terrain_shadow: 'terrain shadow',
  sub_horizon: 'below horizon',
  visible: 'LoS clear',
  earth_direct: 'LoS clear',
  terrain_blocked: 'terrain blocked',
  earth_occluded: 'terrain blocked',
  earth_sub_horizon: 'below horizon',
  sun_and_earth: 'sun + earth',
  overlap_active: 'sun + earth',
  sun_only: 'sun only',
  earth_only: 'earth only',
  dark_and_blocked: 'no access',
  overlap_inactive: 'no access',
};

export function paintFor(trackIndex: number, status: string): CellPaint {
  const table = trackIndex === 0 ? SUN_PAINT : trackIndex === 1 ? EARTH_PAINT : OVERLAP_PAINT;
  const paint = table[status] ?? FALLBACK_PAINT;
  const palette = chartPalette();
  return {
    fill: palette[paint.fill as keyof typeof palette] ?? palette.canvas,
    pattern: paint.pattern,
    label: STATUS_LABEL[status] ?? status,
  };
}

function applyPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  pattern: CellPattern,
  colour: string,
): void {
  if (pattern === 'solid' || width < 2) return;
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = 1;
  if (pattern === 'diagonal') {
    for (let offset = 0; offset < width + height; offset += 6) {
      ctx.beginPath();
      ctx.moveTo(x + offset, y);
      ctx.lineTo(x + offset - height, y + height);
      ctx.stroke();
    }
  } else if (pattern === 'dots') {
    for (let py = y + 5; py < y + height; py += 7) {
      for (let px = x + 4; px < x + width; px += 7) ctx.fillRect(px, py, 1.5, 1.5);
    }
  } else {
    for (let py = y + 4; py < y + height; py += 6) {
      for (let px = x + 3; px < x + width; px += 5) ctx.fillRect(px, py, 2, 1.5);
    }
  }
  ctx.restore();
}

/** Time axis. The tick interval is chosen by the caller so ~8 labels stay visible. */
export function drawTimelineHeader(
  ctx: CanvasRenderingContext2D,
  dim: TimelineDimensions,
  tickIntervalMs = 86_400_000,
): void {
  const palette = chartPalette();
  ctx.save();
  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, dim.width, TIMELINE_HEADER_HEIGHT_PX);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, TIMELINE_HEADER_HEIGHT_PX);
  ctx.lineTo(dim.width, TIMELINE_HEADER_HEIGHT_PX);
  ctx.stroke();

  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.textMuted;
  if (tickIntervalMs > 0 && dim.endEpochMs > dim.startEpochMs) {
    const first = Math.ceil(dim.startEpochMs / tickIntervalMs) * tickIntervalMs;
    const showTime = tickIntervalMs < 86_400_000;
    for (let epochMs = first; epochMs <= dim.endEpochMs; epochMs += tickIntervalMs) {
      const x = epochToPixelX(epochMs, dim);
      ctx.strokeStyle = palette.border;
      ctx.beginPath();
      ctx.moveTo(x, 16);
      ctx.lineTo(x, TIMELINE_HEADER_HEIGHT_PX);
      ctx.stroke();
      const iso = new Date(epochMs).toISOString();
      ctx.fillText(showTime ? iso.slice(5, 16).replace('T', ' ') : iso.slice(5, 10), x, 12);
    }
  }
  ctx.restore();
}

/** The three status tracks, one cell per sub-interval, in playback order. */
export function drawIntervalTracks(
  ctx: CanvasRenderingContext2D,
  dim: TimelineDimensions,
  intervals: EvaluatedSubInterval[],
  options: { activeIndex?: number } = {},
): void {
  if (!intervals || intervals.length === 0) return;
  const palette = chartPalette();
  ctx.save();

  for (let trackIndex = 0; trackIndex < GANTT_TRACK_COUNT; trackIndex++) {
    ctx.fillStyle = palette.canvas;
    ctx.fillRect(0, trackTopPx(trackIndex), dim.width, TRACK_HEIGHT_PX);
  }

  intervals.forEach((interval, index) => {
    const span = cellSpan(interval.startEpochMs, interval.endEpochMs, dim);
    if (!span) return;
    const statuses = [interval.sun.status, interval.earth.status, interval.overlap.status];
    for (let trackIndex = 0; trackIndex < GANTT_TRACK_COUNT; trackIndex++) {
      const top = trackTopPx(trackIndex);
      const paint = paintFor(trackIndex, statuses[trackIndex] as string);
      ctx.fillStyle = paint.fill;
      ctx.fillRect(span.x, top, span.width, TRACK_HEIGHT_PX);
      applyPattern(ctx, span.x, top, span.width, TRACK_HEIGHT_PX, paint.pattern, palette.canvas);
    }
    if (index === options.activeIndex) {
      ctx.strokeStyle = palette.focus;
      ctx.lineWidth = 2;
      for (let trackIndex = 0; trackIndex < GANTT_TRACK_COUNT; trackIndex++) {
        ctx.strokeRect(span.x, trackTopPx(trackIndex), span.width, TRACK_HEIGHT_PX);
      }
    }
  });

  // Interval boundary rules: a state change must never read as a smooth ramp.
  ctx.strokeStyle = palette.borderStrong;
  ctx.lineWidth = 1;
  for (let index = 1; index < intervals.length; index++) {
    const epochMs = intervals[index]!.startEpochMs;
    if (epochMs <= dim.startEpochMs || epochMs >= dim.endEpochMs) continue;
    const x = epochToPixelX(epochMs, dim);
    ctx.beginPath();
    ctx.moveTo(x, TRACKS_TOP_PX);
    ctx.lineTo(x, trackTopPx(GANTT_TRACK_COUNT - 1) + TRACK_HEIGHT_PX);
    ctx.stroke();
  }

  ctx.strokeStyle = palette.borderSubtle;
  for (let trackIndex = 0; trackIndex < GANTT_TRACK_COUNT; trackIndex++) {
    ctx.strokeRect(0, trackTopPx(trackIndex), dim.width, TRACK_HEIGHT_PX);
  }
  ctx.restore();
}

export { drawEventWhiskers, drawPlayheadScrubber, drawCriticalWindows, drawHoverGuide } from './ganttWhiskerRenderer';
