import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { calculateLunarDistanceKm, projectLatLon, type SelenographicCoordinate } from '@/domain/coordinates/projection';
import { useScenarioCommands, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import {
  MAP_LAYER_PAINT_ORDER,
  composeMapLayers,
  type LayerBlendMode,
  type MapOverlayId,
} from '@/features/spatial/model/mapLayerStack';
import type { ScientificMapLayerMode, SpatialLayer, SpatialPreferences } from '@/features/spatial/model/spatialPreferences';
import { MapCanvas, type MapHoverPreview } from '@/features/spatial/map/components/MapCanvas';
import { MapToolbar } from '@/features/spatial/map/components/MapToolbar';
import { MapLayersMenu } from '@/features/spatial/map/components/MapLayersMenu';
import { ScientificMapLegend } from '@/features/spatial/map/components/ScientificMapLegend';
import { MapScaleBar } from '@/features/spatial/map/components/MapScaleBar';
import { MapZoomHintChip } from '@/features/spatial/map/components/MapZoomHintChip';
import { MapCandidateRibbon } from '@/features/spatial/map/components/MapCandidateRibbon';
import { MapOverlayCards } from '@/features/spatial/map/components/MapOverlayCards';
import { MapFullscreenZoomPalette } from '@/features/spatial/map/components/MapFullscreenZoomPalette';
import { DockedMapInspector } from '@/features/spatial/map/components/inspector/DockedMapInspector';
import { useMapViewport } from '@/features/spatial/map/hooks/useMapViewport';
import { useBaseRaster } from '@/features/spatial/map/hooks/useBaseRaster';
import { useSiteCatalog } from '@/features/spatial/hooks/useSiteCatalog';
import {
  analyzeCustomPoint,
  analyzeHoveredSite,
  distanceFromSouthPoleKm,
  distanceToSite,
  type SubPoints,
} from '@/features/spatial/map/model/mapPointAnalysis';
import { readMapPointFacts } from '@/features/spatial/map/model/mapPointFacts';

export interface SouthPoleMapProps {
  preferences: SpatialPreferences;
  onToggleLayer: (layer: SpatialLayer) => void;
  onLayerOpacityChange?: (layer: SpatialLayer, opacity: number) => void;
  onLayerBlendChange?: (layer: SpatialLayer, blendMode: LayerBlendMode) => void;
  onSelectScientificMapMode?: (mode: ScientificMapLayerMode) => void;
  /** Promote the inspected point to the mission's custom target. Never selects a site. */
  onUseAsCustomTarget?: (coord: SelenographicCoordinate) => void;
  /** The active custom target, so a promoted point can say so. */
  promotedTarget?: { latitudeDeg: number; longitudeDeg: number } | null;
  hideHeader?: boolean;
  hideRibbon?: boolean;
  isFullscreen?: boolean;
  isPassportOpen?: boolean;
  onOpenSiteIntel?: () => void;
}

/** Two coordinates within this distance are treated as the same promoted target. */
const PROMOTED_TOLERANCE_KM = 0.2;

/**
 * 2D Polar Stereographic Geographic Map (83°S–90°S).
 *
 * The surface owns everything that belongs to *reading* the sheet: the composited layer
 * stack, the base raster and its state, the legend that describes them, and the inspector
 * for a clicked point. Geography-first exploration with a non-occluding docked inspector.
 */
export function SouthPoleMap({
  preferences,
  onToggleLayer,
  onLayerOpacityChange,
  onLayerBlendChange,
  onSelectScientificMapMode,
  onUseAsCustomTarget,
  promotedTarget = null,
  hideHeader = false,
  hideRibbon = false,
  isFullscreen = false,
  isPassportOpen = false,
  onOpenSiteIntel,
}: SouthPoleMapProps) {
  const { site: selectedSite, conditions, ephemeris } = useScenarioModel();
  const { selectSite } = useScenarioCommands();
  const { sites: catalogSites } = useSiteCatalog('all');

  const [hoveredSite, setHoveredSite] = useState<CandidateSite | null>(null);
  const [activeVectorPopover, setActiveVectorPopover] = useState<'sun' | 'earth' | null>(null);
  const [customInspectPoint, setCustomInspectPoint] = useState<SelenographicCoordinate | null>(null);
  const [isInspectorDismissed, setIsInspectorDismissed] = useState(false);

  const sitePos = useMemo(
    () => projectLatLon(selectedSite.coordinates.latitudeDeg, selectedSite.coordinates.longitudeDeg),
    [selectedSite],
  );
  const viewport = useMapViewport(sitePos);

  const composition = useMemo(
    () => composeMapLayers(preferences.base, preferences.overlays, MAP_LAYER_PAINT_ORDER),
    [preferences.base, preferences.overlays],
  );
  const baseRaster = useBaseRaster(preferences.base.id);

  const subPoints = useMemo<SubPoints>(() => ({
    subSolarLatDeg: ephemeris.subSolarLatDeg, subSolarLonDeg: ephemeris.subSolarLonDeg,
    subEarthLatDeg: ephemeris.subEarthLatDeg, subEarthLonDeg: ephemeris.subEarthLonDeg,
  }), [ephemeris]);

  const distanceFromPoleKm = useMemo(() => distanceFromSouthPoleKm(selectedSite.coordinates), [selectedSite]);

  const hoverPreview = useMemo<MapHoverPreview | null>(() => {
    if (!hoveredSite || hoveredSite.id === selectedSite.id) return null;
    return { site: hoveredSite, ...analyzeHoveredSite(hoveredSite, subPoints) };
  }, [hoveredSite, selectedSite, subPoints]);

  const customPointData = useMemo(
    () => (customInspectPoint ? analyzeCustomPoint(customInspectPoint, selectedSite, subPoints, catalogSites) : null),
    [customInspectPoint, selectedSite, subPoints, catalogSites],
  );

  const pointFacts = useMemo(
    () => (customInspectPoint ? readMapPointFacts(customInspectPoint, catalogSites) : null),
    [customInspectPoint, catalogSites],
  );

  const isPromoted = useMemo(() => {
    if (!customInspectPoint || !promotedTarget) return false;
    return calculateLunarDistanceKm(customInspectPoint, promotedTarget) <= PROMOTED_TOLERANCE_KM;
  }, [customInspectPoint, promotedTarget]);

  const cursorDistanceKm = useMemo(
    () => (viewport.cursorCoord ? distanceToSite(viewport.cursorCoord, selectedSite) : null),
    [viewport.cursorCoord, selectedSite],
  );

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if ((e.key === '+' || e.key === '=') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        viewport.zoomIn();
      } else if ((e.key === '-' || e.key === '_') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        viewport.zoomOut();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewport]);

  const handleSelectSite = useCallback((site: CandidateSite) => selectSite(site.id), [selectSite]);

  const handleCanvasClick = useCallback((event: React.MouseEvent) => {
    if (viewport.isDragging) return;
    const coord = viewport.coordinateFromEvent(event);
    if (coord) {
      setCustomInspectPoint(coord);
      setIsInspectorDismissed(false);
    }
  }, [viewport]);

  const handleCloseInspector = useCallback(() => {
    setCustomInspectPoint(null);
    setIsInspectorDismissed(true);
  }, []);

  const handleSelectScientificMapMode = useCallback((mode: ScientificMapLayerMode) => {
    setIsInspectorDismissed(false);
    onSelectScientificMapMode?.(mode);
  }, [onSelectScientificMapMode]);

  const customPointProp = useMemo(() => (
    customInspectPoint && customPointData ? { coord: customInspectPoint, analysis: customPointData } : null
  ), [customInspectPoint, customPointData]);

  const layerMenu = (
    <MapLayersMenu
      composition={composition}
      overlays={preferences.overlays}
      overlayIds={MAP_LAYER_PAINT_ORDER}
      baseRaster={baseRaster}
      onToggleOverlay={(id: MapOverlayId) => onToggleLayer(id)}
      onOverlayOpacityChange={(id, opacity) => onLayerOpacityChange?.(id, opacity)}
      onOverlayBlendChange={(id, blendMode) => onLayerBlendChange?.(id, blendMode)}
    />
  );

  return (
    <div className="relative flex h-full min-h-0 w-full select-none flex-col overflow-hidden rounded-[var(--lm-radius-lg)] border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-canvas)]">
      <MapToolbar
        zoom={viewport.zoom} onZoomIn={viewport.zoomIn} onZoomOut={viewport.zoomOut}
        onReset={viewport.resetViewport} onApplyPreset={viewport.applyPreset} activePreset={viewport.activePreset}
        hideHeader={hideHeader}
        layerControls={layerMenu}
      />

      {/* Map Viewport Area */}
      <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden touch-none" style={{ touchAction: 'none' }}>
        <MapOverlayCards
          hoveredSite={hoveredSite} hoverPreview={hoverPreview} activeVectorPopover={activeVectorPopover}
          distanceFromPoleKm={distanceFromPoleKm} customPoint={customPointProp}
          onCloseVectorPopover={() => setActiveVectorPopover(null)}
        />

        <MapCanvas
          svgRef={viewport.svgRef} zoom={viewport.zoom} viewportStyle={viewport.viewportStyle}
          composition={composition} baseRasterUrl={baseRaster.status === 'ready' ? baseRaster.url : null}
          selectedSite={selectedSite} sitePos={sitePos}
          siteVectors={{ sunAzimuthDeg: conditions.sunAzimuthDeg, sunElevationDeg: conditions.sunElevationDeg, earthAzimuthDeg: conditions.earthAzimuthDeg, earthElevationDeg: conditions.earthElevationDeg }}
          hoveredSite={hoveredSite} hoverPreview={hoverPreview}
          customPoint={customPointData ? { pos: customPointData.pos, distanceKm: customPointData.distanceKm } : null}
          onSelectSite={handleSelectSite} onHoverSite={setHoveredSite} onOpenVectorPopover={setActiveVectorPopover}
          sites={catalogSites}
          gestures={{
            onMouseDown: viewport.handleMouseDown, onMouseMove: viewport.handleMouseMove,
            onMouseUp: viewport.handleMouseUp, onMouseLeave: viewport.handleMouseLeave,
            onClick: handleCanvasClick,
            onTouchStart: viewport.handleTouchStart, onTouchMove: viewport.handleTouchMove,
            onTouchEnd: viewport.handleTouchEnd, onTouchCancel: viewport.handleTouchCancel,
          }}
        />

        <MapScaleBar
          zoom={viewport.zoom} cursorCoord={viewport.cursorCoord}
          cursorDistanceKm={cursorDistanceKm} selectedSite={selectedSite} className="bottom-3 left-3"
        />

        {/* One-time scroll/zoom affordance: plain wheel now scrolls the page; the hint
            teaches the Ctrl/⌘ modifier the first time a plain wheel rolls over the map. */}
        {viewport.zoomHintVisible && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
            <MapZoomHintChip onDismiss={viewport.dismissZoomHint} />
          </div>
        )}

        {/* Legend: the painted ramp, the composited overlays, and anything that could not be drawn. */}
        {onSelectScientificMapMode && (
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 max-w-[calc(100%-1.5rem)]">
            <ScientificMapLegend
              mode={preferences.base.id}
              onSelectMode={handleSelectScientificMapMode}
              composition={composition}
              baseRaster={baseRaster}
              initialExpanded={false}
            />
          </div>
        )}

        {isFullscreen && (
          <MapFullscreenZoomPalette
            zoom={viewport.zoom} onZoomIn={viewport.zoomIn} onZoomOut={viewport.zoomOut}
            onReset={viewport.resetViewport} onFocusSite={() => viewport.applyPreset('site')}
            isSiteFocused={viewport.activePreset === 'site'}
            className={isPassportOpen ? 'right-[430px]' : 'right-3'}
          />
        )}
      </div>

      {/* Non-Occluding Docked Bottom Inspector (mounts on an inspected point or a volatile base) */}
      {!isInspectorDismissed && (customPointProp || preferences.base.id === 'volatiles' || preferences.base.id === 'temperature') && (
        <DockedMapInspector
          customPoint={customPointProp}
          customPointData={customPointData}
          facts={pointFacts}
          selectedSite={selectedSite}
          scientificMapMode={preferences.base.id}
          onClose={handleCloseInspector}
          onSelectNearestSite={handleSelectSite}
          onUseAsCustomTarget={
            onUseAsCustomTarget && customInspectPoint
              ? () => onUseAsCustomTarget(customInspectPoint)
              : undefined
          }
          isPromoted={isPromoted}
          onOpenIntel={onOpenSiteIntel}
        />
      )}

      {!hideRibbon && <MapCandidateRibbon selectedSite={selectedSite} onSelectSite={handleSelectSite} />}
    </div>
  );
}
