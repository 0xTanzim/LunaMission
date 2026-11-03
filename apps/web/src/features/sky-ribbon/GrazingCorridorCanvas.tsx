import React, { useEffect, useId, useMemo, useState } from 'react';
import { CORRIDOR_HEIGHT_PX, createCorridorProjection } from './skyRibbonProjection';
import { paintGrazingCorridor } from './skyRibbonPanelPaint';
import { CorridorHeader } from './CorridorHeader';
import { DiskVerdict } from './CorridorDiskVerdict';
import { SkyPanelLegend } from './SkyPanelLegend';
import { describeCursor, type SkyCursor } from './skyRibbonCursor';
import {
  skyPanelClickPin,
  skyPanelKeyDown,
  skyPanelPointerMove,
  type SkyPanelInteractionDeps,
} from './skyRibbonPanelInteraction';
import { prepareSkyContext, useSkyCanvasSurface } from './useSkyCanvasSurface';
import type { SkylineSample, SkylineSource, SkylineTopology } from './skyRibbonSkyline';
import type { CelestialBodySpec, ClearanceGaugeSpec } from './skyRibbonCelestialRenderer';
import type { SolarDiskModel } from './skyRibbonDisk';
import type { SolarReadout } from './skyRibbonAnalysis';
import { formatDeg } from './skyRibbonFormat';

export interface GrazingCorridorCanvasProps {
  skyline: readonly SkylineSample[];
  skylineSource: SkylineSource;
  skylineTopology: SkylineTopology;
  sun: CelestialBodySpec | null;
  earth: CelestialBodySpec | null;
  gauge: ClearanceGaugeSpec | null;
  disk: SolarDiskModel;
  solar: SolarReadout;
  contact: { azimuthDeg: number; horizonDeg: number } | null;
  grazingMarkers: { azimuthDeg: number; elevationDeg: number; isActive: boolean }[];
  cursor: SkyCursor | null;
  pinnedAzimuthDeg?: number | null;
  reducedMotion: boolean;
  onCursorChange: (cursor: SkyCursor | null) => void;
  onPinAzimuth: (azimuthDeg: number | null) => void;
  onHoverAzimuth?: (azimuthDeg: number | null) => void;
}

const FOCUS_RING =
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lm-color-info)]';

/**
 * Panel 2 — Dedicated Grazing Corridor (the decision-critical panel).
 *
 * Job: how does the apparent solar disk intersect the terrain skyline at this instant?
 *
 * Fixed, strictly linear −5°…+10° elevation axis: one affine transform for the entire panel, no
 * scale break and no magnified segment, so limb clearance and terrain contact stay readable to a
 * fraction of a degree. Narrowing the azimuth arc never changes the elevation scale.
 *
 * The apparent disk is drawn only from supplied geometry (plan §4). No celestial reconstruction,
 * no limb trigonometry, no azimuth footprint inferred from a radius.
 */
export const GrazingCorridorCanvas: React.FC<GrazingCorridorCanvasProps> = ({
  skyline,
  skylineSource,
  skylineTopology,
  sun,
  earth,
  gauge,
  disk,
  solar,
  contact,
  grazingMarkers,
  cursor,
  pinnedAzimuthDeg = null,
  reducedMotion,
  onCursorChange,
  onPinAzimuth,
  onHoverAzimuth,
}) => {
  const surface = useSkyCanvasSurface(CORRIDOR_HEIGHT_PX);
  const instructionsId = useId();
  const [azimuthSpanDeg, setAzimuthSpanDeg] = useState(360);
  const centerAzimuthDeg = sun?.azimuthDeg ?? 180;

  const projection = useMemo(
    () => createCorridorProjection(surface.widthPx, centerAzimuthDeg, azimuthSpanDeg, CORRIDOR_HEIGHT_PX),
    [surface.widthPx, centerAzimuthDeg, azimuthSpanDeg],
  );

  useEffect(() => {
    const ctx = prepareSkyContext(
      surface.canvasRef.current,
      surface.widthPx,
      CORRIDOR_HEIGHT_PX,
      surface.pixelRatio,
    );
    if (!ctx) return;
    paintGrazingCorridor(ctx, {
      projection, azimuthSpanDeg, skyline, sun, earth, gauge,
      disk, contact, grazingMarkers, cursor, pinnedAzimuthDeg, reducedMotion,
    });
  }, [
    projection, azimuthSpanDeg, skyline, sun, earth, gauge, disk,
    contact, grazingMarkers, cursor, pinnedAzimuthDeg, reducedMotion,
    surface.canvasRef, surface.widthPx, surface.pixelRatio, surface.renderVersion,
  ]);

  const interaction = useMemo<SkyPanelInteractionDeps>(
    () => ({
      panel: 'grazing-corridor',
      projection,
      cursor,
      pinnedAzimuthDeg,
      seedAzimuthDeg: sun?.azimuthDeg ?? 0,
      seedElevationDeg: sun?.elevationDeg ?? 0,
      onCursorChange,
      onPinAzimuth,
      onHoverAzimuth,
    }),
    [projection, cursor, pinnedAzimuthDeg, sun, onCursorChange, onPinAzimuth, onHoverAzimuth],
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) =>
    skyPanelPointerMove(interaction, event);
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) =>
    skyPanelKeyDown(interaction, event);

  return (
    <section
      data-testid="grazing-corridor-panel"
      aria-label="Panel 2, dedicated grazing corridor"
      className="flex min-w-0 flex-col gap-2 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-info-border)] bg-[var(--lm-color-surface)] p-3"
    >
      <CorridorHeader disk={disk} spanDeg={azimuthSpanDeg} onSpanChange={setAzimuthSpanDeg} />
      <DiskVerdict solar={solar} disk={disk} />
      <div
        ref={surface.containerRef}
        className="relative w-full min-w-0 overflow-hidden rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]"
      >
        <div
          role="application"
          tabIndex={0}
          aria-label={`Grazing corridor: sun centre elevation ${formatDeg(
            sun?.elevationDeg ?? null,
          )} on a linear minus five to plus ten degree axis; arrow keys move the cursor, Enter pins the ridge under it`}
          aria-describedby={instructionsId}
          data-testid="grazing-corridor-widget"
          onClick={() => skyPanelClickPin(interaction)}
          onKeyDown={handleKeyDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => onHoverAzimuth?.(null)}
          className={`block w-full cursor-crosshair touch-none rounded-[var(--lm-radius-xs)] ${FOCUS_RING}`}
        >
          <canvas
            ref={surface.canvasRef}
            aria-hidden="true"
            data-testid="grazing-corridor-canvas"
            className="block w-full"
            style={{ height: `${CORRIDOR_HEIGHT_PX}px` }}
          />
        </div>
      </div>
      <p
        aria-live="polite"
        className="font-mono text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-muted)]"
      >
        {describeCursor(cursor)} · {projection.elevation.pixelsPerDegree.toFixed(1)} px/° constant ·
        0.1° = {(projection.elevation.pixelsPerDegree * 0.1).toFixed(1)} px
      </p>
      <SkyPanelLegend
        skylineSource={skylineSource}
        skylineTopology={skylineTopology}
        trajectories={[]}
        disk={disk}
        showGrazingWindows={grazingMarkers.length > 0}
      />
      <p id={instructionsId} className="sr-only">
        Interactive grazing corridor. Arrow keys move the azimuth and elevation cursor, Shift with
        arrow keys steps one degree, Page Up and Page Down jump thirty degrees, Home and End jump to
        the 0 and 360 degree seam, Enter pins the terrain ridge at the cursor azimuth. Every value is
        repeated in the accessible companion table below.
      </p>
    </section>
  );
};
