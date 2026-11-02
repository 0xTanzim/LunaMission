import { DEFAULT_PROJECTION_CONFIG, type CustomPointCelestialAngles, type ProjectedPoint } from '@/domain/coordinates/projection';
import type { CandidateSite } from '@/domain/sites/candidateSite';
import type { MapOverlayId, LayerComposition, PaintedLayer } from '@/features/spatial/model/mapLayerStack';
import { ScientificRasterLayer } from '@/features/spatial/map/layers/ScientificRasterLayer';
import { ElevationContourLayer } from '@/features/spatial/map/layers/ElevationContourLayer';
import { MapGridLayer } from '@/features/spatial/map/layers/MapGridLayer';
import { CraterLayer } from '@/features/spatial/map/layers/CraterLayer';
import { PsrLayer } from '@/features/spatial/map/layers/PsrLayer';
import { SunEarthVectorLayer } from '@/features/spatial/map/layers/SunEarthVectorLayer';
import { CustomPointLayer } from '@/features/spatial/map/layers/CustomPointLayer';
import { CandidateLayer } from '@/features/spatial/map/layers/CandidateLayer';
import type { MapHoverPreview, SiteVectorAngles } from './MapCanvas';

const { center: CENTER, maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;

/** The transient inspection marker sits between the reference geometry and the pins. */
const INSPECTION_MARKER_AFTER: MapOverlayId = 'vectors';

export interface MapPlotLayersProps {
  /** Zoom/pan transform for the pannable group. */
  viewportStyle: React.CSSProperties;
  zoom: number;
  /** Exactly what the compositor decided to draw, bottom → top. */
  composition: LayerComposition;
  /** Data URL of the base-layer raster, or `null` while it is preparing / unavailable. */
  baseRasterUrl: string | null;
  selectedSite: CandidateSite;
  sitePos: ProjectedPoint;
  siteVectors: SiteVectorAngles;
  hoveredSite: CandidateSite | null;
  hoverPreview: MapHoverPreview | null;
  customPoint: { pos: ProjectedPoint; distanceKm: number } | null;
  sites?: CandidateSite[];
  /** Pin hit radius in viewBox units, sized so the target stays ≥24 CSS px. */
  pinHitRadiusUnits?: number;
  /** Vector badge hit radius in viewBox units. */
  badgeHitRadiusUnits?: number;
  onSelectSite: (site: CandidateSite) => void;
  onHoverSite: (site: CandidateSite | null) => void;
  onOpenVectorPopover: (target: 'sun' | 'earth') => void;
}

function paintedById(painted: readonly PaintedLayer[], id: MapOverlayId): PaintedLayer | undefined {
  return painted.find((layer) => layer.id === id);
}

/**
 * Everything drawn inside the map's zoom/pan transform, in the compositor's paint order:
 * basin disc, base layer, then each compatible overlay, then the transient inspection
 * marker, then the candidate pins so the selected one floats above the rest.
 *
 * The order itself is declared once, in `mapLayerStack.MAP_LAYER_PAINT_ORDER`; this
 * component only draws what it is handed.
 */
export function MapPlotLayers({
  viewportStyle,
  zoom,
  composition,
  baseRasterUrl,
  selectedSite,
  sitePos,
  siteVectors,
  hoveredSite,
  hoverPreview,
  customPoint,
  sites,
  pinHitRadiusUnits,
  badgeHitRadiusUnits,
  onSelectSite,
  onHoverSite,
  onOpenVectorPopover,
}: MapPlotLayersProps) {
  const { painted, base } = composition;
  const splitIndex = painted.findIndex((layer) => layer.id === INSPECTION_MARKER_AFTER);
  const beneathInspection = splitIndex === -1 ? painted : painted.slice(0, splitIndex + 1);
  const aboveInspection = splitIndex === -1 ? [] : painted.slice(splitIndex + 1);

  const renderLayer = (layer: PaintedLayer) => {
    const { id, state } = layer;
    switch (id) {
      case 'contours':
        return <ElevationContourLayer key={id} visible zoom={zoom} opacity={state.opacity} />;
      case 'grid':
        return <MapGridLayer key={id} showGrid zoom={zoom} opacity={state.opacity} />;
      case 'craters':
        return <CraterLayer key={id} visible zoom={zoom} opacity={state.opacity} />;
      case 'psr':
        return <PsrLayer key={id} visible opacity={state.opacity} blendMode={state.blendMode} />;
      case 'vectors':
        return (
          <SunEarthVectorLayer
            key={id}
            visible
            opacity={state.opacity}
            selectedSite={selectedSite}
            sitePos={sitePos}
            sunAzimuthDeg={siteVectors.sunAzimuthDeg}
            sunElevationDeg={siteVectors.sunElevationDeg}
            earthAzimuthDeg={siteVectors.earthAzimuthDeg}
            earthElevationDeg={siteVectors.earthElevationDeg}
            hoveredSite={hoverPreview ? hoverPreview.site : null}
            hoveredSitePos={hoverPreview?.pos}
            hoveredSunAzimuthDeg={hoverPreview?.celestial.sunAzimuthDeg}
            hoveredEarthAzimuthDeg={hoverPreview?.celestial.earthAzimuthDeg}
            hitRadiusUnits={badgeHitRadiusUnits}
            onOpenVectorPopover={onOpenVectorPopover}
          />
        );
      case 'candidatePins':
        return (
          <CandidateLayer
            key={id}
            visible
            opacity={state.opacity}
            selectedSite={selectedSite}
            onSelectSite={onSelectSite}
            hoveredSite={hoveredSite}
            onHoverSite={onHoverSite}
            zoom={zoom}
            sites={sites}
            hitRadiusUnits={pinHitRadiusUnits}
          />
        );
      default:
        return null;
    }
  };

  return (
    <g style={viewportStyle}>
      {/* Lunar South-Pole Basin Disc (83°S Boundary) */}
      <circle
        cx={CENTER}
        cy={CENTER}
        r={MAX_RADIUS}
        fill="url(#pole-gradient)"
        stroke="var(--lm-color-border)"
        strokeWidth="1.5"
      />

      <ScientificRasterLayer url={baseRasterUrl} opacity={base.opacity} blendMode={base.blendMode} />

      {beneathInspection.map(renderLayer)}

      <CustomPointLayer
        customPos={customPoint ? customPoint.pos : null}
        selectedSitePos={sitePos}
        distanceKm={customPoint ? customPoint.distanceKm : null}
      />

      {aboveInspection.map(renderLayer)}
    </g>
  );
}

/** Whether a given overlay is in the painted set (used by the legend and the panels). */
export function isPainted(composition: LayerComposition, id: MapOverlayId): boolean {
  return paintedById(composition.painted, id) !== undefined;
}

export type { CustomPointCelestialAngles };
