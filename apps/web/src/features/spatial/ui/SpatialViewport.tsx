import { useCallback } from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import type { SelenographicCoordinate } from '@/domain/coordinates/projection';
import { SouthPoleMap } from '@/features/spatial/ui/SouthPoleMap';
import { LunarGlobe3D } from '@/features/spatial/ui/LunarGlobe3D';
import { VisualizationErrorBoundary } from '@/features/spatial/components/panels/VisualizationErrorBoundary';
import { ViewportPanel } from '@/features/spatial/components/panels/ViewportPanel';
import {
  CameraPreset,
  isLayerVisible,
  ScientificMapLayerMode,
  SpatialLayer,
  SpatialPreferences,
} from '@/features/spatial/model/spatialPreferences';
import type { LayerBlendMode } from '@/features/spatial/model/mapLayerStack';
import { SpatialViewMode } from '@/features/spatial/model/spatialViewMode';
import { useScenarioCommands, useScenarioModel } from '@/app/scenario/context/scenarioContext';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';

export interface SpatialViewportProps {
  viewMode: SpatialViewMode;
  preferences: SpatialPreferences;
  onToggleLayer: (layer: SpatialLayer) => void;
  onLayerOpacityChange?: (layer: SpatialLayer, opacity: number) => void;
  onLayerBlendChange?: (layer: SpatialLayer, blendMode: LayerBlendMode) => void;
  onCameraPresetChange: (preset: CameraPreset) => void;
  onGlobeFallbackTo2D: () => void;
  onSelectScientificMapMode?: (mode: ScientificMapLayerMode) => void;
  onUseAsCustomTarget?: (coord: SelenographicCoordinate) => void;
  customTarget?: CustomLandingTarget | null;
  isPinpointMode?: boolean;
  onPinpointCustomTarget?: (target: CustomLandingTarget) => void;
  isFullscreen?: boolean;
  isPassportOpen?: boolean;
  onOpenSiteIntel?: () => void;
  /** Reports whether the 3D scene is still loading, for the mode buttons' pending state. */
  onGlobePendingChange?: (pending: boolean) => void;
}

/**
 * The spatial panels. Each visualization is declared exactly once and placed
 * differently per view mode; the 2D-only, 3D-only and dual layouts share the
 * same elements, scenario values and preference handlers.
 *
 * The globe keeps its own boolean scene inputs; they are derived from the same overlay
 * state the 2D sheet composites, so switching projections cannot desynchronise them.
 */
export function SpatialViewport({
  viewMode,
  preferences,
  onToggleLayer,
  onLayerOpacityChange,
  onLayerBlendChange,
  onCameraPresetChange,
  onGlobeFallbackTo2D,
  onSelectScientificMapMode,
  onUseAsCustomTarget,
  customTarget,
  isPinpointMode,
  onPinpointCustomTarget,
  isFullscreen = false,
  isPassportOpen = false,
  onOpenSiteIntel,
  onGlobePendingChange,
}: SpatialViewportProps) {
  const { selectSite } = useScenarioCommands();
  const { site: selectedSite, conditions, ephemeris, epochIsoUtc } = useScenarioModel();

  const handleSelectSite = useCallback((site: CandidateSite) => selectSite(site.id), [selectSite]);

  const map = (
    <SouthPoleMap
      preferences={preferences}
      onToggleLayer={onToggleLayer}
      onLayerOpacityChange={onLayerOpacityChange}
      onLayerBlendChange={onLayerBlendChange}
      onSelectScientificMapMode={onSelectScientificMapMode}
      onUseAsCustomTarget={onUseAsCustomTarget}
      promotedTarget={customTarget ?? null}
      hideHeader={viewMode !== 'map2d'}
      hideRibbon
      isFullscreen={isFullscreen}
      isPassportOpen={isPassportOpen}
      onOpenSiteIntel={onOpenSiteIntel}
    />
  );

  const globe = (
    <VisualizationErrorBoundary
      fallbackTitle="3D Lunar Globe Encountered an Error"
      onFallbackTo2D={onGlobeFallbackTo2D}
    >
      <LunarGlobe3D
        selectedSite={selectedSite}
        onSelectSite={handleSelectSite}
        subSolarLatDeg={ephemeris.subSolarLatDeg}
        subSolarLonDeg={ephemeris.subSolarLonDeg}
        subEarthLatDeg={ephemeris.subEarthLatDeg}
        subEarthLonDeg={ephemeris.subEarthLonDeg}
        earthElevationDeg={conditions.earthElevationDeg}
        showGrid={isLayerVisible(preferences, 'grid')}
        showShadowRegions={isLayerVisible(preferences, 'psr')}
        showVectors={isLayerVisible(preferences, 'vectors')}
        showLaserTracks={isLayerVisible(preferences, 'laserTracks')}
        scientificMapMode={preferences.base.id}
        onToggleGrid={() => onToggleLayer('grid')}
        onToggleShadowRegions={() => onToggleLayer('psr')}
        onToggleVectors={() => onToggleLayer('vectors')}
        onToggleLaserTracks={() => onToggleLayer('laserTracks')}
        cameraPreset={preferences.cameraPreset}
        onCameraPresetChange={onCameraPresetChange}
        epochIsoUtc={epochIsoUtc}
        customTarget={customTarget}
        isPinpointMode={isPinpointMode}
        onPinpointCustomTarget={onPinpointCustomTarget}
        hideHeader
        hideRibbon
        isVisible={viewMode !== 'map2d'}
        onLoadingChange={onGlobePendingChange}
      />
    </VisualizationErrorBoundary>
  );

  // One persistent two-panel tree across all view modes: React keeps both the 2D map and
  // the WebGL globe mounted, so switching 2D → dual → 3D never rebuilds the expensive
  // globe scene. Hidden panels collapse via CSS; the globe's render loop pauses while
  // hidden (isVisible above).
  const isDual = viewMode === 'dual';
  return (
    <div
      data-testid="spatial-dual-viewport"
      className={`${
        isDual ? 'grid grid-cols-1 md:grid-cols-2 gap-3 p-2 overflow-y-auto md:overflow-hidden' : 'flex'
      } w-full h-full min-h-0 flex-1 bg-[var(--lm-color-canvas)]`}
    >
      <div
        data-testid="spatial-map-panel"
        className={isDual ? 'min-w-0 min-h-0' : 'w-full h-full min-h-0 min-w-0 flex-1'}
        hidden={viewMode === 'globe3d'}
      >
        <ViewportPanel
          title="2D Polar Map"
          subtitle="83°S–90°S Stereographic"
          subtitleClassName="text-[var(--lm-color-text-muted)]"
          showChrome={isDual}
        >
          {map}
        </ViewportPanel>
      </div>

      <div
        data-testid="spatial-globe-panel"
        className={isDual ? 'min-w-0 min-h-0' : 'w-full h-full min-h-0 min-w-0 flex-1'}
        hidden={viewMode === 'map2d'}
      >
        <ViewportPanel
          title="3D Moon Globe"
          subtitle="NASA LROC / LOLA DEM"
          subtitleClassName="text-[var(--lm-color-selected-site)]"
          showChrome={isDual}
        >
          {globe}
        </ViewportPanel>
      </div>
    </div>
  );
}
