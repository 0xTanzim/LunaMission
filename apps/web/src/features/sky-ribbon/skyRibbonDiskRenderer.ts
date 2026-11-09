/**
 * Apparent solar disk drawing for the grazing corridor (plan §4).
 *
 * The panel renders *supplied* geometry only. Nothing in this module computes a celestial
 * position, a limb offset or an azimuth footprint:
 *  - `boundary` samples from the backend are projected through the panel's own affine az/el
 *    transform and drawn as a polygon;
 *  - `limb-only` draws the elevation extent (centre ± radius) with explicit limb ticks;
 *  - `unsupported` draws an explicit "outline unavailable" statement instead of a circle, which
 *    would assert a shape the coordinate frame cannot guarantee.
 */

import type { SkyProjection } from './skyRibbonProjection';
import { chartPalette } from './chartPalette';
import { CHART_FONT, drawLabelChip } from './skyRibbonRenderer';
import { formatSignedDeg } from './skyRibbonFormat';
import type { SolarDiskModel } from './skyRibbonDisk';

const LIMB_TICK_HALF_WIDTH_PX = 9;

function projectBoundary(
  projection: SkyProjection,
  model: Extract<SolarDiskModel, { kind: 'boundary' }>,
): { x: number; y: number }[] {
  return model.geometry.boundary
    .filter((sample) => Number.isFinite(sample.azimuthDeg) && Number.isFinite(sample.elevationDeg))
    .map((sample) => ({
      x: projection.azimuthToX(sample.azimuthDeg),
      y: projection.elevationToY(sample.elevationDeg),
    }));
}

/** Disk boundary exactly as supplied — one polygon vertex per backend sample, in order. */
export function drawSuppliedDiskBoundary(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  model: Extract<SolarDiskModel, { kind: 'boundary' }>,
  centreAzimuthDeg: number,
): void {
  const palette = chartPalette();
  const points = projectBoundary(projection, model);
  if (points.length < 3) return;
  const x = projection.azimuthToX(centreAzimuthDeg);

  ctx.save();
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = palette.sun;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = palette.sun;
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Boundary vertices are the published samples: mark them so the polygon is not mistaken for a
  // smooth fitted curve.
  ctx.fillStyle = palette.sun;
  for (const point of points) {
    ctx.beginPath();
    ctx.arc(point.x, point.y, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  drawLabelChip(ctx, `UPPER LIMB ${formatSignedDeg(model.upperLimbDeg)}`, x + 12, projection.elevationToY(model.upperLimbDeg), {
    role: 'sun',
    bold: true,
  });
  drawLabelChip(ctx, `LOWER LIMB ${formatSignedDeg(model.lowerLimbDeg)}`, x + 12, projection.elevationToY(model.lowerLimbDeg) + 12, {
    role: 'sun',
    bold: true,
  });
}

/**
 * Radius-only case: the elevation extent is exact, the azimuth footprint is not drawn. The
 * bracket states both facts rather than drawing a plausible ellipse.
 */
export function drawLimbBand(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  model: Extract<SolarDiskModel, { kind: 'limb-only' }>,
  centreAzimuthDeg: number,
  centreElevationDeg: number,
): void {
  const palette = chartPalette();
  const x = projection.azimuthToX(centreAzimuthDeg);
  const yUpper = projection.elevationToY(model.upperLimbDeg);
  const yLower = projection.elevationToY(model.lowerLimbDeg);
  const yCentre = projection.elevationToY(centreElevationDeg);

  ctx.save();
  ctx.strokeStyle = palette.sun;
  ctx.lineWidth = 1.4;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(x, yUpper);
  ctx.lineTo(x, yLower);
  ctx.stroke();
  ctx.setLineDash([]);
  for (const y of [yUpper, yLower]) {
    ctx.beginPath();
    ctx.moveTo(x - LIMB_TICK_HALF_WIDTH_PX, y);
    ctx.lineTo(x + LIMB_TICK_HALF_WIDTH_PX, y);
    ctx.stroke();
  }
  ctx.fillStyle = palette.textSecondary;
  ctx.beginPath();
  ctx.arc(x, yCentre, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  drawLabelChip(ctx, `UPPER LIMB ${formatSignedDeg(model.upperLimbDeg)}`, x + 12, yUpper, {
    role: 'sun',
    bold: true,
  });
  drawLabelChip(ctx, `LOWER LIMB ${formatSignedDeg(model.lowerLimbDeg)}`, x + 12, yLower, {
    role: 'sun',
    bold: true,
  });
  drawLabelChip(
    ctx,
    `AZ FOOTPRINT NOT DRAWN · radius ${model.angularRadiusDeg.toFixed(3)}° is angular, not projected (§4)`,
    x + 12,
    yCentre + 14,
    { role: 'textMuted' },
  );
}

/** Skyline contact at the body's own azimuth, from the backend's horizon-mask value. */
export function drawSkylineContact(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  contact: { azimuthDeg: number; horizonDeg: number },
): void {
  if (!projection.isAzimuthVisible(contact.azimuthDeg)) return;
  const palette = chartPalette();
  const x = projection.azimuthToX(contact.azimuthDeg);
  const y = projection.elevationToY(contact.horizonDeg);
  ctx.save();
  ctx.strokeStyle = palette.danger;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 6, y);
  ctx.lineTo(x + 6, y);
  ctx.moveTo(x, y - 6);
  ctx.lineTo(x, y + 6);
  ctx.stroke();
  ctx.restore();
  drawLabelChip(ctx, `SKYLINE ${formatSignedDeg(contact.horizonDeg)}`, x - 10, y - 6, {
    role: 'danger',
    align: 'right',
  });
}

/** Marks the sub-intervals whose visible disk is partial — the critical grazing windows. */
export function drawGrazingMarkers(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  markers: readonly { azimuthDeg: number; elevationDeg: number; isActive: boolean }[],
): void {
  const palette = chartPalette();
  ctx.save();
  ctx.font = `bold 11px ${CHART_FONT}`;
  for (const marker of markers) {
    if (!projection.isAzimuthVisible(marker.azimuthDeg)) continue;
    const x = projection.azimuthToX(marker.azimuthDeg);
    const y = projection.elevationToY(marker.elevationDeg);
    ctx.fillStyle = marker.isActive ? palette.warning : palette.danger;
    ctx.beginPath();
    ctx.moveTo(x, y - 9);
    ctx.lineTo(x + 4, y - 15);
    ctx.lineTo(x - 4, y - 15);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/** Explicit statement that the 2-D disk is not available, next to the centre marker. */
export function drawDiskUnsupportedNotice(
  ctx: CanvasRenderingContext2D,
  projection: SkyProjection,
  azimuthDeg: number,
  elevationDeg: number,
): void {
  if (!projection.isAzimuthVisible(azimuthDeg)) return;
  const x = projection.azimuthToX(azimuthDeg);
  const y = projection.elevationToY(elevationDeg);
  const palette = chartPalette();
  ctx.save();
  ctx.strokeStyle = palette.warning;
  ctx.setLineDash([2, 2]);
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 7, y - 7, 14, 14);
  ctx.setLineDash([]);
  ctx.restore();
  ctx.font = `bold 11px ${CHART_FONT}`;
  const noticeText = 'DISK OUTLINE UNSUPPORTED';
  const textWidth = ctx.measureText(noticeText).width;
  let labelX = x + 12;
  let align: CanvasTextAlign = 'left';
  if (x + 12 + textWidth > projection.azimuth.widthPx - 8) {
    labelX = x - 12;
    align = 'right';
  }
  const labelY = y > 24 ? y - 18 : y + 24;
  drawLabelChip(ctx, noticeText, labelX, labelY, { role: 'warning', bold: true, align });
}
