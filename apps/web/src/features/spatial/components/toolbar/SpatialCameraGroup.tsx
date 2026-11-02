import React from 'react';
import { CameraPreset, SpatialPreferences } from '@/features/spatial/model/spatialPreferences';
import { SpatialViewMode } from '@/features/spatial/model/spatialViewMode';
import { ViewModeSelector } from './ViewModeSelector';
import { CameraPresetSelector } from './CameraPresetSelector';

export interface SpatialCameraGroupProps {
  viewMode: SpatialViewMode;
  onViewModeChange: (mode: SpatialViewMode) => void;
  preferences: SpatialPreferences;
  onCameraPresetChange: (preset: CameraPreset) => void;
  disabled?: boolean;
}

/**
 * Group 1: Camera Modes
 * Manages spatial projections (2D Polar Map, Dual View, 3D Moon Globe) and
 * partitioned camera presets (Global Context, South Pole Nadir, Tactical Site Views).
 */
export function SpatialCameraGroup({
  viewMode,
  onViewModeChange,
  preferences,
  onCameraPresetChange,
  disabled = false,
}: SpatialCameraGroupProps) {
  return (
    <div
      data-group="camera-modes"
      data-slot="camera-modes"
      role="region"
      aria-label="Camera Modes & Projections"
      className="flex min-w-0 max-w-full items-center gap-1.5 flex-wrap lg:flex-nowrap lg:shrink-0"
    >
      {/* Slot 1: ViewModeSelector */}
      <div data-slot="view-modes" className="shrink-0">
        <ViewModeSelector viewMode={viewMode} onViewModeChange={onViewModeChange} />
      </div>

      {/* Slot 2: Compact Camera Preset Dropdown (~125px); wraps to its own row on phones */}
      <div data-slot="camera-preset" className="min-w-0">
        <CameraPresetSelector
          preferences={preferences}
          onCameraPresetChange={onCameraPresetChange}
          disabled={disabled}
          compact
        />
      </div>
    </div>
  );
}
