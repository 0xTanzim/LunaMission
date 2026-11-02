/**
 * Spatial workspace display preferences: how the map and globe are drawn, as
 * opposed to what site and instant they are drawing.
 *
 * These values are shared because one toolbar controls both visualizations at
 * once, so exactly one owner holds them. The 2D map's permanently shadowed
 * region overlay and the 3D globe's polar footprint are the same concept seen
 * in two projections, so they share the `psr` overlay instead of carrying two names.
 *
 * The stack itself — one base layer plus independently composited overlays, per-layer
 * opacity and blend mode, compatibility rules and paint order — lives in
 * `./mapLayerStack`. This module owns only the state and its transitions.
 */

import {
  BaseLayerState,
  DEFAULT_BASE_LAYER,
  DEFAULT_OVERLAY_LAYERS,
  LayerBlendMode,
  LayerRenderState,
  MapBaseLayerId,
  MapOverlayId,
  OverlayLayerState,
} from './mapLayerStack';

export type { ScientificMapLayerMode } from './mapLayerStack';

export type CameraPreset =
  | 'nadir'
  | 'site'
  | 'horizon'
  | 'eva'
  | 'earth_align'
  | 'orbit360'
  | 'north_look'
  | 'sunward_terminator'
  // Backward-compatible aliases
  | 'global'
  | 'oblique'
  | 'overhead'
  | 'inspection';

/** Every toggleable overlay. The base layer is not in this union: it is always present. */
export type SpatialLayer = MapOverlayId;

export interface SpatialPreferences {
  cameraPreset: CameraPreset;
  /** Exactly one base layer, always present. */
  base: BaseLayerState;
  /** Overlays, each visible/opacity/blendMode independent of the others. */
  overlays: OverlayLayerState;
  /** Intelligence drawer width in CSS px, clamped to INTEL_DRAWER_MIN/MAX (task 3.1). */
  intelDrawerWidthPx: number;
  /**
   * Display fill lighting (ambient + earthshine + bloom) — a screen-readability aid,
   * default ON, never lunar physics (task 3.3).
   */
  displayFillLighting: boolean;
}

export type SpatialPreferenceAction =
  | { type: 'layer/toggled'; layer: SpatialLayer }
  | { type: 'layer/opacity-changed'; layer: SpatialLayer; opacity: number }
  | { type: 'layer/blend-changed'; layer: SpatialLayer; blendMode: LayerBlendMode }
  | { type: 'cameraPreset/selected'; preset: CameraPreset }
  | { type: 'scientificMapMode/selected'; mode: MapBaseLayerId }
  | { type: 'base/opacity-changed'; opacity: number }
  | { type: 'base/blend-changed'; blendMode: LayerBlendMode }
  | { type: 'intelDrawer/width-changed'; widthPx: number }
  | { type: 'displayFillLighting/toggled' };

/** Intelligence drawer width bounds (task 3.1). */
export const INTEL_DRAWER_MIN_WIDTH_PX = 320;
export const INTEL_DRAWER_MAX_WIDTH_PX = 560;
export const INTEL_DRAWER_DEFAULT_WIDTH_PX = 440;

export function clampIntelDrawerWidth(widthPx: number): number {
  if (!Number.isFinite(widthPx)) return INTEL_DRAWER_DEFAULT_WIDTH_PX;
  return Math.min(
    INTEL_DRAWER_MAX_WIDTH_PX,
    Math.max(INTEL_DRAWER_MIN_WIDTH_PX, Math.round(widthPx)),
  );
}

/** Opening state: geography and vectors on, nadir camera aligned with the 2D map, natural base active. */
export const DEFAULT_SPATIAL_PREFERENCES: SpatialPreferences = {
  cameraPreset: 'nadir',
  base: DEFAULT_BASE_LAYER,
  overlays: DEFAULT_OVERLAY_LAYERS,
  intelDrawerWidthPx: INTEL_DRAWER_DEFAULT_WIDTH_PX,
  displayFillLighting: true,
};

function clampOpacity(opacity: number): number {
  if (!Number.isFinite(opacity)) return 1;
  return Math.min(1, Math.max(0, opacity));
}

function withOverlay(
  state: SpatialPreferences,
  layer: SpatialLayer,
  update: (layerState: LayerRenderState) => LayerRenderState,
): SpatialPreferences {
  const current = state.overlays[layer];
  // An unknown id (e.g. a base-layer name reaching an overlay action) is a no-op rather than a
  // crash: the base layer is not an overlay and must never be toggled away.
  if (current === undefined) return state;
  const next = update(current);
  if (next === current) return state;
  return { ...state, overlays: { ...state.overlays, [layer]: next } };
}

export function isLayerVisible(preferences: SpatialPreferences, layer: SpatialLayer): boolean {
  return preferences.overlays[layer]?.visible ?? false;
}

/**
 * Sets several overlay visibilities at once, leaving every unspecified overlay as it was.
 *
 * Used where one user intent flips more than one toggle — a camera preset that reveals the
 * vectors and graticule, or a test that pins a whole stack. Unknown ids are ignored, so a
 * base-layer name can never be smuggled in as an overlay.
 */
export function withOverlayVisibility(
  preferences: SpatialPreferences,
  visibility: Partial<Record<SpatialLayer, boolean>>,
): SpatialPreferences {
  let overlays = preferences.overlays;
  let changed = false;
  for (const [layer, visible] of Object.entries(visibility) as [SpatialLayer, boolean | undefined][]) {
    const current = overlays[layer];
    if (current === undefined || visible === undefined || current.visible === visible) continue;
    if (!changed) {
      overlays = { ...overlays };
      changed = true;
    }
    overlays[layer] = { ...current, visible };
  }
  return changed ? { ...preferences, overlays } : preferences;
}

export function layerRenderState(preferences: SpatialPreferences, layer: SpatialLayer): LayerRenderState {
  return preferences.overlays[layer];
}

export function spatialPreferencesReducer(
  state: SpatialPreferences,
  action: SpatialPreferenceAction
): SpatialPreferences {
  switch (action.type) {
    case 'layer/toggled':
      return withOverlay(state, action.layer, (layer) => ({ ...layer, visible: !layer.visible }));
    case 'layer/opacity-changed': {
      const opacity = clampOpacity(action.opacity);
      return withOverlay(state, action.layer, (layer) =>
        layer.opacity === opacity ? layer : { ...layer, opacity },
      );
    }
    case 'layer/blend-changed':
      return withOverlay(state, action.layer, (layer) =>
        layer.blendMode === action.blendMode ? layer : { ...layer, blendMode: action.blendMode },
      );
    case 'cameraPreset/selected':
      return state.cameraPreset === action.preset ? state : { ...state, cameraPreset: action.preset };
    case 'scientificMapMode/selected':
      return state.base.id === action.mode ? state : { ...state, base: { ...state.base, id: action.mode } };
    case 'base/opacity-changed': {
      const opacity = clampOpacity(action.opacity);
      return state.base.opacity === opacity ? state : { ...state, base: { ...state.base, opacity } };
    }
    case 'base/blend-changed':
      return state.base.blendMode === action.blendMode
        ? state
        : { ...state, base: { ...state.base, blendMode: action.blendMode } };
    case 'intelDrawer/width-changed':
      return { ...state, intelDrawerWidthPx: clampIntelDrawerWidth(action.widthPx) };
    case 'displayFillLighting/toggled':
      return { ...state, displayFillLighting: !state.displayFillLighting };
    default:
      return state;
  }
}
