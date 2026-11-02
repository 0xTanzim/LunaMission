import { useCallback, useMemo, useReducer } from 'react';
import {
  CameraPreset,
  DEFAULT_SPATIAL_PREFERENCES,
  SpatialLayer,
  SpatialPreferences,
  spatialPreferencesReducer,
} from '@/features/spatial/model/spatialPreferences';
import type { LayerBlendMode, MapBaseLayerId } from '@/features/spatial/model/mapLayerStack';

export interface SpatialPreferenceControls {
  preferences: SpatialPreferences;
  toggleLayer: (layer: SpatialLayer) => void;
  setLayerOpacity: (layer: SpatialLayer, opacity: number) => void;
  setLayerBlendMode: (layer: SpatialLayer, blendMode: LayerBlendMode) => void;
  selectCameraPreset: (preset: CameraPreset) => void;
  selectScientificMapMode: (mode: MapBaseLayerId) => void;
  setIntelDrawerWidthPx: (widthPx: number) => void;
  toggleDisplayFillLighting: () => void;
}

/**
 * Single owner of the workspace display preferences. Both the toolbar and the
 * per-view overlays read and write through this one instance, so toggling a
 * layer in dual view changes both panels at once.
 */
export function useSpatialPreferences(): SpatialPreferenceControls {
  const [preferences, dispatch] = useReducer(spatialPreferencesReducer, DEFAULT_SPATIAL_PREFERENCES);

  const toggleLayer = useCallback(
    (layer: SpatialLayer) => dispatch({ type: 'layer/toggled', layer }),
    [dispatch],
  );
  const setLayerOpacity = useCallback(
    (layer: SpatialLayer, opacity: number) => dispatch({ type: 'layer/opacity-changed', layer, opacity }),
    [dispatch],
  );
  const setLayerBlendMode = useCallback(
    (layer: SpatialLayer, blendMode: LayerBlendMode) => dispatch({ type: 'layer/blend-changed', layer, blendMode }),
    [dispatch],
  );
  const selectCameraPreset = useCallback(
    (preset: CameraPreset) => dispatch({ type: 'cameraPreset/selected', preset }),
    [dispatch],
  );
  const setIntelDrawerWidthPx = useCallback(
    (widthPx: number) => dispatch({ type: 'intelDrawer/width-changed', widthPx }),
    [dispatch],
  );
  const toggleDisplayFillLighting = useCallback(
    () => dispatch({ type: 'displayFillLighting/toggled' }),
    [dispatch],
  );
  const selectScientificMapMode = useCallback(
    (mode: MapBaseLayerId) => dispatch({ type: 'scientificMapMode/selected', mode }),
    [dispatch],
  );

  return useMemo(
    () => ({
      preferences,
      toggleLayer,
      setLayerOpacity,
      setLayerBlendMode,
      selectCameraPreset,
      selectScientificMapMode,
      setIntelDrawerWidthPx,
      toggleDisplayFillLighting,
    }),
    [preferences, toggleLayer, setLayerOpacity, setLayerBlendMode, selectCameraPreset, selectScientificMapMode, setIntelDrawerWidthPx, toggleDisplayFillLighting],
  );
}
