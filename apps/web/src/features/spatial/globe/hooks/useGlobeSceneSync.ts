import { useEffect } from 'react';
import {
  applyCelestialEpoch,
  applyLayerVisibility,
  applySelectedSite,
} from '@/features/spatial/globe/scene/globeSceneInputs';
import { GlobeSceneSyncInput } from './globeSceneSyncTypes';
export type { GlobeSceneSyncInput };


/**
 * Pushes scenario and preference values into a scene built once. Each effect is
 * scoped to the concept it moves: changing the epoch never touches markers, and
 * changing the selection never rebuilds the vector layer.
 */
export function useGlobeSceneSync(input: GlobeSceneSyncInput): void {
  const {
    handleRef,
    selectedSiteIdRef,
    selectedSite,
    subSolarLatDeg,
    subSolarLonDeg,
    subEarthLatDeg,
    subEarthLonDeg,
    earthElevationDeg,
    showVectors,
    showGrid,
    showShadowRegions,
    showTerrain,
    showMarkers,
    showLabels,
    cameraPreset,
    applyCameraPreset,
  } = input;

  // Sun and earthshine direction and the vector layer follow the canonical epoch.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    applyCelestialEpoch(handle, {
      site: selectedSite,
      subSolarLatDeg,
      subSolarLonDeg,
      subEarthLatDeg,
      subEarthLonDeg,
      earthElevationDeg,
      showVectors,
    });
    // Celestial-oriented camera poses read the same backend epoch vectors (task 3.3).
    handle.setCelestialDirections?.({
      subSolarLatDeg,
      subSolarLonDeg,
      subEarthLatDeg,
      subEarthLonDeg,
    });
  }, [
    handleRef,
    selectedSite,
    subSolarLatDeg,
    subSolarLonDeg,
    subEarthLatDeg,
    subEarthLonDeg,
    earthElevationDeg,
    showVectors,
  ]);

  // Marker highlighting tracks the selection, not the epoch.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    selectedSiteIdRef.current = selectedSite.id;
    applySelectedSite(handle, selectedSite.id);

    // While in any local inspection preset, smoothly animate camera to the newly selected candidate
    const isLocal =
      cameraPreset === 'site' ||
      cameraPreset === 'inspection' ||
      cameraPreset === 'oblique' ||
      cameraPreset === 'overhead' ||
      cameraPreset === 'horizon';
    if (isLocal) {
      applyCameraPreset(cameraPreset, selectedSite);
    }
  }, [handleRef, selectedSiteIdRef, selectedSite, cameraPreset, applyCameraPreset]);

  // Layer visibility is a preference, so groups are switched rather than rebuilt.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    applyLayerVisibility(handle, showGrid, showShadowRegions);
  }, [handleRef, showGrid, showShadowRegions]);

  // Surface, markers, and labels display options
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    handle.setDisplayOptions?.({ showTerrain, showMarkers, showLabels });
  }, [handleRef, showTerrain, showMarkers, showLabels]);

  // Display fill lighting (ambient + earthshine + bloom) is one honest toggle (task 3.3).
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    handle.setFillLightingEnabled?.(input.displayFillLighting ?? true);
  }, [handleRef, input.displayFillLighting]);

  // Task 4.4: the skyline silhouette tracks the backend curated horizon profile.
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    handle.setHorizonProfile?.(input.horizonProfile ?? null);
  }, [handleRef, input.horizonProfile]);

  // Scientific map raster products (Topography, Hillshade, Slope, Geology, Illumination)
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle || !input.scientificMapMode) return;
    handle.setScientificMode?.(input.scientificMapMode);
  }, [handleRef, input.scientificMapMode]);

  // NASA SVS 3633 LOLA Laser Altimeter Ground Tracks
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    handle.setLaserTracksVisible?.(input.showLaserTracks ?? true);
  }, [handleRef, input.showLaserTracks]);

  // Camera preset notifications
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    handle.setCameraPreset?.(cameraPreset);
  }, [handleRef, cameraPreset]);

  // Custom target beacon notifications
  useEffect(() => {
    handleRef.current?.setCustomTarget?.(input.customTarget ?? null);
  }, [handleRef, input.customTarget]);
}
