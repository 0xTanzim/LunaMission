import React from 'react';
import { Rewind, FastForward, Play, Pause } from 'lucide-react';
import { CameraPreset, ScientificMapLayerMode, SpatialPreferences } from '@/features/spatial/model/spatialPreferences';
import type { MapOverlayId } from '@/features/spatial/model/mapLayerStack';
import { PlanetaryTheaterCameraButtons } from './PlanetaryTheaterCameraButtons';
import {
  PlanetaryTheaterScientificLayerButtons,
  PlanetaryTheaterVisualizationButtons,
} from './PlanetaryTheaterLayerButtons';

export interface PlanetaryTheaterToolbarProps {
  preferences: SpatialPreferences;
  onSelectCameraPreset: (preset: CameraPreset) => void;
  onSelectScientificMapMode: (mode: ScientificMapLayerMode) => void;
  onToggleLayer: (layer: MapOverlayId) => void;
  showTerrain: boolean;
  onToggleTerrain: () => void;
  showMarkers: boolean;
  onToggleMarkers: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  /** Display fill lighting (ambient + earthshine + bloom) — screen-readability aid (3.3). */
  displayFillLighting: boolean;
  onToggleFillLighting: () => void;
  isFlyoverActive: boolean;
  onToggleFlyover: () => void;
  onResetCamera: () => void;
  onResetSelection?: () => void;
  isPlaying: boolean;
  onTogglePlayback: () => void;
  onStepTimeHours: (hours: number) => void;
  isControlsCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export function PlanetaryTheaterToolbar({
  preferences,
  onSelectCameraPreset,
  onSelectScientificMapMode,
  onToggleLayer,
  showTerrain,
  onToggleTerrain,
  showMarkers,
  onToggleMarkers,
  showLabels,
  onToggleLabels,
  displayFillLighting,
  onToggleFillLighting,
  isFlyoverActive,
  onToggleFlyover,
  onResetCamera,
  onResetSelection,
  isPlaying,
  onTogglePlayback,
  onStepTimeHours,
  isControlsCollapsed,
  onToggleCollapsed,
}: PlanetaryTheaterToolbarProps) {
  return (
    <div className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 max-w-[min(1180px,96vw)] w-full flex flex-col items-center gap-1 pointer-events-none">
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!isControlsCollapsed}
        aria-label={isControlsCollapsed ? 'Show 3D Navigation Dock' : 'Collapse 3D Navigation Dock'}
        className="pointer-events-auto px-3 py-1 rounded-t-[var(--lm-radius-sm)] bg-[var(--lm-color-surface)]/90 backdrop-blur-md border border-[var(--lm-color-border-subtle)] border-b-0 text-[11px] font-mono text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors shadow-xs min-h-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
      >
        {isControlsCollapsed ? '▲ Show 3D Navigation Dock' : '▼ Collapse Dock (Zen View)'}
      </button>

      {!isControlsCollapsed && (
        <div
          role="toolbar"
          aria-label="3D Planetary Theater Controls"
          className="pointer-events-auto w-full flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1.5 px-2 py-1.5 rounded-[var(--lm-radius-md)] bg-[var(--lm-color-surface)]/92 backdrop-blur-md border border-[var(--lm-color-border)] shadow-xl"
        >
          {/* Group 1: Camera Modes */}
          <PlanetaryTheaterCameraButtons
            currentPreset={preferences.cameraPreset}
            onSelectCameraPreset={onSelectCameraPreset}
            isFlyoverActive={isFlyoverActive}
            onToggleFlyover={onToggleFlyover}
            onResetCamera={onResetCamera}
            onResetSelection={onResetSelection}
          />

          {/* Group 2: what the scene draws */}
          <PlanetaryTheaterVisualizationButtons
            showTerrain={showTerrain}
            onToggleTerrain={onToggleTerrain}
            showMarkers={showMarkers}
            onToggleMarkers={onToggleMarkers}
            showLabels={showLabels}
            onToggleLabels={onToggleLabels}
            preferences={preferences}
            onToggleLayer={onToggleLayer}
            displayFillLighting={displayFillLighting}
            onToggleFillLighting={onToggleFillLighting}
          />

          {/* Group 3: measured/analytical surface quantities and reference geometry */}
          <PlanetaryTheaterScientificLayerButtons
            preferences={preferences}
            onToggleLayer={onToggleLayer}
            onSelectScientificMapMode={onSelectScientificMapMode}
          />

          {/* Provenance Badge */}
          <div className="hidden 2xl:flex items-center gap-1.5 px-2 py-1 text-[11px] font-mono text-[var(--lm-color-text-muted)] border border-[var(--lm-color-border-subtle)] rounded-[var(--lm-radius-sm)] bg-[var(--lm-color-surface-raised)] min-h-[28px]">
            <span className="text-[var(--lm-color-info)] font-semibold">NASA SVS 3727</span>
            <span>LOLA IDW model</span>
            <span className="text-[var(--lm-color-text-muted)]">|</span>
            <span>IAU MOON_ME</span>
          </div>

          {/* Group 4: Time & Ephemeris Controls */}
          <div
            data-group="time-workspace-controls"
            data-slot="time-workspace-controls"
            role="region"
            aria-label="Ephemeris Time Stepper Controls"
            className="flex items-center gap-1 flex-wrap lg:flex-nowrap lg:shrink-0 bg-[var(--lm-color-surface-raised)] p-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)]"
          >
            <button
              type="button"
              onClick={() => onStepTimeHours(-6)}
              className="p-1.5 rounded text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 flex items-center justify-center"
              title="Step Backward 6 Hours"
              aria-label="Step Backward 6 Hours"
            >
              <Rewind className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={onTogglePlayback}
              aria-pressed={isPlaying}
              aria-label={isPlaying ? 'Pause Ephemeris Playback' : 'Play Ephemeris Time Progression'}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors min-h-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                isPlaying
                  ? 'bg-[var(--lm-color-sun)]/20 text-[var(--lm-color-sun)] border border-[var(--lm-color-sun)]/50 font-semibold'
                  : 'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)]'
              }`}
              title={isPlaying ? 'Pause Ephemeris Playback' : 'Play Ephemeris Time Progression'}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => onStepTimeHours(6)}
              className="p-1.5 rounded text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)] transition-colors min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 flex items-center justify-center"
              title="Step Forward 6 Hours"
              aria-label="Step Forward 6 Hours"
            >
              <FastForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
