import type { HorizonProfileResponse } from '@luna/contracts';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { ResultAvailability } from '@/domain/celestial/availability';
import { availableValue } from '@/shared/formatting/availability';
import { CameraPreset, ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import {
  SelenographicLatitudeDeg,
  SelenographicLongitudeDeg,
  TopocentricElevationDeg,
} from '@/domain/coordinates/frames';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';
import {
  GlobeLoadingOverlay,
  GlobeTextureErrorBanner,
  GlobeUnavailablePanel,
  GlobeContextLostBanner,
} from '@/features/spatial/globe/components/GlobeStatusOverlay';
import { GlobeControlsOverlay } from '@/features/spatial/globe/components/GlobeControlsOverlay';
import { GlobeHoverCard } from '@/features/spatial/globe/components/GlobeHoverCard';
import { GlobeLegend } from '@/features/spatial/globe/components/GlobeLegend';
import { ScientificLayerLegend } from '@/features/spatial/globe/components/ScientificLayerLegend';
import { NasaSvsElevationLegend } from '@/features/spatial/globe/components/NasaSvsElevationLegend';
import { GlobeCandidateRibbon } from '@/features/spatial/globe/components/GlobeCandidateRibbon';
import { GlobeFlightDeckHudOverlay } from '@/features/spatial/globe/components/GlobeFlightDeckHudOverlay';
import { useGlobeScene } from '@/features/spatial/globe/hooks/useGlobeScene';

export interface LunarGlobe3DProps {
  selectedSite: CandidateSite;
  onSelectSite: (site: CandidateSite) => void;
  subSolarLatDeg: SelenographicLatitudeDeg;
  subSolarLonDeg: SelenographicLongitudeDeg;
  subEarthLatDeg: SelenographicLatitudeDeg;
  subEarthLonDeg: SelenographicLongitudeDeg;
  earthElevationDeg?: ResultAvailability<TopocentricElevationDeg>;
  showGrid: boolean;
  showShadowRegions: boolean;
  showVectors: boolean;
  showLaserTracks?: boolean;
  showTerrain?: boolean;
  showMarkers?: boolean;
  showLabels?: boolean;
  /** Lighting honesty (task 3.3): gates ambient + earthshine + bloom as one display unit. */
  displayFillLighting?: boolean;
  /** Task 4.4: backend curated horizon profile for the skyline silhouette overlay. */
  horizonProfile?: HorizonProfileResponse | null;
  onToggleGrid: () => void;
  onToggleShadowRegions: () => void;
  onToggleVectors: () => void;
  onToggleLaserTracks?: () => void;
  hideHeader?: boolean;
  hideRibbon?: boolean;
  hideLegend?: boolean;
  cameraPreset: CameraPreset;
  onCameraPresetChange: (preset: CameraPreset) => void;
  scientificMapMode?: ScientificMapLayerMode;
  showDiagnostics?: boolean;
  epochIsoUtc?: string;
  isFlyoverActive?: boolean;
  onFlyoverChange?: (active: boolean) => void;
  customTarget?: CustomLandingTarget | null;
  isPinpointMode?: boolean;
  onPinpointCustomTarget?: (target: CustomLandingTarget) => void;
}

/**
 * Authoritative 3D lunar flight deck rendering IAU 2000 ME frames and LOLA DEM.
 * Scene management delegates to useGlobeScene; HUD overlays mount in GlobeFlightDeckHudOverlay.
 */
export function LunarGlobe3D(props: LunarGlobe3DProps) {
  const {
    selectedSite,
    cameraPreset,
    onCameraPresetChange,
    onSelectSite,
    hideHeader = false,
    hideRibbon = false,
    hideLegend = false,
    showDiagnostics = false,
    epochIsoUtc,
  } = props;

  const earthElevationValue = props.earthElevationDeg === undefined ? null : availableValue(props.earthElevationDeg);
  const earthElevationDisplay =
    earthElevationValue === null ? '—' : `${earthElevationValue >= 0 ? '+' : ''}${earthElevationValue.toFixed(1)}° elev`;

  const { containerRef, status, hoveredSite, applyCameraPreset, getDiagnostics, restoreContext } = useGlobeScene({
    ...props,
    earthElevationDeg: earthElevationValue,
  });

  if (status.kind === 'unsupported') return <GlobeUnavailablePanel />;

  return (
    <div className="relative w-full h-full flex flex-col bg-[var(--lm-color-canvas)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-lg)] overflow-hidden select-none min-h-0">
      {!hideHeader && (
        <GlobeControlsOverlay
          cameraPreset={cameraPreset}
          onSelectPreset={(preset) => applyCameraPreset(preset, selectedSite)}
          showGrid={props.showGrid}
          showShadowRegions={props.showShadowRegions}
          showVectors={props.showVectors}
          showLaserTracks={props.showLaserTracks}
          onToggleGrid={props.onToggleGrid}
          onToggleShadowRegions={props.onToggleShadowRegions}
          onToggleVectors={props.onToggleVectors}
          onToggleLaserTracks={props.onToggleLaserTracks}
        />
      )}

      {status.kind === 'loading' && <GlobeLoadingOverlay />}
      {status.kind === 'textureError' && <GlobeTextureErrorBanner message={status.message} />}
      {status.kind === 'contextLost' && <GlobeContextLostBanner onRestore={restoreContext} />}

      <div
        ref={containerRef}
        style={{ touchAction: 'none' }}
        className="w-full h-full flex-1 cursor-grab active:cursor-grabbing min-h-0 touch-none"
      />

      <GlobeFlightDeckHudOverlay
        cameraPreset={cameraPreset}
        onCameraPresetChange={onCameraPresetChange}
        selectedSite={selectedSite}
        subSolarLatDeg={props.subSolarLatDeg}
        subSolarLonDeg={props.subSolarLonDeg}
        subEarthLatDeg={props.subEarthLatDeg}
        subEarthLonDeg={props.subEarthLonDeg}
        earthElevationValue={earthElevationValue}
        showDiagnostics={showDiagnostics}
        getDiagnostics={getDiagnostics}
        epochIsoUtc={epochIsoUtc}
      />

      {hoveredSite && <GlobeHoverCard site={hoveredSite} />}
      {!hideLegend && <GlobeLegend earthElevationDisplay={earthElevationDisplay} isCompact={hideRibbon} showPsr={props.showShadowRegions} />}
      <NasaSvsElevationLegend isVisible={props.scientificMapMode === 'topography'} />
      {/* Task 5.1: per-layer scientific legend; renders nothing in natural/topography modes. */}
      <ScientificLayerLegend mode={props.scientificMapMode} />

      {!hideRibbon && (
        <GlobeCandidateRibbon
          selectedSiteId={selectedSite.id}
          onSelectSite={(site) => {
            onSelectSite(site);
            applyCameraPreset('site', site);
          }}
        />
      )}
    </div>
  );
}
