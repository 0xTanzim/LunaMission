import React, { type CSSProperties, type RefObject } from 'react';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { ResultAvailability } from '@/domain/celestial/availability';
import { DEFAULT_PROJECTION_CONFIG, type CustomPointCelestialAngles, type ProjectedPoint } from '@/domain/coordinates/projection';
import type { TopocentricAzimuthDeg, TopocentricElevationDeg } from '@/domain/coordinates/frames';
import type { LayerComposition } from '@/features/spatial/model/mapLayerStack';
import { useSvgCssPerUnit } from '@/features/spatial/map/hooks/useSvgCssPerUnit';
import { BADGE_HIT_RADIUS_UNITS, PIN_HIT_RADIUS_UNITS, hitRadiusUnits } from '@/features/spatial/map/model/svgTargetSize';
import { mapAccessibleLabel } from '@/features/spatial/map/model/mapAccessibleSummary';
import { MapPlotLayers } from './MapPlotLayers';
import { MapSvgDefs } from './MapSvgDefs';

const { svgSize: SVG_SIZE } = DEFAULT_PROJECTION_CONFIG;

/** Topocentric horizon-frame angles at the selected site. */
export interface SiteVectorAngles {
  sunAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  sunElevationDeg: ResultAvailability<TopocentricElevationDeg>;
  earthAzimuthDeg: ResultAvailability<TopocentricAzimuthDeg>;
  earthElevationDeg: ResultAvailability<TopocentricElevationDeg>;
}

/** Unselected candidate under the cursor, with its own preview vectors. */
export interface MapHoverPreview {
  site: CandidateSite;
  pos: ProjectedPoint;
  celestial: CustomPointCelestialAngles;
}

export interface MapGestureHandlers {
  onMouseDown: (event: React.MouseEvent) => void;
  onMouseMove: (event: React.MouseEvent) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onClick: (event: React.MouseEvent) => void;
  onTouchStart?: (event: React.TouchEvent) => void;
  onTouchMove?: (event: React.TouchEvent) => void;
  onTouchEnd?: (event: React.TouchEvent) => void;
  onTouchCancel?: (event: React.TouchEvent) => void;
}

export interface MapCanvasProps {
  svgRef: RefObject<SVGSVGElement | null>;
  /** Current zoom, used for label decluttering by the overlay layers. */
  zoom: number;
  /** Zoom/pan transform for the pannable group. */
  viewportStyle: CSSProperties;
  /** The composited stack: one base layer plus the overlays that survived compatibility. */
  composition: LayerComposition;
  /** Data URL of the base-layer raster, or `null` while it is preparing / unavailable. */
  baseRasterUrl: string | null;
  selectedSite: CandidateSite;
  sitePos: ProjectedPoint;
  siteVectors: SiteVectorAngles;
  /** Cursor hover as reported by the site layer, including the selected site. */
  hoveredSite: CandidateSite | null;
  hoverPreview: MapHoverPreview | null;
  customPoint: { pos: ProjectedPoint; distanceKm: number } | null;
  onSelectSite: (site: CandidateSite) => void;
  onHoverSite: (site: CandidateSite | null) => void;
  onOpenVectorPopover: (target: 'sun' | 'earth') => void;
  gestures: MapGestureHandlers;
  /** Candidate sites actually drawn; also the count stated in the accessible label. */
  sites?: CandidateSite[];
  /** Epoch the topocentric vector angles belong to, for the accessible label. */
  epochIsoUtc?: string;
}

/**
 * The stereographic drawing surface: basin disc, base layer, overlay stack, inspection
 * point and candidate pins, all inside one zoom/pan transform group.
 *
 * It owns no layer state. What is drawn is decided by the compositor and handed in, so
 * the drawing order, the legend and the layer panel cannot drift apart.
 */
export function MapCanvas({
  svgRef,
  zoom,
  viewportStyle,
  composition,
  baseRasterUrl,
  selectedSite,
  sitePos,
  siteVectors,
  hoveredSite,
  hoverPreview,
  customPoint,
  onSelectSite,
  onHoverSite,
  onOpenVectorPopover,
  gestures,
  sites = [],
  epochIsoUtc,
}: MapCanvasProps) {
  const cssPerUnit = useSvgCssPerUnit(svgRef, SVG_SIZE);
  const pinHitRadius = hitRadiusUnits(cssPerUnit, PIN_HIT_RADIUS_UNITS);
  const badgeHitRadius = hitRadiusUnits(cssPerUnit, BADGE_HIT_RADIUS_UNITS);
  const accessibleLabel = mapAccessibleLabel({
    selectedSite,
    sunAzimuthDeg: siteVectors.sunAzimuthDeg,
    sunElevationDeg: siteVectors.sunElevationDeg,
    earthAzimuthDeg: siteVectors.earthAzimuthDeg,
    earthElevationDeg: siteVectors.earthElevationDeg,
    epochIsoUtc,
    markerCount: sites.length,
  });

  return (
    <div
      className="relative w-full h-full flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden min-h-0 touch-none"
      style={{ touchAction: 'none' }}
      onMouseDown={gestures.onMouseDown} onMouseMove={gestures.onMouseMove}
      onMouseUp={gestures.onMouseUp} onMouseLeave={gestures.onMouseLeave}
      onClick={gestures.onClick}
      onTouchStart={gestures.onTouchStart} onTouchMove={gestures.onTouchMove}
      onTouchEnd={gestures.onTouchEnd} onTouchCancel={gestures.onTouchCancel}
    >
      {/*
        The map is one picture of a computed field, so it declares itself as an image
        with a label that states the reading (selected site, epoch, Sun/Earth bearings,
        marker count). Its pins and vector badges stay focusable buttons — the image
        role does not remove them from the tab order — so the plot is both readable and
        operable, and `MapSiteDataTable` carries the same numbers as a real table.
      */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none"
        role="img"
        aria-label={accessibleLabel}
        data-testid="polar-map-svg"
      >
        <title>{accessibleLabel}</title>
        <MapSvgDefs />

        <MapPlotLayers
          viewportStyle={viewportStyle}
          zoom={zoom}
          composition={composition}
          baseRasterUrl={baseRasterUrl}
          selectedSite={selectedSite}
          sitePos={sitePos}
          siteVectors={siteVectors}
          hoveredSite={hoveredSite}
          hoverPreview={hoverPreview}
          customPoint={customPoint}
          sites={sites}
          pinHitRadiusUnits={pinHitRadius}
          badgeHitRadiusUnits={badgeHitRadius}
          onSelectSite={onSelectSite}
          onHoverSite={onHoverSite}
          onOpenVectorPopover={onOpenVectorPopover}
        />
      </svg>
    </div>
  );
}
