/**
 * Dual-Panel Sky-Ribbon 2.0 — Sun/Earth markers, limb-clearance gauge, pins, cursor.
 *
 * Shared by both panels (one implementation, two projections) so the 360° panorama and the
 * grazing corridor can never disagree about where a body is.
 *
 * Scientific care:
 *  - The body is drawn at the backend's centre azimuth/elevation; nothing here computes an
 *    ephemeris, a limb offset or a disk footprint.
 *  - A body drawn with an angular *radius* is labelled as such; when the API has not supplied a
 *    radius the marker is a fixed glyph and the panel reports `glyph` instead of pretending to a
 *    limb-accurate disk. The 2-D disk outline is never produced here — it needs backend boundary
 *    samples (`skyRibbonDisk`).
 *  -The halo is an identity cue for a celestial body, suppressed under `prefers-reduced-motion`
 *    and switched off inside the grazing corridor, where it would wash out the limb contact.
 */

import type { SkyProjection } from './skyRibbonProjection';
import { chartPalette } from './chartPalette';
import { CHART_FONT, drawLabelChip } from './skyRibbonRenderer';
import { formatDeg, formatSignedDeg } from './skyRibbonFormat';

export interface CelestialBodySpec {
  readonly kind: 'sun' | 'earth';
  readonly label: string;
  readonly azimuthDeg: number | null;
  readonly elevationDeg: number | null;
  /** Apparent angular RADIUS in degrees, when published by the API. */
  readonly angularRadiusDeg?: number | null;
  readonly statusGlyph?: string;
}

export interface CelestialDrawOptions {
  readonly reducedMotion: boolean;
  /** Identity halo. Off inside the grazing corridor so the limb contact stays legible. */
  readonly halo?: boolean;
}

export interface ClearanceGaugeSpec {
  readonly azimuthDeg: number;
  readonly horizonDeg: number;
  readonly bodyDeg: number;
  readonly clearanceLabel: string;
  readonly satisfied: boolean | null;
}

export function drawCelestialBody(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  body: CelestialBodySpec,
  options: CelestialDrawOptions,
): void {
  if (body.azimuthDeg === null || body.elevationDeg === null) return;
  if (!Number.isFinite(body.azimuthDeg) || !Number.isFinite(body.elevationDeg)) return;

  const palette = chartPalette();
  const colour = body.kind === 'sun' ? palette.sun : palette.earth;
  const { widthPx } = projection.azimuth;
  const { minDeg, maxDeg, heightPx, pixelsPerDegree } = projection.elevation;
  const elevationDeg = body.elevationDeg;

  // Out of the azimuth window: flag the edge instead of silently dropping the body.
  if (!projection.isAzimuthVisible(body.azimuthDeg)) {
    const y = Math.min(
      heightPx - 6,
      Math.max(14, projection.elevationToY(Math.min(maxDeg, Math.max(minDeg, elevationDeg)))),
    );
    drawLabelChip(ctx, `▶ ${body.label} AZ ${formatDeg(body.azimuthDeg, 1)} OUT OF ARC`, widthPx - 6, y, {
      role: body.kind === 'sun' ? 'sun' : 'earth',
      align: 'right',
      bold: true,
    });
    return;
  }

  const x = projection.azimuthToX(body.azimuthDeg);

  // Out of the elevation band: chevron at the edge carrying the real value.
  if (elevationDeg > maxDeg || elevationDeg < minDeg) {
    const side = elevationDeg > maxDeg ? 'above' : 'below';
    const y = side === 'above' ? 20 : heightPx - 22;
    drawLabelChip(
      ctx,
      `${side === 'above' ? '▲' : '▼'} ${body.label} ${formatSignedDeg(elevationDeg)}`,
      x,
      y,
      { role: body.kind === 'sun' ? 'sun' : 'earth', bold: true },
    );
    ctx.save();
    ctx.strokeStyle = colour;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, side === 'above' ? 0 : heightPx);
    ctx.lineTo(x, side === 'above' ? y - 12 : y - 16);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
    return;
  }

  const hasRadius =
    typeof body.angularRadiusDeg === 'number' && Number.isFinite(body.angularRadiusDeg);
  const radiusPx = hasRadius ? Math.max(2, (body.angularRadiusDeg as number) * pixelsPerDegree) : 4;
  const y = projection.elevationToY(elevationDeg);

  ctx.save();
  if (options.halo !== false && !options.reducedMotion) {
    const glow = ctx.createRadialGradient(x, y, radiusPx * 0.4, x, y, radiusPx * 3.2);
    glow.addColorStop(0, colour);
    glow.addColorStop(1, palette.canvas);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, radiusPx * 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.arc(x, y, radiusPx, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = palette.canvas;
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // A supplied angular radius gets explicit upper/lower limb ticks: the elevation extent of the
  // apparent disk is exactly centre ± radius.
  if (hasRadius) {
    ctx.setLineDash([2, 2]);
    for (const limbY of [y - radiusPx, y + radiusPx]) {
      ctx.beginPath();
      ctx.moveTo(x - radiusPx - 4, limbY);
      ctx.lineTo(x + radiusPx + 4, limbY);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  // Non-colour identification: glyph + text label with the numeric elevation.
  ctx.font = `bold 11px ${CHART_FONT}`;
  const glyph = body.statusGlyph ? `${body.statusGlyph} ` : '';
  drawLabelChip(ctx, `${glyph}${body.label} ${formatSignedDeg(elevationDeg)}`, x, y - radiusPx - 6, {
    role: body.kind === 'sun' ? 'sun' : 'earth',
    align: 'center',
    bold: true,
  });
  ctx.restore();
}

/** Signed clearance shown as a dimension line between the skyline and the body centre. */
export function drawClearanceGauge(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  spec: ClearanceGaugeSpec,
): void {
  if (!projection.isAzimuthVisible(spec.azimuthDeg)) return;
  const palette = chartPalette();
  const x = projection.azimuthToX(spec.azimuthDeg);
  const yHorizon = projection.elevationToY(spec.horizonDeg);
  const yBody = projection.elevationToY(spec.bodyDeg);
  const role = spec.satisfied === null ? 'textMuted' : spec.satisfied ? 'success' : 'danger';

  ctx.save();
  ctx.strokeStyle = palette[role];
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x, yHorizon);
  ctx.lineTo(x, yBody);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const y of [yHorizon, yBody]) {
    ctx.beginPath();
    ctx.moveTo(x - 5, y);
    ctx.lineTo(x + 5, y);
    ctx.stroke();
  }
  ctx.restore();
  drawLabelChip(ctx, spec.clearanceLabel, x + 7, (yHorizon + yBody) / 2 + 3, {
    role,
    bold: true,
  });
}

/** Pinned ridge bearing (preserves the old click-to-pin blocker interaction). */
export function drawPinnedRidge(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  azimuthDeg: number | null | undefined,
): void {
  if (azimuthDeg === null || azimuthDeg === undefined) return;
  if (!projection.isAzimuthVisible(azimuthDeg)) return;
  const palette = chartPalette();
  const x = projection.azimuthToX(azimuthDeg);
  ctx.save();
  ctx.strokeStyle = palette.warning;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, projection.elevation.heightPx);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  drawLabelChip(ctx, `PINNED ${formatDeg(azimuthDeg, 1)}`, x, projection.elevation.heightPx - 18, {
    role: 'warning',
    align: 'center',
    bold: true,
  });
}

export function drawCursorMark(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  cursor: { azimuthDeg: number; elevationDeg: number } | null,
): void {
  if (!cursor) return;
  if (!projection.isAzimuthVisible(cursor.azimuthDeg)) return;
  const palette = chartPalette();
  const x = projection.azimuthToX(cursor.azimuthDeg);
  const y = projection.elevationToY(cursor.elevationDeg);
  ctx.save();
  ctx.strokeStyle = palette.textSecondary;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 3]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, projection.elevation.heightPx);
  ctx.moveTo(0, y);
  ctx.lineTo(projection.azimuth.widthPx, y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.textPrimary;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 8, y);
  ctx.lineTo(x - 5, y);
  ctx.moveTo(x + 5, y);
  ctx.lineTo(x + 8, y);
  ctx.stroke();
  ctx.restore();
}
