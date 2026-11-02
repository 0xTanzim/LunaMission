import React from 'react';
import {
  isLayerVisible,
  ScientificMapLayerMode,
  SpatialLayer,
  SpatialPreferences,
} from '@/features/spatial/model/spatialPreferences';
import {
  LAYER_BUTTONS,
  TOGGLE_STATE_ON_CLASS,
  TOOLBAR_BUTTON_IDLE_CLASS,
  TOOLBAR_GROUP_CLASS,
  type LayerToggleButton,
} from '@/features/spatial/config/spatialToolbarOptions';

export interface SpatialLayersGroupProps {
  preferences: SpatialPreferences;
  onToggleLayer: (layer: SpatialLayer) => void;
  showTerrain?: boolean;
  onToggleTerrain?: () => void;
  onSelectScientificMapMode?: (mode: ScientificMapLayerMode) => void;
}

/** Crater rims lead the row; the remaining display layers keep their authored order. */
const CRATERS: LayerToggleButton = {
  layer: 'craters',
  label: 'Craters',
  title: 'Toggle Lunar Crater Rim Loops and Morphology Features',
  ariaLabel: 'Toggle crater rim loops',
};

const DISPLAY_LAYER_BUTTONS: LayerToggleButton[] = [
  CRATERS,
  ...LAYER_BUTTONS.filter((button) => button.layer !== 'vectors'),
];

const TOGGLE_CLASS =
  'px-2 py-1 text-xs rounded-[var(--lm-radius-xs)] font-medium transition-colors min-h-[28px] min-w-[28px] cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lm-color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--lm-color-canvas)]';

/**
 * Group 2: Display Layers
 * LOLA base terrain relief, crater rim loops, coordinate graticule, the 83°S polar
 * footprint with permanently shadowed regions, and LOLA laser altimeter tracks.
 *
 * Every button uses the shared toggle vocabulary — outline when off, fill when on —
 * so the row no longer reads as four different kinds of state. The row wraps instead
 * of pushing the workspace wider than a phone screen.
 */
export function SpatialLayersGroup({
  preferences,
  onToggleLayer,
  showTerrain = true,
  onToggleTerrain,
}: SpatialLayersGroupProps) {
  return (
    <div
      data-group="display-layers"
      data-slot="display-layers"
      role="region"
      aria-label="Display Layers"
      className="flex min-w-0 max-w-full items-center gap-1 lg:shrink-0"
    >
      <div
        data-slot="layer-toggles"
        className={`${TOOLBAR_GROUP_CLASS} flex-wrap lg:flex-nowrap`}
        role="group"
        aria-label="Display Layer Toggles"
      >
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

        {DISPLAY_LAYER_BUTTONS.map(({ layer, label, title, ariaLabel }) => {
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
    </div>
  );
}
