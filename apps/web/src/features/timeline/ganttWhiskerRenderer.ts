/**
 * Event sensitivity brackets, critical-window flags, hover guide and the playhead for the Gantt.
 *
 * Pure drawing. The sensitivity bracket is a *deterministic terrain-perturbation span* from the
 * backend's event whiskers: drawn as an open bracket with end caps, never filled like a
 * confidence interval (docs/ui/INTERACTION_VOCABULARY.md).
 */

import type { EventWhisker } from '@luna/contracts';
import { chartPalette } from '../sky-ribbon/chartPalette';
import {
  cellSpan,
  epochToPixelX,
  trackTopPx,
  CRITICAL_LANE_TOP_PX,
  CRITICAL_LANE_PX,
  TIMELINE_HEADER_HEIGHT_PX,
  TOTAL_TIMELINE_HEIGHT_PX,
  TRACKS_TOP_PX,
  TRACK_HEIGHT_PX,
  WHISKER_LANE_PX,
  type TimelineDimensions,
} from './ganttTrackRenderer';
import type { CriticalWindow } from './ganttModel';

const SENSITIVITY_ROLE = { HIGH: 'danger', MODERATE: 'warning', LOW: 'success' } as const;

/** Sensitivity brackets for solved rise/set events, in the lane between the axis and the tracks. */
export function drawEventWhiskers(
  ctx: CanvasRenderingContext2D,
  dim: TimelineDimensions,
  whiskers: EventWhisker[],
): void {
  if (!whiskers || whiskers.length === 0) return;
  const palette = chartPalette();
  const y = TIMELINE_HEADER_HEIGHT_PX + WHISKER_LANE_PX / 2 + 1;
  ctx.save();
  ctx.lineWidth = 1.6;
  for (const whisker of whiskers) {
    const xCenter = epochToPixelX(whisker.eventEpochMs, dim);
    const xLow = epochToPixelX(new Date(whisker.tLowDateUtc).getTime(), dim);
    const xHigh = epochToPixelX(new Date(whisker.tHighDateUtc).getTime(), dim);
    const colour = palette[SENSITIVITY_ROLE[whisker.sensitivityRating] ?? 'textMuted'];
    ctx.strokeStyle = colour;
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(Math.min(xLow, xHigh), y);
    ctx.lineTo(Math.max(xLow, xHigh), y);
    ctx.stroke();
    ctx.beginPath();
    for (const x of [xLow, xHigh]) {
      ctx.moveTo(x, y - 4);
      ctx.lineTo(x, y + 3);
    }
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(xCenter, y, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Critical short-duration windows: dashed rails across the tracks plus a flag in their own lane. */
export function drawCriticalWindows(
  ctx: CanvasRenderingContext2D,
  dim: TimelineDimensions,
  windows: readonly CriticalWindow[],
): void {
  if (windows.length === 0) return;
  const palette = chartPalette();
  const bottom = trackTopPx(2) + TRACK_HEIGHT_PX;
  ctx.save();
  ctx.strokeStyle = palette.warning;
  ctx.fillStyle = palette.warning;
  ctx.lineWidth = 1.2;
  for (const whisker of windows) {
    const span = cellSpan(whisker.startEpochMs, whisker.endEpochMs, dim);
    if (!span) continue;
    ctx.setLineDash([3, 3]);
    for (const x of [span.x, span.x + span.width]) {
      ctx.beginPath();
      ctx.moveTo(Math.max(0, Math.min(dim.width, x)), TRACKS_TOP_PX);
      ctx.lineTo(Math.max(0, Math.min(dim.width, x)), bottom);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const flagX = Math.max(5, Math.min(dim.width - 5, span.x + span.width / 2));
    const flagY = CRITICAL_LANE_TOP_PX + CRITICAL_LANE_PX / 2;
    ctx.beginPath();
    ctx.moveTo(flagX, flagY + 3);
    ctx.lineTo(flagX + 4, flagY - 3);
    ctx.lineTo(flagX - 4, flagY - 3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Vertical guide at the inspected instant so a hover readout is anchored to a position. */
export function drawHoverGuide(
  ctx: CanvasRenderingContext2D,
  dim: TimelineDimensions,
  epochMs: number | null,
): void {
  if (epochMs === null) return;
  const palette = chartPalette();
  const x = epochToPixelX(epochMs, dim);
  ctx.save();
  ctx.strokeStyle = palette.textSecondary;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x, TIMELINE_HEADER_HEIGHT_PX);
  ctx.lineTo(x, trackTopPx(2) + TRACK_HEIGHT_PX);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function drawPlayheadScrubber(
  ctx: CanvasRenderingContext2D,
  dim: TimelineDimensions,
  currentEpochMs: number,
): void {
  const palette = chartPalette();
  const x = epochToPixelX(currentEpochMs, dim);
  const inside = currentEpochMs >= dim.startEpochMs && currentEpochMs <= dim.endEpochMs;
  ctx.save();
  ctx.strokeStyle = palette.focus;
  ctx.lineWidth = inside ? 2 : 1.5;
  if (!inside) ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, TOTAL_TIMELINE_HEIGHT_PX);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = palette.focus;
  ctx.beginPath();
  ctx.moveTo(x - 5, 0);
  ctx.lineTo(x + 5, 0);
  ctx.lineTo(x, 8);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
