/**
 * Keyboard cursor model for the Dual-Panel Sky-Ribbon (WCAG 2.1 AA — 2.1.1).
 *
 * The canvases are pointer-inspectable, but pointer inspection is not a keyboard
 * affordance. Both panels therefore expose a single keyboard cursor: arrow keys
 * step the azimuth/elevation, PageUp/PageDown step the azimuth coarsely,
 * Home/End jump to the 0°/360° seam, Enter pins the ridge under the cursor and
 * Escape clears it. The reducer is pure so keyboard behaviour is verified
 * without a DOM.
 */

import {
  FULL_CIRCLE_DEG,
  normalizeAzimuthDeg,
  type SkyPanelId,
  type SkyProjection,
} from './skyRibbonProjection';

export const CURSOR_STEP_DEG = {
  azimuthFine: 0.5,
  azimuthCoarse: 5,
  azimuthPage: 30,
  elevationFine: 0.1,
  elevationCoarse: 1,
} as const;

export type SkyCursorSource = 'pointer' | 'keyboard';

export interface SkyCursor {
  readonly panel: SkyPanelId;
  readonly azimuthDeg: number;
  readonly elevationDeg: number;
  readonly source: SkyCursorSource;
}

export interface CursorKeyResult {
  /** False when the key is not part of the cursor contract (browser default kept). */
  readonly handled: boolean;
  readonly cursor: SkyCursor | null;
  /** True when the key asks to pin/clear the ridge at the cursor azimuth. */
  readonly selectRequested: boolean;
}

const UNHANDLED: CursorKeyResult = { handled: false, cursor: null, selectRequested: false };

function clampElevation(elevationDeg: number, projection: SkyProjection): number {
  const { minDeg, maxDeg } = projection.elevation;
  return Math.min(maxDeg, Math.max(minDeg, elevationDeg));
}

/**
 * Reduces a keyboard event key into the next cursor state.
 *
 * @param current  Active cursor or null when the panel has not been inspected yet.
 * @param key      KeyboardEvent.key
 * @param projection Panel projection, used only for axis bounds and panel id.
 * @param options  shiftKey selects the coarse azimuth/elevation step; `seed`
 *                 positions the cursor on first keyboard interaction (typically
 *                 the Sun's azimuth/elevation supplied by the backend).
 */
export function applyCursorKey(
  current: SkyCursor | null,
  key: string,
  projection: SkyProjection,
  options: { shiftKey?: boolean; seed?: { azimuthDeg: number; elevationDeg: number } } = {},
): CursorKeyResult {
  const step = options.shiftKey ? CURSOR_STEP_DEG.azimuthCoarse : CURSOR_STEP_DEG.azimuthFine;
  const elevationStep = options.shiftKey
    ? CURSOR_STEP_DEG.elevationCoarse
    : CURSOR_STEP_DEG.elevationFine;

  const seedAzimuth = options.seed?.azimuthDeg ?? projection.azimuth.startDeg;
  const seedElevation = options.seed?.elevationDeg ?? 0;
  const base: SkyCursor = current
    ? current
    : {
        panel: projection.panel,
        azimuthDeg: normalizeAzimuthDeg(seedAzimuth),
        elevationDeg: clampElevation(seedElevation, projection),
        source: 'keyboard',
      };

  const withAzimuth = (azimuthDeg: number): CursorKeyResult => ({
    handled: true,
    cursor: {
      ...base,
      azimuthDeg: normalizeAzimuthDeg(azimuthDeg),
      source: 'keyboard',
    },
    selectRequested: false,
  });

  const withElevation = (elevationDeg: number): CursorKeyResult => ({
    handled: true,
    cursor: {
      ...base,
      elevationDeg: clampElevation(elevationDeg, projection),
      source: 'keyboard',
    },
    selectRequested: false,
  });

  switch (key) {
    case 'ArrowRight':
      return withAzimuth(base.azimuthDeg + step);
    case 'ArrowLeft':
      return withAzimuth(base.azimuthDeg - step);
    case 'ArrowUp':
      return withElevation(base.elevationDeg + elevationStep);
    case 'ArrowDown':
      return withElevation(base.elevationDeg - elevationStep);
    case 'PageUp':
      return withAzimuth(base.azimuthDeg + CURSOR_STEP_DEG.azimuthPage);
    case 'PageDown':
      return withAzimuth(base.azimuthDeg - CURSOR_STEP_DEG.azimuthPage);
    case 'Home':
      return withAzimuth(0);
    case 'End':
      return withAzimuth(FULL_CIRCLE_DEG - CURSOR_STEP_DEG.azimuthFine);
    case 'Enter':
    case ' ':
      return { handled: true, cursor: { ...base, source: 'keyboard' }, selectRequested: true };
    case 'Escape':
      return { handled: true, cursor: null, selectRequested: false };
    default:
      return UNHANDLED;
  }
}

/** Formats the cursor for the visible readout strip. */
export function describeCursor(cursor: SkyCursor | null): string {
  if (!cursor) return 'No cursor';
  const azimuth = cursor.azimuthDeg.toFixed(1);
  const elevation = `${cursor.elevationDeg >= 0 ? '+' : ''}${cursor.elevationDeg.toFixed(2)}`;
  const panel = cursor.panel === 'panorama' ? 'Panorama' : 'Grazing Corridor';
  return `${panel} cursor · AZ ${azimuth}° · EL ${elevation}°`;
}
