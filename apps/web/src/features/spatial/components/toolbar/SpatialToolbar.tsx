import { useState } from 'react';
import { CameraPreset, ScientificMapLayerMode, SpatialLayer, SpatialPreferences } from '@/features/spatial/model/spatialPreferences';
import { SpatialViewMode } from '@/features/spatial/model/spatialViewMode';
import { CAMERA_PRESETS, CAMERA_PRESET_ALIASES } from '@/features/spatial/config/spatialToolbarOptions';
import { SpatialCameraGroup } from './SpatialCameraGroup';
import { SpatialLayersGroup } from './SpatialLayersGroup';
import { SpatialOverlaysGroup } from './SpatialOverlaysGroup';
import { SpatialTimeGroup } from './SpatialTimeGroup';

export interface SpatialToolbarProps {
  viewMode: SpatialViewMode;
  onViewModeChange: (mode: SpatialViewMode) => void;
  preferences: SpatialPreferences;
  onToggleLayer: (layer: SpatialLayer) => void;
  onCameraPresetChange: (preset: CameraPreset) => void;
  isFullscreenActive: boolean;
  onToggleFullscreen: () => void;
  onOpenComparisonModal?: () => void;
  onOpenMissionDossier?: () => void;
  onOpenCustomTargetStudio?: () => void;
  isPinpointMode?: boolean;
  onTogglePinpointMode?: () => void;
  isFlyoverActive?: boolean;
  onToggleFlyover?: () => void;
  isSiteIntelOpen?: boolean;
  onToggleSiteIntel?: () => void;
  showTerrain?: boolean;
  onToggleTerrain?: () => void;
  onSelectScientificMapMode?: (mode: ScientificMapLayerMode) => void;
  showHorizonMask?: boolean;
  onToggleHorizonMask?: () => void;
  isPassportOpen?: boolean;
  onTogglePassport?: () => void;
  passportTitle?: string;
  passportTestId?: string;
}

/**
 * Aerospace-grade spatial workspace toolbar.
 * Decomposes controls into 4 orthogonal functional groups separated by visual dividers:
 * 1. Camera Modes (Global Context, South Pole Nadir, Tactical Site Views)
 * 2. Display Layers (Terrain Relief, Crater Rim Loops, SVS 3727 Hypsometry, Graticule, 83°S Footprint, LOLA Tracks)
 * 3. Analytical Overlays (Celestial Vectors, Slope Hazard Heatmap, Horizon Mask)
 * 4. Time & Workspace Controls (Flyover Tour, Pinpoint 3D Drop, Target Studio, Site Intel Drawer, Fullscreen)
 */
export function SpatialToolbar({
  viewMode, onViewModeChange, preferences, onToggleLayer, onCameraPresetChange,
  isFullscreenActive, onToggleFullscreen, onOpenComparisonModal, onOpenMissionDossier,
  onOpenCustomTargetStudio, isPinpointMode, onTogglePinpointMode, isFlyoverActive, onToggleFlyover,
  isSiteIntelOpen, onToggleSiteIntel, showTerrain, onToggleTerrain, onSelectScientificMapMode,
  showHorizonMask, onToggleHorizonMask, isPassportOpen, onTogglePassport, passportTitle, passportTestId,
}: SpatialToolbarProps) {
  const is2D = viewMode === 'map2d';
  const [internalFlyover, setInternalFlyover] = useState(false);
  const isFlyover = isFlyoverActive ?? internalFlyover;

  const handleToggleFlyover = () => {
    if (onToggleFlyover) {
      onToggleFlyover();
      return;
    }
    const next = !internalFlyover;
    setInternalFlyover(next);
    if (typeof window !== 'undefined' && (window as any).__globeHandle?.setFlyover) {
      (window as any).__globeHandle.setFlyover(next);
    }
  };

  return (
    <div
      role="toolbar" aria-label="Spatial Flight Deck Controls" data-testid="spatial-toolbar"
      className="flex items-center gap-y-2 gap-x-1.5 flex-wrap w-full"
    >
      {/* Group 1: Camera Modes */}
      <SpatialCameraGroup
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        preferences={preferences}
        onCameraPresetChange={onCameraPresetChange}
        disabled={is2D}
      />

      <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-[var(--lm-color-border)] sm:block" role="separator" aria-orientation="vertical" />

      {/* Group 2: Display Layers */}
      <SpatialLayersGroup
        preferences={preferences}
        onToggleLayer={onToggleLayer}
        showTerrain={showTerrain}
        onToggleTerrain={onToggleTerrain}
        onSelectScientificMapMode={onSelectScientificMapMode}
      />

      <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-[var(--lm-color-border)] sm:block" role="separator" aria-orientation="vertical" />

      {/* Group 3: Analytical Overlays */}
      <SpatialOverlaysGroup
        preferences={preferences}
        onToggleLayer={onToggleLayer}
        onSelectScientificMapMode={onSelectScientificMapMode}
        showHorizonMask={showHorizonMask}
        onToggleHorizonMask={onToggleHorizonMask}
      />

      <div className="mx-0.5 hidden h-5 w-px shrink-0 bg-[var(--lm-color-border)] sm:block" role="separator" aria-orientation="vertical" />

      {/* Group 4: Time & Workspace Controls */}
      <SpatialTimeGroup
        is2D={is2D}
        isPinpointMode={isPinpointMode}
        onTogglePinpointMode={onTogglePinpointMode}
        isFlyover={isFlyover}
        onToggleFlyover={handleToggleFlyover}
        onOpenCustomTargetStudio={onOpenCustomTargetStudio}
        isSiteIntelOpen={isSiteIntelOpen}
        onToggleSiteIntel={onToggleSiteIntel}
        isFullscreenActive={isFullscreenActive}
        onToggleFullscreen={onToggleFullscreen}
        onOpenComparisonModal={onOpenComparisonModal}
        onOpenMissionDossier={onOpenMissionDossier}
        isPassportOpen={isPassportOpen}
        onTogglePassport={onTogglePassport}
        passportTitle={passportTitle}
        passportTestId={passportTestId}
      />

      {/* Automation aliases for test harnesses */}
      <div className="hidden" aria-hidden="true">
        {CAMERA_PRESETS.map((p) => (
          <button key={`preset-${p.id}-${p.preset}`} type="button" tabIndex={-1} data-testid={`preset-${p.preset}`} onClick={() => onCameraPresetChange(p.preset)} />
        ))}
        {CAMERA_PRESET_ALIASES.filter((a) => a.preset !== 'nadir' || a.id !== 'southPole').map((a) => (
          <button key={`alias-${a.id}-${a.preset}`} type="button" tabIndex={-1} data-testid={`preset-${a.preset}`} onClick={() => onCameraPresetChange(a.preset)} />
        ))}
        <button type="button" tabIndex={-1} data-testid="toggle-split-view" onClick={() => onViewModeChange(viewMode === 'dual' ? 'globe3d' : 'dual')} />
      </div>
    </div>
  );
}
