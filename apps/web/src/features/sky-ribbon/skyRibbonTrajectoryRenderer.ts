/**
 * Sun/Earth trajectory + playhead drawing for the sky panels.
 *
 * Two strokes, deliberately different, because they mean different things:
 *   - a thin dashed polyline between published samples = browser interpolation;
 *   - a filled sample dot at each published sample = the backend's own value.
 * The panel legend names both, so a reader can tell a measured vertex from a drawn segment.
 */

import type { SkyProjection } from './skyRibbonProjection';
import { chartPalette } from './chartPalette';
import { CHART_FONT, drawLabelChip } from './skyRibbonRenderer';
import type { TrajectorySample, TrajectorySeries } from './skyRibbonTrajectory';

const SAMPLE_RADIUS_PX = 2.2;

function bodyRole(series: TrajectorySeries): 'sun' | 'earth' {
  return series.body;
}

function inBand(projection: SkyProjection, sample: TrajectorySample): boolean {
  return (
    projection.isAzimuthVisible(sample.azimuthDeg) &&
    projection.isElevationVisible(sample.elevationDeg)
  );
}

export function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  series: TrajectorySeries,
): void {
  if (series.samples.length === 0) return;
  const palette = chartPalette();
  const colour = palette[bodyRole(series)];
  const visible = series.samples.filter((sample) => inBand(projection, sample));

  ctx.save();

  // 1. Interpolated connectors — dashed, thinner, and explicitly not a measurement.
  ctx.strokeStyle = colour;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 1.1;
  ctx.setLineDash([3, 3]);
  for (const run of series.runs) {
    const points = run.filter((sample) => inBand(projection, sample));
    if (points.length < 2) continue;
    ctx.beginPath();
    points.forEach((sample, index) => {
      const x = projection.azimuthToX(sample.azimuthDeg);
      const y = projection.elevationToY(sample.elevationDeg);
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;

  // 2. Published samples — solid dots with a plate-coloured ring so they read on any fill.
  ctx.fillStyle = colour;
  ctx.strokeStyle = palette.canvas;
  ctx.lineWidth = 1;
  for (const sample of visible) {
    const x = projection.azimuthToX(sample.azimuthDeg);
    const y = projection.elevationToY(sample.elevationDeg);
    ctx.beginPath();
    ctx.arc(x, y, SAMPLE_RADIUS_PX, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  if (visible.length > 0 && visible.length < series.samples.length) {
    drawLabelChip(
      ctx,
      `${series.body.toUpperCase()} · ${series.samples.length - visible.length} SAMPLE(S) OUTSIDE THIS AXIS`,
      projection.azimuth.widthPx - 6,
      projection.elevation.heightPx - 30,
      { role: bodyRole(series), align: 'right' },
    );
  }
  ctx.restore();
}

/**
 * The instantaneous marker. `azimuthDeg`/`elevationDeg` are the backend state for the active
 * playhead; this routine only annotates it. `label` carries the UTC instant so the marker is
 * readable without cross-referencing the timeline.
 */
export function drawPlayheadMarker(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  marker: { azimuthDeg: number; elevationDeg: number; label: string },
): void {
  if (!projection.isAzimuthVisible(marker.azimuthDeg)) return;
  const palette = chartPalette();
  const x = projection.azimuthToX(marker.azimuthDeg);
  const y = projection.elevationToY(marker.elevationDeg);
  const height = projection.elevation.heightPx;

  ctx.save();
  ctx.strokeStyle = palette.focus;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.stroke();

  ctx.fillStyle = palette.focus;
  ctx.beginPath();
  ctx.moveTo(x - 5, 0);
  ctx.lineTo(x + 5, 0);
  ctx.lineTo(x, 7);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.stroke();

  ctx.font = `bold 11px ${CHART_FONT}`;
  const playheadText = `PLAYHEAD ${marker.label}`;
  const textWidth = ctx.measureText(playheadText).width;
  let labelX = x + 8;
  let align: CanvasTextAlign = 'left';
  if (x + 8 + textWidth > projection.azimuth.widthPx - 8) {
    labelX = x - 8;
    align = 'right';
  }
  const labelY = x < 260 ? 26 : 12;
  drawLabelChip(ctx, playheadText, labelX, labelY, { role: 'focus', bold: true, align });
  ctx.restore();
}
