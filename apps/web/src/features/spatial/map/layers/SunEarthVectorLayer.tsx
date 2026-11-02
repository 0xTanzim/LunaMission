import React from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { DEFAULT_PROJECTION_CONFIG, ProjectedPoint } from '@/domain/coordinates/projection';
import { ResultAvailability } from '@/domain/celestial/availability';
import { formatAvailableAngle } from '@/shared/formatting/availability';
import { isAtOrBelowHorizon, resolveRayEndpoint } from '@/features/spatial/map/model/vectorGeometry';
import {
  TopocentricAzimuthDeg,
  TopocentricElevationDeg,
  asSelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';
import { VectorEndpointBadge } from '@/features/spatial/map/layers/VectorEndpointBadge';
import { HoverVectorPreview } from '@/features/spatial/map/layers/HoverVectorPreview';

export interface SunEarthVectorLayerProps {
  visible: boolean;
  selectedSite: CandidateSite;
  sitePos: ProjectedPoint;
  /** Topocentric horizon-frame angles at selectedSite. A vector is only drawn when its azimuth is available. */
  sunAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  sunElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  earthAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  earthElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  hoveredSite?: CandidateSite | null;
  hoveredSitePos?: ProjectedPoint | null;
  hoveredSunAzimuthDeg?: TopocentricAzimuthDeg;
  hoveredEarthAzimuthDeg?: TopocentricAzimuthDeg;
  /** Invisible badge hit radius in viewBox units, sized by the map for SC 2.5.8. */
  hitRadiusUnits?: number;
  opacity?: number;
  onOpenVectorPopover: (target: 'sun' | 'earth') => void;
}

const SUN_COLOR = 'var(--lm-color-sun)';
const EARTH_COLOR = 'var(--lm-color-earth)';
/** Earth below the local horizon is a relay request, not a link: drawn in warning amber. */
const EARTH_SUB_HORIZON_COLOR = '#f59e0b';
/** The vector reaches to just inside the mapped disc, leaving the rim stroke readable. */
const BOUNDARY_INSET_PX = 4;
const ACTIVE_STROKE_WIDTH = 1.8;
const ACTIVE_DASH = '5 3';
/** A sub-horizon Earth ray is drawn faintly: geometric line of sight only. */
const SUB_HORIZON_DASH = '2 3';
const RETICLE_STROKE_WIDTH = 0.8;
const RETICLE_DASH = '2 2';
const RETICLE_OPACITY = '0.6';
const RAY_OPACITY = '0.95';
const SUN_RETICLE_RADIUS = '8';
const EARTH_RETICLE_RADIUS = '10';
/** Pill widths measured for each body's label text at fontSize 9 monospace. */
const SUN_LABEL_WIDTH_PX = 56;
const EARTH_LABEL_WIDTH_PX = 78;

/**
 * Dedicated Sun & Earth Vector Visualization Layer.
 * Renders dashed line-of-sight vectors originating directly from the selected candidate site
 * with authentic topocentric bearings and elevation tags anchored at the boundary perimeter.
 * Matches LunaMission Storyboard States 1–6.
 */
export function SunEarthVectorLayer({
  visible,
  selectedSite,
  sitePos,
  sunAzimuthDeg,
  sunElevationDeg,
  earthAzimuthDeg,
  earthElevationDeg,
  hoveredSite,
  hoveredSitePos,
  hoveredSunAzimuthDeg,
  hoveredEarthAzimuthDeg,
  hitRadiusUnits,
  opacity = 1,
  onOpenVectorPopover,
}: SunEarthVectorLayerProps) {
  if (!visible) return null;

  const { center: CENTER, maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;
  const boundaryRadius = MAX_RADIUS - BOUNDARY_INSET_PX;

  // A vector is drawable only if the ephemeris produced its topocentric bearing.
  const siteLonDeg = asSelenographicLongitudeDeg(selectedSite.coordinates.longitudeDeg);
  const sunEnd = resolveRayEndpoint(sitePos, siteLonDeg, sunAzimuthDeg, boundaryRadius, CENTER);
  const earthEnd = resolveRayEndpoint(sitePos, siteLonDeg, earthAzimuthDeg, boundaryRadius, CENTER);

  // Colouring one side of the horizon requires a known elevation; unknown is drawn as unknown.
  const isEarthBelowHorizon = isAtOrBelowHorizon(earthElevationDeg) === true;
  const earthColor = isEarthBelowHorizon ? EARTH_SUB_HORIZON_COLOR : EARTH_COLOR;

  return (
    <g className="sun-earth-vector-layer select-none" opacity={opacity}>
      {/* Preview bearings for an unselected candidate (Storyboard State 2) */}
      <HoverVectorPreview
        hoveredSite={hoveredSite ?? null}
        hoveredSitePos={hoveredSitePos ?? null}
        selectedSiteId={selectedSite.id}
        hoveredSunAzimuthDeg={hoveredSunAzimuthDeg}
        hoveredEarthAzimuthDeg={hoveredEarthAzimuthDeg}
        boundaryRadius={boundaryRadius}
        center={CENTER}
      />

      {/* 1. Topocentric Sun Vector */}
      {sunEnd && (
        <g className="selected-sun-vector">
          {/* Origin Reticle Ring at site */}
          <circle
            cx={sitePos.x}
            cy={sitePos.y}
            r={SUN_RETICLE_RADIUS}
            fill="none"
            stroke={SUN_COLOR}
            strokeWidth={RETICLE_STROKE_WIDTH}
            strokeDasharray={RETICLE_DASH}
            opacity={RETICLE_OPACITY}
          />

          {/* Vector Line extending to perimeter */}
          <line
            x1={sitePos.x}
            y1={sitePos.y}
            x2={sunEnd.x}
            y2={sunEnd.y}
            stroke={SUN_COLOR}
            strokeWidth={ACTIVE_STROKE_WIDTH}
            strokeDasharray={ACTIVE_DASH}
            opacity={RAY_OPACITY}
          />

          <VectorEndpointBadge
            end={sunEnd}
            mapCenter={CENTER}
            bodyName="Sun"
            color={SUN_COLOR}
            labelText={`☀ (${formatAvailableAngle(sunElevationDeg, 1, true)})`}
            labelWidthPx={SUN_LABEL_WIDTH_PX}
            elevationDeg={sunElevationDeg}
            azimuthDeg={sunAzimuthDeg}
            hitRadiusUnits={hitRadiusUnits}
            onOpen={() => onOpenVectorPopover('sun')}
          />
        </g>
      )}

      {/* 2. Topocentric Earth Vector */}
      {earthEnd && (
        <g className="selected-earth-vector">
          {/* Origin Reticle Ring at site */}
          <circle
            cx={sitePos.x}
            cy={sitePos.y}
            r={EARTH_RETICLE_RADIUS}
            fill="none"
            stroke={earthColor}
            strokeWidth={RETICLE_STROKE_WIDTH}
            strokeDasharray={RETICLE_DASH}
            opacity={RETICLE_OPACITY}
          />

          {/* Vector Line extending to perimeter */}
          <line
            x1={sitePos.x}
            y1={sitePos.y}
            x2={earthEnd.x}
            y2={earthEnd.y}
            stroke={earthColor}
            strokeWidth={ACTIVE_STROKE_WIDTH}
            strokeDasharray={isEarthBelowHorizon ? SUB_HORIZON_DASH : ACTIVE_DASH}
            opacity={RAY_OPACITY}
          />

          <VectorEndpointBadge
            end={earthEnd}
            mapCenter={CENTER}
            bodyName="Earth"
            color={earthColor}
            labelText={`Earth (${formatAvailableAngle(earthElevationDeg, 1, true)})`}
            labelWidthPx={EARTH_LABEL_WIDTH_PX}
            elevationDeg={earthElevationDeg}
            azimuthDeg={earthAzimuthDeg}
            hitRadiusUnits={hitRadiusUnits}
            onOpen={() => onOpenVectorPopover('earth')}
          />
        </g>
      )}
    </g>
  );
}
