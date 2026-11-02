import React from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { ProjectedPoint } from '@/domain/coordinates/projection';
import type { TopocentricAzimuthDeg } from '@/domain/coordinates/frames';
import { asSelenographicLongitudeDeg } from '@/domain/coordinates/frames';
import {
  calculateRayBoundaryEndpoint,
  computeScreenAngleRad,
} from '@/features/spatial/map/model/vectorGeometry';

const PREVIEW_OPACITY = 0.45;
const PREVIEW_STROKE_WIDTH = 1.2;
const PREVIEW_DASH = '2 3';

export interface HoverVectorPreviewProps {
  hoveredSite: CandidateSite | null;
  hoveredSitePos: ProjectedPoint | null;
  /** The selected site keeps its own full-strength vectors, never a preview. */
  selectedSiteId: string;
  hoveredSunAzimuthDeg?: TopocentricAzimuthDeg;
  hoveredEarthAzimuthDeg?: TopocentricAzimuthDeg;
  boundaryRadius: number;
  center: number;
}

/**
 * Faint dashed Sun/Earth bearings for an unselected candidate under the cursor
 * (Storyboard State 2), so an operator can compare two sites at one epoch.
 */
export function HoverVectorPreview({
  hoveredSite,
  hoveredSitePos,
  selectedSiteId,
  hoveredSunAzimuthDeg,
  hoveredEarthAzimuthDeg,
  boundaryRadius,
  center,
}: HoverVectorPreviewProps) {
  if (
    !hoveredSite ||
    !hoveredSitePos ||
    hoveredSite.id === selectedSiteId ||
    hoveredSunAzimuthDeg === undefined ||
    hoveredEarthAzimuthDeg === undefined
  ) {
    return null;
  }

  const siteLonDeg = asSelenographicLongitudeDeg(hoveredSite.coordinates.longitudeDeg);
  const sunEnd = calculateRayBoundaryEndpoint(
    hoveredSitePos,
    computeScreenAngleRad(siteLonDeg, hoveredSunAzimuthDeg),
    boundaryRadius,
    center,
  );
  const earthEnd = calculateRayBoundaryEndpoint(
    hoveredSitePos,
    computeScreenAngleRad(siteLonDeg, hoveredEarthAzimuthDeg),
    boundaryRadius,
    center,
  );

  return (
    <g className="hover-preview-vectors" opacity={PREVIEW_OPACITY}>
      <line
        x1={hoveredSitePos.x}
        y1={hoveredSitePos.y}
        x2={sunEnd.x}
        y2={sunEnd.y}
        stroke="var(--lm-color-sun)"
        strokeWidth={PREVIEW_STROKE_WIDTH}
        strokeDasharray={PREVIEW_DASH}
      />
      <line
        x1={hoveredSitePos.x}
        y1={hoveredSitePos.y}
        x2={earthEnd.x}
        y2={earthEnd.y}
        stroke="var(--lm-color-earth)"
        strokeWidth={PREVIEW_STROKE_WIDTH}
        strokeDasharray={PREVIEW_DASH}
      />
    </g>
  );
}
