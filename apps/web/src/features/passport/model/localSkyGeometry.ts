/**
 * Shared coordinate frame for the local-sky azimuth/elevation charts. Both the
 * compact Passport diagram and the expanded inspector plot the same topocentric
 * horizon frame; only their pixel extents, padding and sample density differ.
 * Keeping the mapping here means the two views cannot drift apart.
 */

import type { CalculationMode } from '@/domain/celestial/calculationMode';

/** The horizon frame's plotted elevation band, in degrees above/below the local plane. */
export const HORIZON_MIN_ELEV_DEG = -6;
export const HORIZON_MAX_ELEV_DEG = 22;

/** Gridlines drawn on both charts. */
export const HORIZON_ELEV_GRID_DEG = [-5, 0, 5, 10, 15, 20] as const;

export interface HorizonFrameSpec {
  viewBoxW: number;
  viewBoxH: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export interface HorizonFrame {
  viewBoxW: number;
  viewBoxH: number;
  padLeft: number;
  padTop: number;
  chartW: number;
  chartH: number;
  plotRight: number;
  plotBottom: number;
  /** y of the 0° reference plane. */
  zeroY: number;
  elevToY(elevationDeg: number): number;
  azToX(azimuthDeg: number): number;
}

export function createHorizonFrame(spec: HorizonFrameSpec): HorizonFrame {
  const { viewBoxW, viewBoxH, padLeft, padRight, padTop, padBottom } = spec;
  const chartW = viewBoxW - padLeft - padRight;
  const chartH = viewBoxH - padTop - padBottom;

  const elevToY = (elev: number): number => {
    const clamped = Math.max(HORIZON_MIN_ELEV_DEG, Math.min(HORIZON_MAX_ELEV_DEG, elev));
    const ratio =
      (clamped - HORIZON_MIN_ELEV_DEG) / (HORIZON_MAX_ELEV_DEG - HORIZON_MIN_ELEV_DEG);
    return padTop + chartH * (1 - ratio);
  };

  const azToX = (az: number): number => {
    const normAz = ((az % 360) + 360) % 360;
    return padLeft + (normAz / 360) * chartW;
  };

  return {
    viewBoxW,
    viewBoxH,
    padLeft,
    padTop,
    chartW,
    chartH,
    plotRight: padLeft + chartW,
    plotBottom: padTop + chartH,
    zeroY: elevToY(0),
    elevToY,
    azToX,
  };
}

/**
 * Terrain silhouette as a closed polygon along the bottom of the frame.
 * Geometry-only mode flattens it to the 0° spherical horizon.
 */
export function terrainSilhouettePath(
  frame: HorizonFrame,
  options: {
    mode: CalculationMode;
    meanTerrainHorizonDeg: number;
    maxTerrainObstructionDeg: number;
    steps: number;
  },
): string {
  const { mode, meanTerrainHorizonDeg, maxTerrainObstructionDeg, steps } = options;
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const az = (i / steps) * 360;
    const x = frame.azToX(az);
    const variation = Math.sin((az * Math.PI) / 90) * 0.4 + Math.cos((az * Math.PI) / 45) * 0.3;
    const terrDeg =
      mode === 'terrain-aware'
        ? Math.max(0, meanTerrainHorizonDeg + variation * (maxTerrainObstructionDeg - meanTerrainHorizonDeg))
        : 0;
    const y = frame.elevToY(terrDeg);
    points.push(`${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${points.join(' ')} L ${frame.padLeft + frame.chartW} ${frame.padTop + frame.chartH} L ${frame.padLeft} ${frame.padTop + frame.chartH} Z`;
}

/**
 * Compact Passport diagram and expanded inspector use the same frame maths at
 * different pixel extents / sampling densities.
 */
export const COMPACT_FRAME_SPEC: HorizonFrameSpec = {
  viewBoxW: 560,
  viewBoxH: 160,
  padLeft: 45,
  padRight: 20,
  padTop: 15,
  padBottom: 25,
};

export const EXPANDED_FRAME_SPEC: HorizonFrameSpec = {
  viewBoxW: 1000,
  viewBoxH: 340,
  padLeft: 60,
  padRight: 30,
  padTop: 30,
  padBottom: 45,
};

/** Resolution of the terrain silhouette polygon, in azimuth steps. */
export const COMPACT_TERRAIN_STEPS = 36;
export const EXPANDED_TERRAIN_STEPS = 72;

/** Marker labels flip left inside this right-edge gutter, by this x offset. */
export const COMPACT_LABEL_GUTTER_PX = 70;
export const EXPANDED_LABEL_GUTTER_PX = 90;
export const COMPACT_LABEL_OFFSET_PX = 8;
export const EXPANDED_LABEL_OFFSET_PX = 10;

/** One frame instance per chart: both are pure functions of the spec above. */
export const compactFrame = createHorizonFrame(COMPACT_FRAME_SPEC);
export const expandedFrame = createHorizonFrame(EXPANDED_FRAME_SPEC);

export interface MarkerLabelPlacement {
  x: number;
  anchor: 'start' | 'end';
}

/**
 * Labels flip to the left of their marker inside `gutterPx` of the right edge so
 * the text never runs off the plotted frame.
 */
export function markerLabelPlacement(
  frame: HorizonFrame,
  markerX: number,
  gutterPx: number,
  offsetPx: number,
): MarkerLabelPlacement {
  const flip = markerX > frame.plotRight - gutterPx;
  return { x: flip ? markerX - offsetPx : markerX + offsetPx, anchor: flip ? 'end' : 'start' };
}
