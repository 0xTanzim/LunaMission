import { useCallback, useEffect, useRef } from 'react';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import { useGlobeSceneSync } from '@/features/spatial/globe/hooks/useGlobeSceneSync';
import { useGlobePinpointClick } from '@/features/spatial/globe/hooks/useGlobePinpointClick';
import { useGlobeSceneMount } from '@/features/spatial/globe/hooks/useGlobeSceneMount';
import {
  UseGlobeSceneInput,
  UseGlobeSceneResult,
} from '@/features/spatial/globe/hooks/globeSceneTypes';

export type { UseGlobeSceneInput, UseGlobeSceneResult };

/**
 * Owns the WebGL globe's lifetime: it builds the scene once against the mount
 * container, exposes the loading and hover state the layout renders, and
 * disposes GPU resources on unmount. No markup here.
 *
 * The scene outlives every render, so the values its event handlers need are
 * read through refs rather than captured when it was built.
 */
export function useGlobeScene(input: UseGlobeSceneInput): UseGlobeSceneResult {
  const {
    selectedSite,
    onSelectSite,
    subSolarLatDeg,
    subSolarLonDeg,
    subEarthLatDeg,
    subEarthLonDeg,
    earthElevationDeg,
    showGrid,
    showShadowRegions,
    showVectors,
    showTerrain,
    showMarkers,
    showLabels,
    showLaserTracks,
    cameraPreset,
    onCameraPresetChange,
    isFlyoverActive,
    onFlyoverChange,
  } = input;

  const containerRef = useRef<HTMLDivElement>(null);
  const selectedSiteIdRef = useRef(selectedSite.id);
  const pickSiteRef = useRef<(site: CandidateSite) => void>(() => {});
  const handledPresetRef = useRef<CameraPreset>(cameraPreset);
  const onFlyoverChangeRef = useRef(onFlyoverChange);
  onFlyoverChangeRef.current = onFlyoverChange;

  const { handleRef, status, hoveredSite, restoreContext } = useGlobeSceneMount({
    containerRef,
    selectedSiteIdRef,
    pickSiteRef,
    onFlyoverChangeRef,
    isVisible: input.isVisible ?? true,
  });

  const moveCameraToPreset = useCallback((preset: CameraPreset, site: CandidateSite) => {
    if (handleRef.current?.setCameraPreset) {
      handleRef.current.setCameraPreset(preset);
    } else {
      handleRef.current?.transitioner.moveTo(preset, site);
    }
  }, [handleRef]);

  const applyCameraPreset = useCallback(
    (preset: CameraPreset, site: CandidateSite) => {
      handledPresetRef.current = preset;
      onCameraPresetChange(preset);
      moveCameraToPreset(preset, site);
    },
    [onCameraPresetChange, moveCameraToPreset],
  );

  useEffect(() => {
    if (isFlyoverActive !== undefined) {
      handleRef.current?.setFlyover?.(isFlyoverActive);
    }
  }, [isFlyoverActive, handleRef]);

  useEffect(() => {
    pickSiteRef.current = (site) => {
      onSelectSite(site);
      const isLocal =
        cameraPreset === 'site' ||
        cameraPreset === 'inspection' ||
        cameraPreset === 'oblique' ||
        cameraPreset === 'overhead' ||
        cameraPreset === 'horizon';
      if (isLocal) {
        applyCameraPreset(cameraPreset, site);
      }
    };
  }, [onSelectSite, cameraPreset, applyCameraPreset]);

  useEffect(() => {
    if (handledPresetRef.current === cameraPreset) return;
    handledPresetRef.current = cameraPreset;
    moveCameraToPreset(cameraPreset, selectedSite);
  }, [cameraPreset, moveCameraToPreset, selectedSite]);

  useGlobeSceneSync({
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
    showLaserTracks,
    displayFillLighting: input.displayFillLighting,
    horizonProfile: input.horizonProfile,
    cameraPreset,
    applyCameraPreset,
    scientificMapMode: input.scientificMapMode,
    customTarget: input.customTarget,
  });

  useGlobePinpointClick(
    containerRef,
    handleRef,
    input.isPinpointMode,
    input.onPinpointCustomTarget,
  );

  const getDiagnostics = useCallback(() => {
    return handleRef.current?.getDiagnostics?.() ?? null;
  }, [handleRef]);

  return { containerRef, status, hoveredSite, applyCameraPreset, getDiagnostics, restoreContext };
}
