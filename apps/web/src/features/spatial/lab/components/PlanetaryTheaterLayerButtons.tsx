import React from 'react';
import { isLayerVisible, ScientificMapLayerMode, SpatialPreferences } from '@/features/spatial/model/spatialPreferences';
import type { MapOverlayId } from '@/features/spatial/model/mapLayerStack';

const GROUP_BASE =
  'flex items-center gap-1 flex-wrap lg:flex-nowrap lg:shrink-0 bg-[var(--lm-color-surface-raised)] p-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border-subtle)]';

const btnBaseCls =
  'px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950';

function toggleClass(isOn: boolean, activeClass: string): string {
  return isOn
    ? `${btnBaseCls} ${activeClass}`
    : `${btnBaseCls} text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]`;
}

export interface PlanetaryTheaterVisualizationButtonsProps {
  showTerrain: boolean;
  onToggleTerrain: () => void;
  showMarkers: boolean;
  onToggleMarkers: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  preferences: SpatialPreferences;
  onToggleLayer: (layer: MapOverlayId) => void;
  displayFillLighting: boolean;
  onToggleFillLighting: () => void;
}

/** Group 2: what the scene draws (surface mesh, markers, badges, celestial vectors). */
export function PlanetaryTheaterVisualizationButtons({
  showTerrain,
  onToggleTerrain,
  showMarkers,
  onToggleMarkers,
  showLabels,
  onToggleLabels,
  preferences,
  onToggleLayer,
  displayFillLighting,
  onToggleFillLighting,
}: PlanetaryTheaterVisualizationButtonsProps) {
  return (
    <div
      data-group="visualization"
      data-slot="visualization"
      role="region"
      aria-label="Visualization Controls"
      className={GROUP_BASE}
    >
      <button
        type="button"
        onClick={onToggleTerrain}
        aria-pressed={showTerrain}
        aria-label="Toggle Lunar Terrain Mesh"
        className={toggleClass(showTerrain, 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-primary)] border border-[var(--lm-color-border)] font-semibold')}
        title="Toggle Base Lunar Surface Terrain"
      >
        Terrain
      </button>

      <button
        type="button"
        onClick={onToggleMarkers}
        aria-pressed={showMarkers}
        aria-label="Toggle Candidate Site Markers"
        className={toggleClass(showMarkers, 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)]/40 font-semibold')}
        title="Toggle Candidate Site Markers"
      >
        Sites
      </button>

      <button
        type="button"
        onClick={onToggleLabels}
        aria-pressed={showLabels}
        aria-label="Toggle Site Badges & Labels"
        className={toggleClass(showLabels, 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/40 font-semibold')}
        title="Toggle Candidate Labels and Badges"
      >
        Labels
      </button>

      <button
        type="button"
        onClick={() => onToggleLayer('vectors')}
        aria-pressed={isLayerVisible(preferences, 'vectors')}
        aria-label="Toggle Celestial Vectors"
        className={toggleClass(isLayerVisible(preferences, 'vectors'), 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-sun)] border border-[var(--lm-color-sun)]/40 font-semibold')}
        title="Toggle Sun Vector and Earth Geometric LoS Sightline"
      >
        Vectors
      </button>

      <button
        type="button"
        onClick={onToggleFillLighting}
        aria-pressed={displayFillLighting}
        aria-label="Toggle Display Fill Lighting"
        className={toggleClass(displayFillLighting, 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-warning)] border border-[var(--lm-color-warning)]/40 font-semibold')}
        title="Display fill lighting: adds ambient light, earthshine and bloom for screen readability. The real lunar surface has none of these — the Sun light is always the epoch-accurate solar direction."
      >
        Fill Light
      </button>
    </div>
  );
}

export interface PlanetaryTheaterScientificLayerButtonsProps {
  preferences: SpatialPreferences;
  onToggleLayer: (layer: MapOverlayId) => void;
  onSelectScientificMapMode: (mode: ScientificMapLayerMode) => void;
}

/** Group 3: measured/analytical surface quantities and reference geometry. */
export function PlanetaryTheaterScientificLayerButtons({
  preferences,
  onToggleLayer,
  onSelectScientificMapMode,
}: PlanetaryTheaterScientificLayerButtonsProps) {
  return (
    <div
      data-group="scientific-layers"
      data-slot="scientific-layers"
      role="region"
      aria-label="Scientific Surface Layers"
      className={GROUP_BASE}
    >
      <button
        type="button"
        onClick={() => onToggleLayer('laserTracks')}
        aria-pressed={isLayerVisible(preferences, 'laserTracks')}
        aria-label="Toggle LOLA Laser Tracks"
        className={toggleClass(isLayerVisible(preferences, 'laserTracks'), 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/40 font-semibold')}
        title="Toggle NASA SVS 3633 LOLA Laser Altimeter Ground Tracks"
      >
        Tracks
      </button>

      <button
        type="button"
        onClick={() => onToggleLayer('psr')}
        aria-pressed={isLayerVisible(preferences, 'psr')}
        aria-label="Toggle 83°S Polar Footprint"
        className={toggleClass(isLayerVisible(preferences, 'psr'), 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-earth)] border border-[var(--lm-color-earth)]/40 font-semibold')}
        title="Toggle 83°S Polar Coverage Footprint Boundary"
      >
        Footprint
      </button>

      <button
        type="button"
        onClick={() => onToggleLayer('grid')}
        aria-pressed={isLayerVisible(preferences, 'grid')}
        aria-label="Toggle Coordinate Graticule"
        className={toggleClass(isLayerVisible(preferences, 'grid'), 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-primary)] border border-[var(--lm-color-border)] font-semibold')}
        title="Toggle Selenographic Coordinate Graticule"
      >
        Grid
      </button>

      <div className="flex items-center gap-1 pl-1 border-l border-[var(--lm-color-border-subtle)]">
        <select
          data-testid="select-3d-scientific-layer"
          aria-label="Scientific Surface Map Layer Mode"
          value={preferences.base.id}
          onChange={(e) => onSelectScientificMapMode(e.target.value as ScientificMapLayerMode)}
          className="bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-info)] border border-[var(--lm-color-border-subtle)] rounded px-1.5 py-1 text-xs font-mono min-h-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-info)] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 cursor-pointer"
          title="Select Scientific Surface Map Layer"
        >
          <option value="none">Natural (Regolith)</option>
          <option value="topography">Topo (NASA SVS 3727)</option>
          <option value="hillshade">Analytical Hillshade</option>
          <option value="slope">Slope Hazard</option>
          <option value="geology">Geology</option>
          <option value="illumination">Illumination (model)</option>
        </select>
      </div>
    </div>
  );
}
