import React from 'react';
import { Sun, AlertTriangle, Mountain } from 'lucide-react';
import {
  isLayerVisible,
  ScientificMapLayerMode,
  SpatialLayer,
  SpatialPreferences,
} from '@/features/spatial/model/spatialPreferences';
import {
  TOGGLE_STATE_ON_CLASS,
  TOOLBAR_BUTTON_IDLE_CLASS,
  TOOLBAR_GROUP_CLASS,
} from '@/features/spatial/config/spatialToolbarOptions';

export interface SpatialOverlaysGroupProps {
  preferences: SpatialPreferences;
  onToggleLayer: (layer: SpatialLayer) => void;
  onSelectScientificMapMode?: (mode: ScientificMapLayerMode) => void;
  showHorizonMask?: boolean;
  onToggleHorizonMask?: () => void;
}

const OVERLAY_CLASS =
  'flex items-center gap-1 px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors min-h-[28px] min-w-[28px] whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lm-color-canvas)]';

/**
 * Group 3: Analytical Overlays
 * Celestial vectors (the grazing Sun vector and the Earth *geometric* line-of-sight
 * direction — a sightline, not an RF link), the slope hazard heatmap, and the
 * topocentric horizon occlusion mask.
 *
 * Colours belong to the data, not the button: the hazard ramp is explained once in the
 * map legend, and every toggle here uses the shared outline/fill vocabulary.
 */
export function SpatialOverlaysGroup({
  preferences,
  onToggleLayer,
  onSelectScientificMapMode,
  showHorizonMask = false,
  onToggleHorizonMask,
}: SpatialOverlaysGroupProps) {
  const isVectors = isLayerVisible(preferences, 'vectors');
  const isSlopeMode = preferences.base.id === 'slope';

  const handleToggleSlope = () => {
    if (onSelectScientificMapMode) {
      // The reducer records the prior base at slope-selection time; restoring it (or
      // Natural when nothing was recorded) keeps this toggle honest with the legend
      // and 3D-lab base selectors, which mutate the same state.
      onSelectScientificMapMode(isSlopeMode ? preferences.previousBaseId ?? 'none' : 'slope');
    }
  };

  return (
    <div
      data-group="analytical-overlays"
      data-slot="analytical-overlays"
      role="region"
      aria-label="Analytical Overlays"
      className="flex min-w-0 max-w-full items-center gap-1 lg:shrink-0"
    >
      <div
        className={`${TOOLBAR_GROUP_CLASS} flex-wrap lg:flex-nowrap`}
        role="group"
        aria-label="Analytical Overlay Toggles"
      >
        {/* 1. Celestial Vectors (Sun & Earth Sightline) */}
        <button
          type="button"
          onClick={() => onToggleLayer('vectors')}
          title="Toggle Grazing Sun Vector & Earth Geometric LoS Sightline (not an RF link budget)"
          aria-label="Toggle celestial vectors"
          aria-pressed={isVectors}
          className={`${OVERLAY_CLASS} ${isVectors ? TOGGLE_STATE_ON_CLASS : TOOLBAR_BUTTON_IDLE_CLASS}`}
        >
          <Sun className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Vectors</span>
        </button>

        {/* 2. Slope Hazard Heatmap */}
        <button
          type="button"
          onClick={handleToggleSlope}
          title="Toggle LOLA Slope Hazard Heatmap (Steep Terrain & Lander Stability Limits)"
          aria-label="Toggle slope hazard heatmap"
          aria-pressed={isSlopeMode}
          className={`${OVERLAY_CLASS} ${isSlopeMode ? TOGGLE_STATE_ON_CLASS : TOOLBAR_BUTTON_IDLE_CLASS}`}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span>Slope</span>
        </button>

        {/* 3. Horizon Occlusion Mask Profile */}
        {onToggleHorizonMask && (
          <button
            type="button"
            onClick={onToggleHorizonMask}
            title="Toggle Topocentric Horizon Occlusion Mask Profile"
            aria-label="Toggle horizon occlusion mask"
            aria-pressed={showHorizonMask}
            className={`${OVERLAY_CLASS} ${showHorizonMask ? TOGGLE_STATE_ON_CLASS : TOOLBAR_BUTTON_IDLE_CLASS}`}
          >
            <Mountain className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Horizon</span>
          </button>
        )}
      </div>
    </div>
  );
}
