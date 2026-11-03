import React, { useEffect, useId, useMemo } from 'react';
import {
  PANORAMA_HEIGHT_PX,
  createPanoramaProjection,
} from './skyRibbonProjection';
import { paintPanorama } from './skyRibbonPanelPaint';
import { describeCursor, type SkyCursor } from './skyRibbonCursor';
import {
  skyPanelClick,
  skyPanelKeyDown,
  skyPanelPointerMove,
  type SkyPanelInteractionDeps,
} from './skyRibbonPanelInteraction';
import { prepareSkyContext, useSkyCanvasSurface } from './useSkyCanvasSurface';
import type { SkylineSample, SkylineSource, SkylineTopology } from './skyRibbonSkyline';
import type { TrajectorySeries } from './skyRibbonTrajectory';
import type { CelestialBodySpec, ClearanceGaugeSpec } from './skyRibbonCelestialRenderer';
import { SkyPanelLegend } from './SkyPanelLegend';
import { SkyPanelHeader } from './SkyPanelHeader';
import { formatDeg } from './skyRibbonFormat';

export interface SkyContextPanoramaProps {
  skyline: readonly SkylineSample[];
  skylineSource: SkylineSource;
  skylineTopology: SkylineTopology;
  trajectories: readonly TrajectorySeries[];
  sun: CelestialBodySpec | null;
  earth: CelestialBodySpec | null;
  gauge: ClearanceGaugeSpec | null;
  playheadMarker: { azimuthDeg: number; elevationDeg: number; label: string } | null;
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
 * Panel 1 — 360° Panorama Overview.
 *
 * Full azimuth, linear −15°…+90° elevation. Job (docs/ui/INSTRUMENTS.md): where is the skyline, and
 * where are the Sun and Earth relative to it? The terrain reads as a filled body; obstructing
 * sectors are shaded; both apparent tracks distinguish the published sub-interval samples from the
 * interpolated segments between them; the playhead marker carries the UTC instant.
 */
export const SkyContextPanorama: React.FC<SkyContextPanoramaProps> = ({
  skyline,
  skylineSource,
  skylineTopology,
  trajectories,
  sun,
  earth,
  gauge,
  playheadMarker,
  cursor,
  pinnedAzimuthDeg = null,
  reducedMotion,
  onCursorChange,
  onPinAzimuth,
  onHoverAzimuth,
}) => {
  const surface = useSkyCanvasSurface(PANORAMA_HEIGHT_PX);
  const instructionsId = useId();
  const projection = useMemo(
    () => createPanoramaProjection(surface.widthPx, PANORAMA_HEIGHT_PX),
    [surface.widthPx],
  );

  useEffect(() => {
    const ctx = prepareSkyContext(
      surface.canvasRef.current,
      surface.widthPx,
      PANORAMA_HEIGHT_PX,
      surface.pixelRatio,
    );
    if (!ctx) return;
    paintPanorama(ctx, {
      projection,
      skyline,
      sun,
      earth,
      trajectories,
      gauge,
      cursor,
      pinnedAzimuthDeg,
      reducedMotion,
      playhead: playheadMarker,
    });
  }, [
    projection,
    skyline,
    sun,
    earth,
    trajectories,
    gauge,
    cursor,
    pinnedAzimuthDeg,
    reducedMotion,
    playheadMarker,
    surface.canvasRef,
    surface.widthPx,
    surface.pixelRatio,
    surface.renderVersion,
  ]);

  const interaction = useMemo<SkyPanelInteractionDeps>(
    () => ({
      panel: 'panorama',
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
  const handleClick = () => skyPanelClick(interaction);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) =>
    skyPanelKeyDown(interaction, event);

  return (
    <section
      data-testid="sky-panorama-panel"
      aria-label="Panel 1, 360 degree panorama overview"
      className="flex min-w-0 flex-col gap-2 rounded-[var(--lm-radius-md)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)] p-3"
    >
      <SkyPanelHeader
        title="Panel 1 · 360° Panorama"
        subtitle="Where is the skyline, and where are Sun and Earth relative to it?"
        meta={`AZ 000°–360° · EL −15°…+90° · LINEAR`}
        aside={`${skylineTopology.runs.reduce((total, run) => total + run.samples.length, 0)} bins`}
        playheadLabel={playheadMarker?.label ?? null}
      />
      <div
        ref={surface.containerRef}
        className="relative w-full min-w-0 overflow-hidden rounded-[var(--lm-radius-xs)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]"
      >
        <div
          role="application"
          tabIndex={0}
          aria-label={`360 degree panorama: sun elevation ${formatDeg(
            sun?.elevationDeg ?? null,
          )} above the skyline; arrow keys move the cursor, Enter pins the ridge under it`}
          aria-describedby={instructionsId}
          data-testid="sky-panorama-widget"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => onHoverAzimuth?.(null)}
          className={`block w-full cursor-crosshair touch-none rounded-[var(--lm-radius-xs)] ${FOCUS_RING}`}
        >
          <canvas
            ref={surface.canvasRef}
            aria-hidden="true"
            data-testid="sky-panorama-canvas"
            className="block w-full"
            style={{ height: `${PANORAMA_HEIGHT_PX}px` }}
          />
        </div>
      </div>
      <p
        aria-live="polite"
        className="font-mono text-[length:var(--lm-text-micro)] tabular-nums text-[var(--lm-color-text-muted)]"
      >
        {describeCursor(cursor)}
        {pinnedAzimuthDeg !== null ? ` · pinned ridge AZ ${formatDeg(pinnedAzimuthDeg, 1)}` : ''}
      </p>
      <SkyPanelLegend
        skylineSource={skylineSource}
        skylineTopology={skylineTopology}
        trajectories={trajectories}
      />
      <p id={instructionsId} className="sr-only">
        Interactive panorama. Arrow keys move the azimuth and elevation cursor, Shift with arrow
        keys steps five degrees, Page Up and Page Down jump thirty degrees, Home and End jump to the
        0 and 360 degree seam, Enter pins the terrain ridge at the cursor azimuth and Escape clears
        it. Every value on this panel is repeated in the accessible companion table below.
      </p>
    </section>
  );
};
