/**
 * Dual-Panel Sky-Ribbon 2.0 — pure axis projections (ADR-03).
 *
 * Both panels use ONE strictly affine mapping per axis:
 *
 *   elevationToY(el) = (maxDeg - el) * pixelsPerDegree      (constant ppd, no break)
 *   azimuthToX(az)   = offsetInWindow(az) * pixelsPerDegree (constant ppd, no break)
 *
 * There is no piecewise term, no scale break and no hidden clamp inside the
 * transform, so grazing geometry keeps a constant pixels-per-degree across the
 * whole panel. Geometry outside the axis is *not* warped back inside the panel:
 * callers clip it and flag it explicitly (`isElevationVisible` +
 * `drawOutOfBandFlag`), which is why near-horizon clearance stays honest.
 *
 * Zero astronomy, zero terrain maths: degrees in, pixels out.
 */

export const FULL_CIRCLE_DEG = 360;

export const PANORAMA_MIN_ELEVATION_DEG = -15;
export const PANORAMA_MAX_ELEVATION_DEG = 90;
export const PANORAMA_HEIGHT_PX = 264;

export const CORRIDOR_MIN_ELEVATION_DEG = -5;
export const CORRIDOR_MAX_ELEVATION_DEG = 10;
export const CORRIDOR_HEIGHT_PX = 324;

export type SkyPanelId = 'panorama' | 'grazing-corridor';

export interface ElevationAxis {
  readonly minDeg: number;
  readonly maxDeg: number;
  readonly heightPx: number;
  /** Constant for the whole axis by construction — the linearity invariant. */
  readonly pixelsPerDegree: number;
}

export interface AzimuthAxis {
  readonly startDeg: number;
  readonly spanDeg: number;
  readonly widthPx: number;
  readonly pixelsPerDegree: number;
}

export interface SkyProjection {
  readonly panel: SkyPanelId;
  readonly elevation: ElevationAxis;
  readonly azimuth: AzimuthAxis;
  elevationToY(elevationDeg: number): number;
  yToElevation(pixelY: number): number;
  azimuthToX(azimuthDeg: number): number;
  xToAzimuth(pixelX: number): number;
  isElevationVisible(elevationDeg: number): boolean;
  isAzimuthVisible(azimuthDeg: number): boolean;
}

/** Normalizes any bearing into strictly [0, 360). */
export function normalizeAzimuthDeg(azimuthDeg: number): number {
  const wrapped = azimuthDeg % FULL_CIRCLE_DEG;
  return wrapped < 0 ? wrapped + FULL_CIRCLE_DEG : wrapped;
}

function createProjection(
  panel: SkyPanelId,
  minElevationDeg: number,
  maxElevationDeg: number,
  heightPx: number,
  startDeg: number,
  spanDeg: number,
  widthPx: number,
): SkyProjection {
  const safeWidthPx = widthPx > 0 ? widthPx : 1;
  const elevationPixelsPerDegree = heightPx / (maxElevationDeg - minElevationDeg);
  const azimuthPixelsPerDegree = safeWidthPx / spanDeg;

  /**
   * Bearing offset inside the azimuth window. For a partial window the nearest
   * circular representation is chosen, so terrain a degree left of the window
   * lands a degree off the left edge (then clipped) instead of wrapping to the
   * far right edge.
   */
  const offsetInWindow = (azimuthDeg: number): number => {
    const raw = normalizeAzimuthDeg(azimuthDeg - startDeg);
    if (spanDeg >= FULL_CIRCLE_DEG) return raw;
    return raw > spanDeg + (FULL_CIRCLE_DEG - spanDeg) / 2 ? raw - FULL_CIRCLE_DEG : raw;
  };

  return {
    panel,
    elevation: {
      minDeg: minElevationDeg,
      maxDeg: maxElevationDeg,
      heightPx,
      pixelsPerDegree: elevationPixelsPerDegree,
    },
    azimuth: {
      startDeg,
      spanDeg,
      widthPx: safeWidthPx,
      pixelsPerDegree: azimuthPixelsPerDegree,
    },
    elevationToY: (elevationDeg) => (maxElevationDeg - elevationDeg) * elevationPixelsPerDegree,
    yToElevation: (pixelY) => maxElevationDeg - pixelY / elevationPixelsPerDegree,
    azimuthToX: (azimuthDeg) => offsetInWindow(azimuthDeg) * azimuthPixelsPerDegree,
    xToAzimuth: (pixelX) => normalizeAzimuthDeg(startDeg + (pixelX / safeWidthPx) * spanDeg),
    isElevationVisible: (elevationDeg) =>
      elevationDeg <= maxElevationDeg && elevationDeg >= minElevationDeg,
    isAzimuthVisible: (azimuthDeg) => {
      const offset = offsetInWindow(azimuthDeg);
      return offset >= 0 && offset < spanDeg;
    },
  };
}

/** Panel 1: full 360° azimuth panorama, linear -15° … +90° elevation. */
export function createPanoramaProjection(
  widthPx: number,
  heightPx: number = PANORAMA_HEIGHT_PX,
): SkyProjection {
  return createProjection(
    'panorama',
    PANORAMA_MIN_ELEVATION_DEG,
    PANORAMA_MAX_ELEVATION_DEG,
    heightPx,
    0,
    FULL_CIRCLE_DEG,
    widthPx,
  );
}

export interface CorridorFocusPreset {
  readonly id: string;
  readonly label: string;
  readonly spanDeg: number;
}

export const CORRIDOR_FOCUS_PRESETS: readonly CorridorFocusPreset[] = [
  { id: 'full-circle', label: '360°', spanDeg: 360 },
  { id: 'sector-60', label: '±30° arc', spanDeg: 60 },
  { id: 'sector-20', label: '±10° arc', spanDeg: 20 },
];

/**
 * Panel 2: fixed, strictly linear -5° … +10° elevation corridor. Azimuth stays
 * linear; the operator may narrow the azimuth window around the Sun without
 * touching the elevation scale (the corridor never re-scales vertically).
 */
export function createCorridorProjection(
  widthPx: number,
  centerAzimuthDeg: number = 180,
  spanDeg: number = FULL_CIRCLE_DEG,
  heightPx: number = CORRIDOR_HEIGHT_PX,
): SkyProjection {
  const clampedSpan = Math.min(FULL_CIRCLE_DEG, Math.max(10, spanDeg));
  return createProjection(
    'grazing-corridor',
    CORRIDOR_MIN_ELEVATION_DEG,
    CORRIDOR_MAX_ELEVATION_DEG,
    heightPx,
    normalizeAzimuthDeg(centerAzimuthDeg - clampedSpan / 2),
    clampedSpan,
    widthPx,
  );
}

/** Clamps a value into an axis domain (used for labels/glyphs only, never for transforms). */
export function clampToElevationAxis(valueDeg: number, axis: ElevationAxis): number {
  if (!Number.isFinite(valueDeg)) return axis.minDeg;
  return Math.min(axis.maxDeg, Math.max(axis.minDeg, valueDeg));
}

/**
 * Screen position → sky position, for pointer interaction. Pure so it can be
 * verified without a DOM.
 */
export function pointerToSkyPosition(
  projection: SkyProjection,
  rect: { left: number; top: number },
  clientX: number,
  clientY: number,
): { azimuthDeg: number; elevationDeg: number } {
  return {
    azimuthDeg: projection.xToAzimuth(clientX - rect.left),
    elevationDeg: projection.yToElevation(clientY - rect.top),
  };
}
