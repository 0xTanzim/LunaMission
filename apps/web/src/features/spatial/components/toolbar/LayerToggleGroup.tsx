import React from 'react';
import {
  isLayerVisible,
  SpatialLayer,
  SpatialPreferences,
} from '@/features/spatial/model/spatialPreferences';
import {
  LAYER_BUTTONS,
  TOGGLE_STATE_ON_CLASS,
  TOOLBAR_BUTTON_IDLE_CLASS,
  TOOLBAR_GROUP_CLASS,
} from '@/features/spatial/config/spatialToolbarOptions';

export interface LayerToggleGroupProps {
  preferences: SpatialPreferences;
  onToggleLayer: (layer: SpatialLayer) => void;
  showTerrain?: boolean;
  onToggleTerrain?: () => void;
}

const TOGGLE_CLASS =
  'px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lm-color-canvas)]';

/**
 * Display layers toggle group: graticule, crater rim features, polar footprint/PSR,
 * and LOLA tracks — all on the shared outline/fill toggle vocabulary.
 */
export function LayerToggleGroup({
  preferences,
  onToggleLayer,
  showTerrain = true,
  onToggleTerrain,
}: LayerToggleGroupProps) {
  return (
    <div className={TOOLBAR_GROUP_CLASS} role="group" aria-label="Display Layers Controls">
      {onToggleTerrain && (
        <button
          type="button"
          onClick={onToggleTerrain}
          title="Toggle LOLA Base Terrain Relief Mesh"
          aria-label="Toggle terrain relief"
          aria-pressed={showTerrain}
          className={`${TOGGLE_CLASS} ${showTerrain ? TOGGLE_STATE_ON_CLASS : TOOLBAR_BUTTON_IDLE_CLASS}`}
        >
          Terrain
        </button>
      )}

      <button
        type="button"
        onClick={() => onToggleLayer('craters')}
        title="Toggle Lunar Crater Rim Loops and Morphology Features"
        aria-label="Toggle crater rim loops"
        aria-pressed={isLayerVisible(preferences, 'craters')}
        className={`${TOGGLE_CLASS} ${isLayerVisible(preferences, 'craters') ? TOGGLE_STATE_ON_CLASS : TOOLBAR_BUTTON_IDLE_CLASS}`}
      >
        Craters
      </button>

      {LAYER_BUTTONS.map(({ layer, label, title, ariaLabel }) => {
        const active = isLayerVisible(preferences, layer);
        return (
          <button
            key={layer}
            type="button"
            onClick={() => onToggleLayer(layer)}
            title={title}
            aria-label={ariaLabel}
            aria-pressed={active}
            className={`${TOGGLE_CLASS} ${active ? TOGGLE_STATE_ON_CLASS : TOOLBAR_BUTTON_IDLE_CLASS}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
