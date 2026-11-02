/**
 * Draw sequences for the two Sky-Ribbon panels.
 *
 * Kept out of the React components so the panels stay small and the drawing order is testable.
 * Every routine here is presentation: positions arrive from the backend, projected through the
 * panel's own affine transform.
 */

import type { SkyProjection } from './skyRibbonProjection';
import type { SkylineSample } from './skyRibbonSkyline';
import type { TrajectorySeries } from './skyRibbonTrajectory';
import type { SolarDiskModel } from './skyRibbonDisk';
import { drawAzimuthGraticule, drawElevationBand, drawElevationGraticule, drawPanelBackground, drawScaleLegend } from './skyRibbonRenderer';
import { drawSkyline } from './skyRibbonSkylineRenderer';
import type { CelestialBodySpec, ClearanceGaugeSpec } from './skyRibbonCelestialRenderer';
import { drawCelestialBody, drawClearanceGauge, drawCursorMark, drawPinnedRidge } from './skyRibbonCelestialRenderer';
import { drawPlayheadMarker, drawTrajectory } from './skyRibbonTrajectoryRenderer';
import {
  drawDiskUnsupportedNotice,
  drawGrazingMarkers,
  drawLimbBand,
  drawSkylineContact,
  drawSuppliedDiskBoundary,
} from './skyRibbonDiskRenderer';
import { formatDeg } from './skyRibbonFormat';

export interface PanoramaPaintInput {
  readonly projection: SkyProjection;
  readonly skyline: readonly SkylineSample[];
  readonly sun: CelestialBodySpec | null;
  readonly earth: CelestialBodySpec | null;
  readonly trajectories: readonly TrajectorySeries[];
  readonly gauge: ClearanceGaugeSpec | null;
  readonly cursor: { azimuthDeg: number; elevationDeg: number } | null;
  readonly pinnedAzimuthDeg: number | null;
  readonly reducedMotion: boolean;
  readonly playhead: { azimuthDeg: number; elevationDeg: number; label: string } | null;
}

export function paintPanorama(ctx: CanvasRenderingContext2D, input: PanoramaPaintInput): void {
  const { projection, reducedMotion } = input;
  drawPanelBackground(ctx, projection);
  drawAzimuthGraticule(ctx, projection, 45);
  drawElevationGraticule(ctx, projection, 15);
  drawElevationBand(ctx, projection, -2, 2, 'GRAZING BAND ±2°');
  drawSkyline(ctx, projection, input.skyline, {
    occluderElevationDeg: input.sun?.elevationDeg ?? 0,
  });
  for (const series of input.trajectories) drawTrajectory(ctx, projection, series);
  if (input.gauge) drawClearanceGauge(ctx, projection, input.gauge);
  if (input.earth) drawCelestialBody(ctx, projection, input.earth, { reducedMotion });
  if (input.sun) drawCelestialBody(ctx, projection, input.sun, { reducedMotion });
  if (input.playhead) drawPlayheadMarker(ctx, projection, input.playhead);
  drawPinnedRidge(ctx, projection, input.pinnedAzimuthDeg);
  drawCursorMark(ctx, projection, input.cursor);
  drawScaleLegend(
    ctx,
    projection,
    `${projection.elevation.pixelsPerDegree.toFixed(1)} px/° linear · ${formatDeg(
      projection.elevation.minDeg,
      0,
    )}…+${formatDeg(projection.elevation.maxDeg, 0)} · NO SCALE BREAK`,
  );
}

export interface CorridorPaintInput {
  readonly projection: SkyProjection;
  readonly azimuthSpanDeg: number;
  readonly skyline: readonly SkylineSample[];
  readonly sun: CelestialBodySpec | null;
  readonly earth: CelestialBodySpec | null;
  readonly gauge: ClearanceGaugeSpec | null;
  readonly disk: SolarDiskModel;
  readonly contact: { azimuthDeg: number; horizonDeg: number } | null;
  readonly grazingMarkers: readonly { azimuthDeg: number; elevationDeg: number; isActive: boolean }[];
  readonly cursor: { azimuthDeg: number; elevationDeg: number } | null;
  readonly pinnedAzimuthDeg: number | null;
  readonly reducedMotion: boolean;
}

export function paintGrazingCorridor(ctx: CanvasRenderingContext2D, input: CorridorPaintInput): void {
  const { projection, reducedMotion, sun } = input;
  drawPanelBackground(ctx, projection);
  drawAzimuthGraticule(ctx, projection, input.azimuthSpanDeg > 180 ? 45 : 10);
  drawElevationGraticule(ctx, projection, 1);
  drawSkyline(ctx, projection, input.skyline, {
    occluderElevationDeg: sun?.elevationDeg ?? null,
  });

  const centreAzimuthDeg = sun?.azimuthDeg ?? null;
  const centreElevationDeg = sun?.elevationDeg ?? null;
  if (centreAzimuthDeg !== null && centreElevationDeg !== null) {
    if (input.disk.kind === 'boundary') {
      drawSuppliedDiskBoundary(ctx, projection, input.disk, centreAzimuthDeg);
    } else if (input.disk.kind === 'limb-only') {
      drawLimbBand(ctx, projection, input.disk, centreAzimuthDeg, centreElevationDeg);
    } else {
      drawGrazingMarkers(ctx, projection, input.grazingMarkers);
      drawDiskUnsupportedNotice(ctx, projection, centreAzimuthDeg, centreElevationDeg);
    }
  }
  if (input.disk.kind !== 'unsupported') drawGrazingMarkers(ctx, projection, input.grazingMarkers);
  if (input.contact) drawSkylineContact(ctx, projection, input.contact);
  if (input.gauge) drawClearanceGauge(ctx, projection, input.gauge);
  if (input.earth) drawCelestialBody(ctx, projection, input.earth, { reducedMotion, halo: false });
  if (input.sun) drawCelestialBody(ctx, projection, input.sun, { reducedMotion, halo: false });
  drawPinnedRidge(ctx, projection, input.pinnedAzimuthDeg);
  drawCursorMark(ctx, projection, input.cursor);
  drawScaleLegend(
    ctx,
    projection,
    `${projection.elevation.pixelsPerDegree.toFixed(1)} px/° constant · EL ${formatDeg(
      projection.elevation.minDeg,
      1,
    )}…+${formatDeg(projection.elevation.maxDeg, 1)} · NO SCALE BREAK`,
  );
}
