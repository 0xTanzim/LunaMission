import React from 'react';
import type { ResultAvailability } from '@/domain/celestial/availability';
import type { ProjectedPoint } from '@/domain/coordinates/projection';
import type { TopocentricAzimuthDeg, TopocentricElevationDeg } from '@/domain/coordinates/frames';
import { formatAvailableAngle } from '@/shared/formatting/availability';
import { BADGE_HIT_RADIUS_UNITS } from '@/features/spatial/map/model/svgTargetSize';

/** Shared geometry for a vector endpoint badge. Only text and paint differ per body. */
const SYMBOL_RADIUS = 5;
const SYMBOL_STROKE = '#080c14';
const SYMBOL_STROKE_WIDTH = 1.2;
const LABEL_BOX_HEIGHT = 13;
const LABEL_BOX_RADIUS = 2.5;
const LABEL_BOX_PADDING = 6;
const LABEL_STROKE_WIDTH = 0.6;
/** Within this many pixels of the map centre a label sits beside the badge, not above/below. */
const MID_BAND_HEIGHT_PX = 120;
const LABEL_OFFSET_TOP_PX = 14;
const LABEL_OFFSET_BOTTOM_PX = -8;
const LABEL_OFFSET_MID_PX = 3.5;
const LABEL_SHIFT_EDGE_PX = 8;
const LABEL_SHIFT_MID_PX = 9;
const LABEL_BACKDROP_BLEED_PX = 3;
const LABEL_BASELINE_SHIFT_PX = 9;

export interface VectorEndpointBadgeProps {
  /** Endpoint on the boundary perimeter, in untransformed svg pixels. */
  end: ProjectedPoint;
  mapCenter: number;
  /** Body name used in the accessible label. */
  bodyName: 'Sun' | 'Earth';
  color: string;
  /** Rendered pill text, e.g. `Earth (+1.2°)`. */
  labelText: string;
  /** Measured width of `labelText`, so the backdrop fits without measuring the DOM. */
  labelWidthPx: number;
  elevationDeg: ResultAvailability<TopocentricElevationDeg>;
  azimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  /** Invisible hit radius in viewBox units; the map keeps it ≥24 CSS px (WCAG 2.5.8). */
  hitRadiusUnits?: number;
  onOpen: () => void;
}

/**
 * Keyboard-reachable badge at the end of a Sun or Earth vector: an oversized click
 * target, the celestial symbol, and the elevation tag anchored to the boundary.
 */
export function VectorEndpointBadge({
  end,
  mapCenter,
  bodyName,
  color,
  labelText,
  labelWidthPx,
  elevationDeg,
  azimuthDeg,
  hitRadiusUnits = BADGE_HIT_RADIUS_UNITS,
  onOpen,
}: VectorEndpointBadgeProps) {
  const isTop = end.y < mapCenter - MID_BAND_HEIGHT_PX;
  const isBottom = end.y > mapCenter + MID_BAND_HEIGHT_PX;
  const isRightSide = end.x >= mapCenter;
  const labelY = isTop
    ? end.y + LABEL_OFFSET_TOP_PX
    : isBottom
      ? end.y + LABEL_OFFSET_BOTTOM_PX
      : end.y + LABEL_OFFSET_MID_PX;
  const shift = isTop || isBottom ? LABEL_SHIFT_EDGE_PX : LABEL_SHIFT_MID_PX;
  const labelX = end.x + (isRightSide ? shift : -shift);
  const rectX = isRightSide ? labelX - LABEL_BACKDROP_BLEED_PX : labelX - labelWidthPx - LABEL_BACKDROP_BLEED_PX;
  const textX = isRightSide ? labelX : labelX - labelWidthPx;

  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={`Inspect ${bodyName} vector telemetry: elevation ${formatAvailableAngle(
        elevationDeg,
        1,
        true
      )}, azimuth ${formatAvailableAngle(azimuthDeg, 1)}`}
      onClick={(e) => {
        e.stopPropagation();
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onOpen();
        }
      }}
      className="cursor-pointer focus:outline-none group"
    >
      {/* Invisible Generous Click Target */}
      <circle cx={end.x} cy={end.y} r={hitRadiusUnits} fill="transparent" />

      {/* Celestial Symbol */}
      <circle
        cx={end.x}
        cy={end.y}
        r={SYMBOL_RADIUS}
        fill={color}
        stroke={SYMBOL_STROKE}
        strokeWidth={SYMBOL_STROKE_WIDTH}
        className="group-hover:scale-125 transition-transform"
      />

      {/* Elevation Label Tag with Pill Backdrop */}
      <g className={`${bodyName.toLowerCase()}-elevation-label pointer-events-none`}>
        <rect
          x={rectX}
          y={labelY - LABEL_BASELINE_SHIFT_PX}
          width={labelWidthPx + LABEL_BOX_PADDING}
          height={LABEL_BOX_HEIGHT}
          rx={LABEL_BOX_RADIUS}
          fill={SYMBOL_STROKE}
          fillOpacity={0.92}
          stroke={color}
          strokeWidth={LABEL_STROKE_WIDTH}
        />
        <text
          x={textX}
          y={labelY}
          textAnchor="start"
          fill={color}
          fontSize="11"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {labelText}
        </text>
      </g>
    </g>
  );
}
