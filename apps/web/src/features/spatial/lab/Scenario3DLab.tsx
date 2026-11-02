import React from 'react';
import { LunarGlobe3D } from '@/features/spatial/ui/LunarGlobe3D';
import { GlobeSiteInspectionPanel } from '@/features/spatial/globe/components/GlobeSiteInspectionPanel';
import { availableValue } from '@/shared/formatting/availability';
import { SiteComparisonMatrixModal } from '@/features/spatial/components/SiteComparisonMatrixModal';
import { CameraPreset, isLayerVisible } from '@/features/spatial/model/spatialPreferences';
import { PlanetaryTheaterHeader } from './components/PlanetaryTheaterHeader';
import { PlanetaryTheaterToolbar } from './components/PlanetaryTheaterToolbar';
import { PlanetaryTheaterSidebar } from './components/PlanetaryTheaterSidebar';
import { usePlanetaryTheaterState } from './hooks/usePlanetaryTheaterState';
import { useHorizonProfile } from '@/features/horizon/ui';

export interface Scenario3DLabProps {
  onReturnToObservatory?: () => void;
}

export interface Scenario3DLabEscapeState {
  isComparisonOpen: boolean;
  setIsComparisonOpen: (open: boolean) => void;
  cameraPreset: CameraPreset;
  setCameraPreset: (preset: CameraPreset) => void;
  isFullscreen: boolean;
  setIsFullscreen: (fullscreen: boolean) => void;
}

/**
 * Escape key hierarchy for Scenario3DLab:
 * 1. Comparison Matrix Modal -> 2. Camera Horizon/Inspection Reset -> 3. Fullscreen Exit
 */
export function handleScenario3DLabEscape(state: Scenario3DLabEscapeState): boolean {
  if (state.isComparisonOpen) { state.setIsComparisonOpen(false); return true; }
  if (state.cameraPreset === 'horizon' || state.cameraPreset === 'inspection') { state.setCameraPreset('site'); return true; }
  if (state.isFullscreen) {
    if (typeof document !== 'undefined' && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    state.setIsFullscreen(false);
    return true;
  }
  return false;
}

export function Scenario3DLab({ onReturnToObservatory }: Scenario3DLabProps = {}) {
  const state = usePlanetaryTheaterState();
  // Task 4.4: backend curated horizon profile (2 m mast) driving the 3D skyline silhouette.
  const { profile: horizonProfile } = useHorizonProfile(state.selectedSite.id, 2);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleScenario3DLabEscape({
          isComparisonOpen: state.isComparisonOpen,
          setIsComparisonOpen: state.setIsComparisonOpen,
          cameraPreset: state.preferences.cameraPreset,
          setCameraPreset: state.selectCameraPreset,
          isFullscreen: state.isFullscreen,
          setIsFullscreen: state.setIsFullscreen,
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    state.isComparisonOpen, state.setIsComparisonOpen,
    state.preferences.cameraPreset, state.selectCameraPreset,
    state.isFullscreen, state.setIsFullscreen,
  ]);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      state.setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [state.setIsFullscreen]);

  const toggleNativeFullscreen = async () => {
    try {
      if (!document.fullscreenElement && state.containerRef.current) {
        await state.containerRef.current.requestFullscreen();
        state.setIsFullscreen(true);
      } else if (document.fullscreenElement) {
        await document.exitFullscreen();
        state.setIsFullscreen(false);
      }
    } catch {
      state.setIsFullscreen((prev) => !prev);
    }
  };

  const handleReturnToObservatory = () => {
    if (onReturnToObservatory) {
      onReturnToObservatory();
      return;
    }
    try {
      window.history.pushState(null, '', '/explore');
      window.dispatchEvent(new PopStateEvent('popstate'));
    } catch {
      window.location.href = '/';
    }
  };

  return (
    <div
      ref={state.containerRef}
      style={{ touchAction: 'none' }}
      className={`relative w-full h-full min-h-0 bg-[var(--lm-color-canvas)] text-[var(--lm-color-text-primary)] overflow-hidden flex flex-col select-none font-sans touch-none ${
        state.isFullscreen ? 'fixed inset-0 z-50 !w-screen !h-screen' : ''
      }`}
    >
      <PlanetaryTheaterHeader
        selectedSite={state.selectedSite} onSelectSite={state.handleSelectSite}
        cameraPreset={state.preferences.cameraPreset}
          isFlyoverActive={state.isFlyoverActive} isSplitView={state.isSplitView}
        onToggleSplitView={() => state.setIsSplitView((prev) => !prev)}
        showSitePanel={state.showSitePanel} onToggleSitePanel={() => state.setShowSitePanel((prev) => !prev)}
        showDiagnostics={state.showDiagnostics} onToggleDiagnostics={() => state.setShowDiagnostics((prev) => !prev)}
        isFullscreen={state.isFullscreen} onToggleFullscreen={toggleNativeFullscreen}
        onOpenComparison={() => state.setIsComparisonOpen(true)} onReturnToObservatory={handleReturnToObservatory}
      />

      <main className="flex-1 w-full h-full relative min-h-0 flex overflow-hidden">
        <div className={`h-full relative min-h-0 transition-all duration-300 ${state.isSplitView ? 'w-1/2' : 'w-full'}`}>
          <LunarGlobe3D
            selectedSite={state.selectedSite} onSelectSite={state.handleSelectSite}
            subSolarLatDeg={state.ephemeris.subSolarLatDeg} subSolarLonDeg={state.ephemeris.subSolarLonDeg}
            subEarthLatDeg={state.ephemeris.subEarthLatDeg} subEarthLonDeg={state.ephemeris.subEarthLonDeg}
            earthElevationDeg={state.conditions.earthElevationDeg}
            showGrid={isLayerVisible(state.preferences, 'grid')} showShadowRegions={isLayerVisible(state.preferences, 'psr')}
            showVectors={isLayerVisible(state.preferences, 'vectors')} showLaserTracks={isLayerVisible(state.preferences, 'laserTracks')}
            showTerrain={state.showTerrain} showMarkers={state.showMarkers} showLabels={state.showLabels}
            displayFillLighting={state.preferences.displayFillLighting}
            horizonProfile={horizonProfile}
            onToggleGrid={() => state.toggleLayer('grid')}
            onToggleShadowRegions={() => state.toggleLayer('psr')}
            onToggleVectors={() => state.toggleLayer('vectors')}
            onToggleLaserTracks={() => state.toggleLayer('laserTracks')}
            cameraPreset={state.preferences.cameraPreset} onCameraPresetChange={state.selectCameraPreset}
            scientificMapMode={state.preferences.base.id}
            showDiagnostics={state.showDiagnostics} epochIsoUtc={state.epochIsoUtc}
            isFlyoverActive={state.isFlyoverActive} onFlyoverChange={state.setIsFlyoverActive}
            hideHeader hideRibbon hideLegend
          />

          {state.showSitePanel && (
            <div className="absolute top-14 left-4 z-20 pointer-events-none">
              <GlobeSiteInspectionPanel
                site={state.selectedSite} epochIsoUtc={state.epochIsoUtc}
                sunElevationDeg={state.conditions.sunElevationDeg ? availableValue(state.conditions.sunElevationDeg) ?? -1.29 : -1.29}
                sunAzimuthDeg={state.conditions.sunAzimuthDeg ? availableValue(state.conditions.sunAzimuthDeg) ?? 52.9 : 52.9}
                earthElevationDeg={state.conditions.earthElevationDeg}
                onEnterLocalInspection={() => state.selectCameraPreset('inspection')}
                currentMode={state.preferences.cameraPreset === 'oblique' || state.preferences.cameraPreset === 'inspection' ? 'inspection' : state.preferences.cameraPreset === 'site' ? 'overview' : 'regional'}
              />
            </div>
          )}

        </div>

        <PlanetaryTheaterSidebar isSplitView={state.isSplitView} onReturnToObservatory={handleReturnToObservatory} />
      </main>

      <PlanetaryTheaterToolbar
        preferences={state.preferences} onSelectCameraPreset={state.selectCameraPreset}
        onSelectScientificMapMode={state.selectScientificMapMode} onToggleLayer={state.toggleLayer}
        showTerrain={state.showTerrain} onToggleTerrain={() => state.setShowTerrain((prev) => !prev)}
        showMarkers={state.showMarkers} onToggleMarkers={() => state.setShowMarkers((prev) => !prev)}
        showLabels={state.showLabels} onToggleLabels={() => state.setShowLabels((prev) => !prev)}
        displayFillLighting={state.preferences.displayFillLighting} onToggleFillLighting={state.handleToggleFillLighting}
        isFlyoverActive={state.isFlyoverActive} onToggleFlyover={() => state.setIsFlyoverActive((prev) => !prev)}
        onResetCamera={state.handleResetCamera} onResetSelection={state.handleResetSelection} isPlaying={state.isPlaying} onTogglePlayback={state.togglePlayback}
        onStepTimeHours={state.stepTimeHours} isControlsCollapsed={state.isControlsCollapsed}
        onToggleCollapsed={() => state.setIsControlsCollapsed((prev) => !prev)}
      />

      <SiteComparisonMatrixModal
        isOpen={state.isComparisonOpen} onClose={() => state.setIsComparisonOpen(false)}
        selectedSiteId={state.selectedSite.id} onSelectSite={state.handleSelectSite}
      />
    </div>
  );
}
