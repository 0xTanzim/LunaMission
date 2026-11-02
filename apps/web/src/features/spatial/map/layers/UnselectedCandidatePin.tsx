import React from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { ProjectedPoint } from '@/domain/coordinates/projection';
import {
  CandidateLabelMode,
  PIN_COLORS,
  TAG_OFFSET_HOVERED_PX,
  TAG_OFFSET_PX,
  badgeWidthFor,
  offsetAlongAngle,
  radialAngleFromPole,
  shouldShowCodePill,
  unselectedPinAriaLabel,
  isOffMapPolarSite,
} from '@/features/spatial/map/model/candidatePinGeometry';
import { PIN_HIT_RADIUS_UNITS } from '@/features/spatial/map/model/svgTargetSize';

export interface UnselectedCandidatePinProps {
  site: CandidateSite;
  pos: ProjectedPoint;
  isHovered: boolean;
  isCompared?: boolean;
  labelMode?: CandidateLabelMode;
  tagPos?: ProjectedPoint;
  labelText?: string;
  zoom: number;
  /** Invisible hit radius in viewBox units; the map keeps it ≥24 CSS px (WCAG 2.5.8). */
  hitRadiusUnits?: number;
  onSelect: (site: CandidateSite) => void;
  onHover: (site: CandidateSite | null) => void;
}

/**
 * Compact pin for a candidate that is not selected.
 * Distinguishes hovered, compared, and ordinary candidates.
 * Respects collision-aware label placement with progressive level-of-detail.
 */
export function UnselectedCandidatePin({
  site,
  pos,
  isHovered,
  isCompared = false,
  labelMode,
  tagPos,
  labelText,
  zoom,
  hitRadiusUnits = PIN_HIT_RADIUS_UNITS,
  onSelect,
  onHover,
}: UnselectedCandidatePinProps) {
  const isOffMap = isOffMapPolarSite(site);
  const angleRad = radialAngleFromPole(pos);
  const fallbackTag = offsetAlongAngle(pos, angleRad, isHovered ? TAG_OFFSET_HOVERED_PX : TAG_OFFSET_PX);
  const resolvedTagPos = tagPos ?? fallbackTag;
  const resolvedLabelMode = labelMode ?? (shouldShowCodePill(zoom, isHovered) ? 'code' : 'none');
  const defaultCode = isOffMap ? `${site.code} ↗` : site.code;
  const displayLabel = labelText ?? defaultCode;

  const showLabel = resolvedLabelMode !== 'none';
  const isFullLabel = resolvedLabelMode === 'full';
  const tagWidth = isFullLabel ? badgeWidthFor(displayLabel) : (isOffMap ? 40 : 34);

  // Pin styling based on candidate state
  const markerFill = isHovered
    ? PIN_COLORS.unselectedHovered
    : isCompared
    ? PIN_COLORS.compared
    : PIN_COLORS.unselected;

  const markerRadius = isHovered ? 4.8 : isCompared ? 4.0 : 3.6;

  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={unselectedPinAriaLabel(site, isCompared)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(site);
      }}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          onSelect(site);
        }
      }}
      onMouseEnter={() => onHover(site)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer focus:outline-none group"
    >
      {/* Generous Invisible Click Target to guarantee zero missed clicks */}
      <circle cx={pos.x} cy={pos.y} r={hitRadiusUnits} fill="transparent" />

      {/* Compared Site Indicator Ring (Distinct dashed outer orbit) */}
      {isCompared && !isHovered && (
        <circle
          cx={pos.x}
          cy={pos.y}
          r="7.5"
          fill="none"
          stroke={PIN_COLORS.comparedRing}
          strokeWidth="1.2"
          strokeDasharray="2.5 1.5"
          opacity="0.85"
        />
      )}

      {/* Hover Preview Outer Halo */}
      {isHovered && (
        <circle
          cx={pos.x}
          cy={pos.y}
          r="9.5"
          fill="none"
          stroke={PIN_COLORS.unselectedHovered}
          strokeWidth="1.2"
          strokeDasharray="3 2"
          opacity="0.9"
        />
      )}

      {/* Candidate Marker Dot */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={markerRadius}
        fill={markerFill}
        stroke={PIN_COLORS.markerStroke}
        strokeWidth="1.2"
        className="transition-all duration-150"
      />

      {/* Collision-Aware Progressive Tag */}
      {showLabel && (
        <g transform={`translate(${resolvedTagPos.x}, ${resolvedTagPos.y})`} className="pointer-events-none">
          <rect
            x={-tagWidth / 2}
            y="-6.5"
            width={tagWidth}
            height="13"
            rx="2"
            fill={PIN_COLORS.tagBackdrop}
            fillOpacity={isHovered ? 0.95 : 0.85}
            stroke={
              isHovered
                ? PIN_COLORS.accent
                : isCompared
                ? PIN_COLORS.comparedTagStroke
                : PIN_COLORS.tagStroke
            }
            strokeWidth={isHovered ? 1.0 : isCompared ? 0.9 : 0.7}
          />
          <text
            x="0"
            y="2.5"
            textAnchor="middle"
            fill={
              isHovered
                ? PIN_COLORS.tagTextHovered
                : isCompared
                ? '#c7d2fe'
                : PIN_COLORS.tagText
            }
            fontSize="11"
            fontWeight={isHovered || isCompared ? 'bold' : '500'}
            fontFamily="monospace"
          >
            {displayLabel}
          </text>
        </g>
      )}
    </g>
  );
}
