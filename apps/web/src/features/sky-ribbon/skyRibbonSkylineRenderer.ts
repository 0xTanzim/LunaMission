/**
 * Dual-Panel Sky-Ribbon 2.0 — terrain skyline rendering.
 *
 * Draws the backend horizon samples as a *filled* terrain body plus a ridge line, through the
 * panel projection. Two properties matter scientifically:
 *
 *  - Sample vs interpolation. Only the published bins are measurements; the straight segment
 *    between two adjacent bins is browser rendering. Each bin therefore gets a discrete sample
 *    tick, and the segment is drawn as a thinner interpolation stroke. The legend in
 *    `SkyPanelLegend` names both.
 *  - Data gaps. Runs of bins that are not azimuth-continuous are drawn as separate bodies with a
 *    hatched gap between them. The renderer never bridges unmeasured azimuths with a ridge.
 *
 * Terrain that rises above a reference elevation (the body being inspected) is shaded as
 * obstructing terrain and its contact azimuths are glyph-marked, so occlusion is never
 * colour-only.
 */

import { buildSkylineTopology, type SkylineSample, type SkylineTopology } from './skyRibbonSkyline';
import type { SkyProjection } from './skyRibbonProjection';
import { chartPalette } from './chartPalette';
import { CHART_FONT, drawLabelChip } from './skyRibbonRenderer';

const CONTACT_GLYPH = '✕';

/** Only draw per-bin sample ticks once they are far enough apart to stay legible. */
const MIN_SAMPLE_TICK_SPACING_PX = 7;

function yOf(projection: SkyProjection, elevationDeg: number): number {
  // Out-of-band elevations are clipped by the canvas rather than compressed.
  return projection.elevationToY(elevationDeg);
}

export function drawNoSkylineNotice(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  message: string,
): void {
  const palette = chartPalette();
  ctx.save();
  ctx.font = `bold 11px ${CHART_FONT}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = palette.danger;
  ctx.fillText(message, projection.azimuth.widthPx / 2, projection.elevation.heightPx / 2);
  ctx.font = `11px ${CHART_FONT}`;
  ctx.fillStyle = palette.textMuted;
  ctx.fillText(
    'No horizon bins supplied — horizon is NOT assumed to be 0°.',
    projection.azimuth.widthPx / 2,
    projection.elevation.heightPx / 2 + 14,
  );
  ctx.restore();
}

function drawEnvelope(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  samples: readonly SkylineSample[],
): void {
  const palette = chartPalette();
  const enveloped = samples.filter((sample) => sample.lowDeg !== null && sample.highDeg !== null);
  if (enveloped.length < 2) return;
  ctx.beginPath();
  enveloped.forEach((sample, index) => {
    const x = projection.azimuthToX(sample.azimuthDeg);
    const y = yOf(projection, sample.highDeg as number);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  for (let index = enveloped.length - 1; index >= 0; index--) {
    const sample = enveloped[index]!;
    ctx.lineTo(projection.azimuthToX(sample.azimuthDeg), yOf(projection, sample.lowDeg as number));
  }
  ctx.closePath();
  ctx.fillStyle = palette.infoSurfaceStrong;
  ctx.fill();
}

/** Shades the terrain sectors that stand at or above the inspected body's elevation. */
function drawObstructingSectors(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  topology: SkylineTopology,
  occluderDeg: number,
): number {
  const palette = chartPalette();
  const yOccluder = yOf(projection, occluderDeg);
  let contacts = 0;

  for (const run of topology.runs) {
    let previous: SkylineSample | null = null;
    for (const sample of run.samples) {
      if (previous) {
        const abovePrevious = previous.nominalDeg >= occluderDeg;
        const aboveCurrent = sample.nominalDeg >= occluderDeg;
        if (abovePrevious !== aboveCurrent) {
          const x = projection.azimuthToX(sample.azimuthDeg);
          drawLabelChip(ctx, CONTACT_GLYPH, x, yOccluder - 3, {
            role: 'danger',
            align: 'center',
            bold: true,
            plate: false,
          });
          contacts += 1;
        }
        if (abovePrevious && aboveCurrent) {
          const xFrom = projection.azimuthToX(previous.azimuthDeg);
          const xTo = projection.azimuthToX(sample.azimuthDeg);
          const yFrom = Math.min(yOf(projection, previous.nominalDeg), yOccluder);
          const yTo = Math.max(yOf(projection, sample.nominalDeg), yOccluder);
          ctx.save();
          ctx.fillStyle = palette.dangerSurface;
          ctx.fillRect(xFrom, yFrom, Math.max(0, xTo - xFrom), Math.max(0, yTo - yFrom));
          ctx.strokeStyle = palette.dangerBorder;
          ctx.lineWidth = 1;
          for (let x = xFrom; x < xTo; x += 7) {
            ctx.beginPath();
            ctx.moveTo(x, yFrom);
            ctx.lineTo(x + 4, yTo);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      previous = sample;
    }
  }
  return contacts;
}

/** Hatched band where the published bins are not azimuth-continuous. */
function drawDataGaps(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  topology: SkylineTopology,
): void {
  if (topology.gaps === 0) return;
  const palette = chartPalette();
  const bottom = projection.elevation.heightPx;
  ctx.save();
  for (let index = 1; index < topology.runs.length; index++) {
    const left = topology.runs[index - 1]!.samples.at(-1)!;
    const right = topology.runs[index]!.samples[0]!;
    const xFrom = projection.azimuthToX(left.azimuthDeg);
    const xTo = projection.azimuthToX(right.azimuthDeg);
    if (!(xTo > xFrom)) continue;
    ctx.fillStyle = palette.warningSurface;
    ctx.fillRect(xFrom, 0, xTo - xFrom, bottom);
    ctx.strokeStyle = palette.warningBorder;
    ctx.lineWidth = 1;
    for (let x = xFrom; x < xTo; x += 6) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 6, 12);
      ctx.stroke();
    }
  }
  ctx.restore();
  if (topology.runs.length > 1) {
    const first = topology.runs[1]!.samples[0]!;
    drawLabelChip(
      ctx,
      `NO BIN · ${(first.azimuthDeg - topology.runs[0]!.samples.at(-1)!.azimuthDeg).toFixed(1)}° GAP`,
      projection.azimuthToX(first.azimuthDeg),
      12,
      { role: 'warning', align: 'right' },
    );
  }
}

function drawRun(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  run: SkylineTopology['runs'][number],
  withSampleTicks: boolean,
): void {
  const palette = chartPalette();
  const samples = run.samples;
  const bottom = projection.elevation.heightPx;
  const first = projection.azimuthToX(samples[0]!.azimuthDeg);
  const last = projection.azimuthToX(samples.at(-1)!.azimuthDeg);

  // 1. Filled terrain body.
  ctx.beginPath();
  ctx.moveTo(first, bottom);
  for (const sample of samples) {
    ctx.lineTo(projection.azimuthToX(sample.azimuthDeg), yOf(projection, sample.nominalDeg));
  }
  ctx.lineTo(last, bottom);
  ctx.closePath();
  ctx.fillStyle = palette.surfaceStrong;
  ctx.fill();

  // 2. Interpolated ridge between published bins: the rendering, not a measurement.
  ctx.beginPath();
  samples.forEach((sample, index) => {
    const x = projection.azimuthToX(sample.azimuthDeg);
    const y = yOf(projection, sample.nominalDeg);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = palette.borderStrong;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([5, 3]);
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. Published-bin sample ticks — the measured vertices.
  if (withSampleTicks) {
    ctx.strokeStyle = palette.textPrimary;
    ctx.lineWidth = 1;
    for (const sample of samples) {
      const x = projection.azimuthToX(sample.azimuthDeg);
      const y = yOf(projection, sample.nominalDeg);
      ctx.beginPath();
      ctx.moveTo(x - 1.5, y - 2.5);
      ctx.lineTo(x + 1.5, y + 2.5);
      ctx.stroke();
    }
  }
}

export function drawSkyline(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  samples: readonly SkylineSample[],
  options: { occluderElevationDeg?: number | null } = {},
): void {
  if (samples.length === 0) {
    drawNoSkylineNotice(ctx, projection, 'NO TERRAIN SKYLINE TELEMETRY');
    return;
  }

  const topology = buildSkylineTopology(samples);
  const spacingPx =
    topology.medianStepDeg === null ? 0 : topology.medianStepDeg * projection.azimuth.pixelsPerDegree;

  ctx.save();
  drawEnvelope(ctx, projection, samples);
  const occluder = options.occluderElevationDeg ?? null;
  if (occluder !== null && Number.isFinite(occluder)) {
    drawObstructingSectors(ctx, projection, topology, occluder);
  }
  drawDataGaps(ctx, projection, topology);
  for (const run of topology.runs) {
    drawRun(ctx, projection, run, spacingPx >= MIN_SAMPLE_TICK_SPACING_PX);
  }
  ctx.restore();
}
