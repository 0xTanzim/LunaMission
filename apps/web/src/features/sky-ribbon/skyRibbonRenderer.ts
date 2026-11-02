/**
 * Dual-Panel Sky-Ribbon 2.0 — panel chrome (background, graticules, legends, labels).
 *
 * Panel-agnostic: every routine takes a `SkyProjection`, so the 360° panorama and the linear
 * grazing corridor share one drawing implementation and can never drift apart in axis handling.
 * Pure canvas drawing — no astronomy, no terrain maths, no clamping that would hide
 * out-of-band geometry. Colours are design-token roles (`chartPalette`), never palette shades.
 */

import type { SkyProjection } from './skyRibbonProjection';
import { chartPalette, type ChartRole } from './chartPalette';

/**
 * Backend horizon bin, as published by `GET /api/v1/scenarios/evaluate`
 * (`horizonProfile`, optional per bin). A bin without any usable elevation is dropped by
 * `toSkylineSamples` — it is never rendered as a flat 0° horizon.
 */
export interface HorizonProfileBin {
  azimuthDeg: number;
  thetaNomDeg?: number;
  thetaLowDeg?: number;
  thetaHighDeg?: number;
  elevationDeg?: number;
  distanceKm?: number;
  featureName?: string;
}

export const CHART_FONT = 'monospace';

export function drawPanelBackground(ctx: CanvasRenderingContext2D, projection: SkyProjection): void {
  const palette = chartPalette();
  ctx.fillStyle = palette.canvas;
  ctx.fillRect(0, 0, projection.azimuth.widthPx, projection.elevation.heightPx);
}

/**
 * A text chip with a backing plate, so a label stays legible over the terrain fill, a hatch
 * pattern or a skyline crossing. `role` selects the design-token colour of the text.
 */
export function drawLabelChip(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: {
    role?: ChartRole;
    align?: CanvasTextAlign;
    bold?: boolean;
    widthPx?: number;
    plate?: boolean;
  } = {},
): void {
  const palette = chartPalette();
  const role = options.role ?? 'textSecondary';
  const align = options.align ?? 'left';
  ctx.save();
  ctx.font = `${options.bold ? 'bold ' : ''}11px ${CHART_FONT}`;
  ctx.textAlign = align;
  const plateWidth = ctx.measureText(text).width + 8;
  const left =
    align === 'right' ? x - plateWidth + 4 : align === 'center' ? x - plateWidth / 2 : x - 4;
  if (options.plate !== false) {
    ctx.fillStyle = palette.canvas;
    ctx.globalAlpha = 0.86;
    ctx.fillRect(left, y - 10, plateWidth, 13);
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = palette[role];
  ctx.fillText(text, x, y);
  if (options.widthPx !== undefined) {
    ctx.strokeStyle = palette[role];
    ctx.beginPath();
    ctx.moveTo(x, y + 3);
    ctx.lineTo(x + options.widthPx, y + 3);
    ctx.stroke();
  }
  ctx.restore();
}

/** Shades a horizon band (used for the panorama's ±2° grazing band). */
export function drawElevationBand(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  minDeg: number,
  maxDeg: number,
  label: string,
): void {
  const palette = chartPalette();
  const top = projection.elevationToY(maxDeg);
  const bottom = projection.elevationToY(minDeg);
  const { widthPx } = projection.azimuth;
  ctx.save();
  ctx.fillStyle = palette.infoSurface;
  ctx.fillRect(0, top, widthPx, bottom - top);
  ctx.strokeStyle = palette.infoBorder;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 4]);
  for (const y of [top, bottom]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(widthPx, y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
  drawLabelChip(ctx, label, 6, top + 10, { role: 'info' });
}

export function drawElevationGraticule(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  stepDeg: number,
): void {
  const palette = chartPalette();
  const { minDeg, maxDeg } = projection.elevation;
  const { widthPx } = projection.azimuth;
  ctx.save();
  ctx.font = `11px ${CHART_FONT}`;
  ctx.textAlign = 'left';
  const steps = Math.max(1, Math.round((maxDeg - minDeg) / stepDeg));
  for (let i = 0; i <= steps; i++) {
    const elevationDeg = minDeg + i * stepDeg;
    const y = projection.elevationToY(elevationDeg);
    const isZero = Math.abs(elevationDeg) < 1e-9;
    ctx.strokeStyle = isZero ? palette.borderStrong : palette.border;
    ctx.lineWidth = isZero ? 1.25 : 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(widthPx, y);
    ctx.stroke();
    ctx.fillStyle = isZero ? palette.textPrimary : palette.textMuted;
    const sign = elevationDeg > 0 ? '+' : elevationDeg < 0 ? '-' : '±';
    ctx.fillText(
      `${sign}${Math.abs(elevationDeg).toFixed(1)}°`,
      4,
      Math.min(y - 3, projection.elevation.heightPx - 2),
    );
  }
  ctx.restore();
}

export function drawAzimuthGraticule(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  stepDeg: number,
): void {
  const palette = chartPalette();
  const { heightPx } = projection.elevation;
  ctx.save();
  ctx.font = `11px ${CHART_FONT}`;
  ctx.textAlign = 'center';
  for (let azimuthDeg = 0; azimuthDeg < 360; azimuthDeg += stepDeg) {
    if (!projection.isAzimuthVisible(azimuthDeg)) continue;
    const x = projection.azimuthToX(azimuthDeg);
    ctx.strokeStyle = palette.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, heightPx);
    ctx.stroke();
    ctx.fillStyle = palette.textMuted;
    const labelX = Math.min(Math.max(x, 14), projection.azimuth.widthPx - 14);
    ctx.fillText(`${azimuthDeg}°`, labelX, heightPx - 4);
  }
  ctx.restore();
}

/** Flags geometry that lies outside the axis instead of distorting it back inside. */
export function drawOutOfBandFlag(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  side: 'above' | 'below',
  label: string,
): void {
  const y = side === 'above' ? 12 : projection.elevation.heightPx - 16;
  const arrow = side === 'above' ? '▲' : '▼';
  drawLabelChip(ctx, `${arrow} ${label}`, projection.azimuth.widthPx - 6, y, {
    role: 'danger',
    align: 'right',
    bold: true,
  });
}

export function drawScaleLegend(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  text: string,
): void {
  void projection;
  drawLabelChip(ctx, text, 6, 12, { role: 'textSecondary' });
}
