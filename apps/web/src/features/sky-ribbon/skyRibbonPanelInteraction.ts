import type React from 'react';
import { applyCursorKey, type SkyCursor } from './skyRibbonCursor';
import { pointerToSkyPosition, type SkyPanelId, type SkyProjection } from './skyRibbonProjection';

/**
 * Pointer and keyboard translation shared by both sky panels.
 *
 * Split from the panel components because these functions only turn an event into a cursor
 * update; they never touch a canvas. Both panels had their own near-identical copy, which is how
 * the two picked up different azimuth snap rules and pushed each component past the AGENTS.md
 * §5.1 presentation cap.
 *
 * The azimuth snap is half a degree: the published horizon bins are coarser than that, so a
 * finer pin would imply a resolution the data does not have.
 */

const PIN_SNAP_DEG = 0.5;

function snapAzimuth(azimuthDeg: number): number {
  return Math.round(azimuthDeg / PIN_SNAP_DEG) * PIN_SNAP_DEG;
}

export interface SkyPanelInteractionDeps {
  readonly panel: SkyPanelId;
  readonly projection: SkyProjection;
  readonly cursor: SkyCursor | null;
  readonly pinnedAzimuthDeg: number | null;
  readonly seedAzimuthDeg: number;
  readonly seedElevationDeg: number;
  readonly onCursorChange: (cursor: SkyCursor | null) => void;
  readonly onPinAzimuth: (azimuthDeg: number | null) => void;
  readonly onHoverAzimuth?: (azimuthDeg: number | null) => void;
}

export function skyPanelPointerMove(
  deps: SkyPanelInteractionDeps,
  event: React.PointerEvent<HTMLDivElement>,
): void {
  const position = pointerToSkyPosition(
    deps.projection,
    event.currentTarget.getBoundingClientRect(),
    event.clientX,
    event.clientY,
  );
  deps.onCursorChange({ panel: deps.panel, ...position, source: 'pointer' });
  deps.onHoverAzimuth?.(position.azimuthDeg);
}

/** Clicking the ridge under the cursor toggles the pin; clicking it again clears it. */
export function skyPanelClick(deps: SkyPanelInteractionDeps): void {
  if (!deps.cursor) return;
  const target = snapAzimuth(deps.cursor.azimuthDeg);
  deps.onPinAzimuth(
    deps.pinnedAzimuthDeg !== null && Math.abs(deps.pinnedAzimuthDeg - target) < PIN_SNAP_DEG / 2
      ? null
      : target,
  );
}

/** The corridor panel pins the snapped cursor on every click rather than toggling. */
export function skyPanelClickPin(deps: SkyPanelInteractionDeps): void {
  if (!deps.cursor) return;
  deps.onPinAzimuth(snapAzimuth(deps.cursor.azimuthDeg));
}

export function skyPanelKeyDown(
  deps: SkyPanelInteractionDeps,
  event: React.KeyboardEvent<HTMLDivElement>,
): void {
  const result = applyCursorKey(deps.cursor, event.key, deps.projection, {
    shiftKey: event.shiftKey,
    seed: { azimuthDeg: deps.seedAzimuthDeg, elevationDeg: deps.seedElevationDeg },
  });
  if (!result.handled) return;
  event.preventDefault();
  if (result.selectRequested) {
    deps.onPinAzimuth(deps.cursor ? snapAzimuth(deps.cursor.azimuthDeg) : null);
    return;
  }
  deps.onCursorChange(result.cursor);
}
