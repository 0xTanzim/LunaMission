import React, { type ReactNode } from 'react';

/**
 * Sun/Earth marker on the topocentric horizon chart: drop line to the 0° plane,
 * glow halo, clickable disk. The compact diagram and the expanded inspector draw
 * the same shape at different radii and stroke weights.
 */

export interface HorizonMarkerVisual {
  readonly glowRadius: number;
  readonly diskRadius: number;
  readonly selectedDiskRadius: number;
  readonly selectedDiskStrokeWidth: number;
  readonly dropLineWidth: number;
  readonly dropLineDash: string;
  readonly dropLineOpacity: number;
  /** The inspector animates the disk growing on selection; the compact chart does not. */
  readonly diskClassName?: string;
}

const DISK_STROKE_WIDTH = 1.5;

export const SUN_COLOR = '#ffb830';
export const EARTH_COLOR = '#8ccbff';

export const COMPACT_SUN_VISUAL: HorizonMarkerVisual = {
  glowRadius: 16,
  diskRadius: 5,
  selectedDiskRadius: 6.5,
  selectedDiskStrokeWidth: DISK_STROKE_WIDTH,
  dropLineWidth: 1.2,
  dropLineDash: '2 2',
  dropLineOpacity: 0.6,
};

export const COMPACT_EARTH_VISUAL: HorizonMarkerVisual = {
  glowRadius: 14,
  diskRadius: 4.5,
  selectedDiskRadius: 6,
  selectedDiskStrokeWidth: DISK_STROKE_WIDTH,
  dropLineWidth: 1.2,
  dropLineDash: '2 2',
  dropLineOpacity: 0.6,
};

export const EXPANDED_SUN_VISUAL: HorizonMarkerVisual = {
  glowRadius: 20,
  diskRadius: 6,
  selectedDiskRadius: 7.5,
  selectedDiskStrokeWidth: 2.2,
  dropLineWidth: 1.4,
  dropLineDash: '3 2',
  dropLineOpacity: 0.75,
  diskClassName: 'transition-all',
};

export const EXPANDED_EARTH_VISUAL: HorizonMarkerVisual = {
  glowRadius: 18,
  diskRadius: 5.5,
  selectedDiskRadius: 7,
  selectedDiskStrokeWidth: 2.2,
  dropLineWidth: 1.4,
  dropLineDash: '3 2',
  dropLineOpacity: 0.75,
  diskClassName: 'transition-all',
};

interface HorizonMarkerProps {
  x: number;
  y: number;
  /** y of the 0° reference plane the drop line terminates on. */
  zeroY: number;
  color: string;
  glowFill: string;
  visual: HorizonMarkerVisual;
  selected: boolean;
  onSelect: () => void;
  /** Elevation label, kept by the calling chart so text-run structure stays authored where it renders. */
  children?: ReactNode;
}

export function HorizonMarker({
  x,
  y,
  zeroY,
  color,
  glowFill,
  visual,
  selected,
  onSelect,
  children,
}: HorizonMarkerProps) {
  return (
    <>
      <line
        x1={x}
        y1={y}
        x2={x}
        y2={zeroY}
        stroke={color}
        strokeWidth={visual.dropLineWidth}
        strokeDasharray={visual.dropLineDash}
        opacity={visual.dropLineOpacity}
      />
      <g className="cursor-pointer group" onClick={onSelect}>
        <circle cx={x} cy={y} r={visual.glowRadius} fill={glowFill} />
        <circle
          cx={x}
          cy={y}
          r={selected ? visual.selectedDiskRadius : visual.diskRadius}
          fill={color}
          stroke="#ffffff"
          strokeWidth={selected ? visual.selectedDiskStrokeWidth : DISK_STROKE_WIDTH}
          className={visual.diskClassName}
        />
        {children}
      </g>
    </>
  );
}
