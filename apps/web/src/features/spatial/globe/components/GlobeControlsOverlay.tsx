import React from 'react';
import { Compass, Eye, Crosshair, ZoomIn } from 'lucide-react';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';

export interface GlobeControlsOverlayProps {
  cameraPreset: CameraPreset;
  onSelectPreset: (preset: CameraPreset) => void;
  showGrid: boolean;
  showShadowRegions: boolean;
  showVectors: boolean;
  showLaserTracks?: boolean;
  onToggleGrid: () => void;
  onToggleShadowRegions: () => void;
  onToggleVectors: () => void;
  onToggleLaserTracks?: () => void;
}

const NADIR_BUTTON_BASE =
  'flex items-center gap-1 px-2.5 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors';
const ICON_PRESET_BUTTON_BASE =
  'flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors';
const GLOBAL_BUTTON_BASE =
  'px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors';

const ACTIVE_BUTTON_SUFFIX =
  'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)]/60 font-semibold';
const INACTIVE_BUTTON_SUFFIX =
  'text-[var(--lm-color-text-secondary)] hover:text-[var(--lm-color-text-primary)] hover:bg-[var(--lm-color-surface-raised)]';

function presetButtonClass(base: string, isActive: boolean): string {
  return `${base} ${isActive ? ACTIVE_BUTTON_SUFFIX : INACTIVE_BUTTON_SUFFIX}`;
}

const LAYER_BUTTON_BASE =
  'px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors';

function layerButtonClass(activeClass: string, isOn: boolean): string {
  return isOn
    ? `${LAYER_BUTTON_BASE} ${activeClass}`
    : `${LAYER_BUTTON_BASE} text-[var(--lm-color-text-muted)] hover:text-[var(--lm-color-text-primary)]`;
}

/** The globe's own floating header, shown when it is not embedded in the workspace toolbar. */
export function GlobeControlsOverlay({
  cameraPreset,
  onSelectPreset,
  showGrid,
  showShadowRegions,
  showVectors,
  showLaserTracks = true,
  onToggleGrid,
  onToggleShadowRegions,
  onToggleVectors,
  onToggleLaserTracks,
}: GlobeControlsOverlayProps) {
  return (
    <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 bg-[var(--lm-color-surface)]/90 backdrop-blur-xs px-2.5 py-1.5 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] shadow-xs">
        <span className="text-xs font-semibold text-[var(--lm-color-text-primary)]">
          NASA LRO Lunar Visualization
        </span>
        <span className="text-[11px] font-mono text-[var(--lm-color-selected-site)] border-l border-[var(--lm-color-border)] pl-2">
          LROC Color + LOLA DEM Relief
        </span>
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5 bg-[var(--lm-color-surface)]/90 backdrop-blur-xs p-1 rounded-[var(--lm-radius-sm)] border border-[var(--lm-color-border)] shadow-xs">
        <div className="flex items-center gap-1 border-r border-[var(--lm-color-border)] pr-1.5">
          <button
            type="button"
            onClick={() => onSelectPreset('global')}
            title="Global Context: Complete Moon sphere overview"
            className={presetButtonClass(GLOBAL_BUTTON_BASE, cameraPreset === 'global')}
          >
            Global
          </button>

          <button
            type="button"
            onClick={() => onSelectPreset('nadir')}
            title="South Pole Focus: Centered on Artemis candidate region"
            className={presetButtonClass(NADIR_BUTTON_BASE, cameraPreset === 'nadir')}
          >
            <Compass className="w-3.5 h-3.5 text-[var(--lm-color-selected-site)]" />
            <span>South Pole</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPreset('oblique')}
            title="Oblique Terrain: Perspective view across South Pole crater rims and relief"
            className={presetButtonClass(ICON_PRESET_BUTTON_BASE, cameraPreset === 'oblique')}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Oblique</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPreset('site')}
            title="Focus camera on selected candidate site"
            className={presetButtonClass(ICON_PRESET_BUTTON_BASE, cameraPreset === 'site')}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>Site Focus</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPreset('inspection')}
            title="Local Site Inspection: Deep zoom grazing view of crater relief and lighting"
            className={presetButtonClass(ICON_PRESET_BUTTON_BASE, cameraPreset === 'inspection')}
          >
            <ZoomIn className="w-3.5 h-3.5 text-[var(--lm-color-sun)]" />
            <span>Inspect</span>
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleShadowRegions}
            title="Toggle 2D Polar Map Boundary Circle (83°S Footprint)"
            className={layerButtonClass(
              'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-selected-site)] border border-[var(--lm-color-selected-site)]/40 font-semibold',
              showShadowRegions,
            )}
          >
            2D Extent
          </button>

          <button
            type="button"
            onClick={onToggleVectors}
            title="Toggle Celestial Direction Rays"
            className={layerButtonClass(
              'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-sun)] border border-[var(--lm-color-sun)]/40 font-semibold',
              showVectors,
            )}
          >
            Vectors
          </button>

          <button
            type="button"
            onClick={onToggleLaserTracks}
            title="Toggle NASA SVS 3633 LOLA Laser Altimeter Ground Tracks"
            className={layerButtonClass(
              'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-info)] border border-[var(--lm-color-info)]/40 font-semibold',
              showLaserTracks,
            )}
          >
            Tracks
          </button>

          <button
            type="button"
            onClick={onToggleGrid}
            title="Toggle Selenographic Coordinate Graticule"
            className={layerButtonClass(
              'bg-[var(--lm-color-surface-raised)] text-[var(--lm-color-text-primary)] border border-[var(--lm-color-border)]',
              showGrid,
            )}
          >
            Grid
          </button>
        </div>
      </div>
    </div>
  );
}
