import * as THREE from 'three';
import {
  createGlobeScene,
  isWebGlAvailable,
  DEEP_ZOOM_DISTANCE_UNITS,
  attachResizeHandling,
} from '@/features/spatial/globe/scene/globeScene';
import { createMoonSurface } from '@/features/spatial/globe/scene/globeSurfaceMaterial';
import { createLaserTracksGroup } from '@/features/spatial/globe/scene/globeLaserTracks';
import { createGraticuleGroup, createPolarFootprintGroup } from '@/features/spatial/globe/scene/globeGraticule';
import { createSiteMarkers } from '@/features/spatial/globe/scene/globeSiteMarkers';
import {
  attachKeyboardOrbitControls,
  createCameraTransitioner,
  computeSiteCelestialTangents,
} from '@/features/spatial/globe/interaction/globeCameraPresets';
import { createMarkerPickingController } from '@/features/spatial/globe/interaction/globePicking';
import { createPolarTerrainFeatures } from '@/features/spatial/globe/scene/globePolarTerrain';
import { getSiteById, getAllAvailableSites } from '@/domain/sites/catalog';
import { CameraPreset, ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';
import { CustomLandingTarget } from '@/domain/target/customTargetModel';
import {
  raycastMoonSurface,
  clientToNormalizedDevicePoint,
  createCustomTargetBeaconController,
} from './globePinpoint';
import { updateSkylineOverlay, type SkylineOverlay } from './globeSkyline';
import type { HorizonProfileResponse } from '@luna/contracts';
import {
  GlobeDiagnosticsMetrics,
  GlobeSceneHandle,
  GlobeSceneBuildInput,
} from './globeSceneBuilderTypes';
import { createGlobeSceneAnimator } from './globeSceneAnimator';
import { attachWebGLContextLossHandlers } from './globeContextLossHandler';
import { disposeFullGlobeSceneGraph } from './globeSceneDisposal';
import { applyFillLightingState } from './globeScene';
import { createPoleMarker } from './globePoleMarker';
import { attachOrientationHud, type OrientationHudController } from './globeOrientationHud';
import { createPsrOverlay } from './globePsrOverlay';

export type { GlobeDiagnosticsMetrics, GlobeSceneHandle, GlobeSceneBuildInput };

/** Used if the container has not laid out yet; the ResizeObserver corrects it immediately. */
const FALLBACK_CONTAINER_WIDTH = 500;
const FALLBACK_CONTAINER_HEIGHT = 450;

/**
 * Builds the WebGL globe: renderer, displaced LROC surface, line overlays,
 * candidate markers, pointer picking, the render loop and the resize binding.
 * Returns a handle that owns its own disposal.
 */
export function buildGlobeScene(input: GlobeSceneBuildInput): GlobeSceneHandle | null {
  const { container } = input;
  if (!isWebGlAvailable()) return null;

  const globe = createGlobeScene(
    container.clientWidth || FALLBACK_CONTAINER_WIDTH,
    container.clientHeight || FALLBACK_CONTAINER_HEIGHT,
  );
  container.appendChild(globe.renderer.domElement);

  let isDisposed = false;
  const surface = createMoonSurface({
    onTextureSettled: () => {
      if (isDisposed) { surface.dispose(); return; }
      input.onSurfaceSettled();
    },
    onSurfaceUnavailable: (msg) => { if (!isDisposed) input.onSurfaceUnavailable(msg); },
  });

  const globeGroup = new THREE.Group();
  globeGroup.add(surface.mesh);
  globe.scene.add(globeGroup);

  const footprintGroup = createPolarFootprintGroup();
  globeGroup.add(footprintGroup);

  // Modeled PSR footprints (SP-7): hatched fill + draped rim boundary per isDeepPsr
  // crater; visibility rides the same `psr` overlay toggle as the 2D map.
  const psrOverlay = createPsrOverlay();
  globeGroup.add(psrOverlay.group);

  const polarTerrain = createPolarTerrainFeatures(input.initialSelectedSiteId);
  globeGroup.add(polarTerrain.group);

  const graticuleGroup = createGraticuleGroup();
  globeGroup.add(graticuleGroup);

  const vectorsGroup = new THREE.Group();
  globeGroup.add(vectorsGroup);

  const laserTracks = createLaserTracksGroup();
  globeGroup.add(laserTracks.group);

  const { markers, hitTargets } = createSiteMarkers(input.initialSelectedSiteId);
  markers.forEach((marker) => globeGroup.add(marker.container));

  // Geographic-pole marker (SP-2): distinct small cross + 90°S tag at (0, -R, 0).
  globeGroup.add(createPoleMarker());

  // Compass rose + scale bar (SP-3/SP-9): DOM overlay, imperatively updated per frame.
  const orientationHud: OrientationHudController = attachOrientationHud(container);

  const picking = createMarkerPickingController(container, globe.renderer.domElement, globe.camera, hitTargets, {
    onHoverEnter: (site) => {
      const marker = markers.get(site.id);
      if (marker && !marker.badge.visible) marker.badge.visible = true;
      input.onHoverChange(site);
    },
    onHoverExit: (siteId) => {
      const marker = markers.get(siteId);
      if (marker && !input.isSiteSelected(siteId)) marker.badge.visible = false;
      input.onHoverChange(null);
    },
    onHoverCursorChange: (isPointer) => { container.style.cursor = isPointer ? 'pointer' : 'grab'; },
    onPick: input.onPick,
  });
  picking.attach();

  // Backend epoch sub-points (task 3.3), read at move time by the transitioner resolver.
  const celestialRef: { current: ReturnType<typeof computeSiteCelestialTangents> | null } = { current: null };
  // Task 3.5: keyboard camera alternative; reduced motion snaps transitions instead of easing.
  const keyboardOrbit = attachKeyboardOrbitControls(container, globe.camera, globe.controls);
  const transitioner = createCameraTransitioner(celestialRef);
  let currentSelectedSiteId = input.initialSelectedSiteId;
  let currentCameraPreset: CameraPreset = 'nadir';
  let displayOptions = { showMarkers: true, showLabels: true, showTerrain: true };
  let layerVisibility = { showGrid: true, showShadowRegions: true };
  let isVectorsEnabled = true, isFlyoverEnabled = false;
  const initialCandidateSite = getSiteById(input.initialSelectedSiteId) ?? getAllAvailableSites()[0];

  // User manual drag/orbit immediately interrupts in-flight camera transitions and flyover
  const handleControlsStart = () => {
    transitioner.cancel();
    if (isFlyoverEnabled) {
      isFlyoverEnabled = false;
      input.onFlyoverInterrupted?.();
    }
  };
  globe.controls.addEventListener('start', handleControlsStart);

  const animator = createGlobeSceneAnimator({
    globe,
    container,
    polarTerrain,
    transitioner,
    markers,
    graticuleGroup,
    footprintGroup,
    vectorsGroup,
    getCurrentSelectedSiteId: () => currentSelectedSiteId,
    getCurrentCameraPreset: () => currentCameraPreset,
    getDisplayOptions: () => displayOptions, getLayerVisibility: () => layerVisibility,
    getIsVectorsEnabled: () => isVectorsEnabled, getIsFlyoverEnabled: () => isFlyoverEnabled,
    orientationHud,
    psrOverlayGroup: psrOverlay.group,
  });
  animator.start();

  const contextLossHandler = attachWebGLContextLossHandlers(globe.renderer.domElement, {
    animator,
    onContextLost: input.onContextLost,
    onContextRestored: () => input.onContextRestored?.(),
  });

  const resizeObserver = attachResizeHandling(container, globe);

  const customTargetBeacon = createCustomTargetBeaconController();
  let skylineOverlay: SkylineOverlay | null = null;

  const currentOrFirstSite = () => getSiteById(currentSelectedSiteId) ?? getAllAvailableSites()[0];
  /** Overlays yield at deep zoom (task 2.7); shared predicate for every overlay group. */
  const overlayVisible = (v: boolean) => v && globe.camera.position.distanceTo(globe.controls.target) >= DEEP_ZOOM_DISTANCE_UNITS;

  return {
    globe,
    surfaceMesh: surface.mesh,
    graticuleGroup,
    footprintGroup,
    vectorsGroup,
    markers,
    transitioner,
    setCustomTarget: (target: CustomLandingTarget | null) => {
      customTargetBeacon.setTarget(target);
    },
    raycastMoonSurface: (clientX: number, clientY: number) => {
      const mouse = clientToNormalizedDevicePoint(container.getBoundingClientRect(), clientX, clientY);
      if (!mouse) return null;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, globe.camera);
      return raycastMoonSurface(raycaster, surface.mesh);
    },
    setSelectedSiteId: (id: string) => {
      currentSelectedSiteId = id;
      polarTerrain.updateSelectedSite(id);
    },
    setScientificMode: (mode: ScientificMapLayerMode) => {
      polarTerrain.setScientificMode(mode);
      surface.setScientificMode(mode);
    },
    setCameraPreset: (preset: CameraPreset) => {
      currentCameraPreset = preset;
      transitioner.moveTo(preset, currentOrFirstSite());
    },
    setDisplayOptions: (opts: { showMarkers?: boolean; showLabels?: boolean; showTerrain?: boolean }) => {
      displayOptions = { ...displayOptions, ...opts };
      if (opts.showTerrain !== undefined) {
        surface.mesh.visible = opts.showTerrain;
        polarTerrain.group.visible = opts.showTerrain;
      }
    },
    setLayerVisibility: (showGrid: boolean, showShadowRegions: boolean) => {
      layerVisibility = { showGrid, showShadowRegions };
      graticuleGroup.visible = overlayVisible(showGrid);
      footprintGroup.visible = overlayVisible(showShadowRegions);
    },
    setVectorsVisibility: (showVectors: boolean) => {
      isVectorsEnabled = showVectors;
      vectorsGroup.visible = overlayVisible(showVectors);
    },
    setLaserTracksVisible: (visible: boolean) => { laserTracks.setVisible(visible); },
    setFillLightingEnabled: (enabled: boolean) => {
      if (globe.ambientLight && globe.earthLight) {
        applyFillLightingState({ ambientLight: globe.ambientLight, earthLight: globe.earthLight, bloom: globe.bloomPass ?? { strength: 0 } }, enabled);
      }
    },
    setCelestialDirections: (epoch) => {
      celestialRef.current = computeSiteCelestialTangents(currentOrFirstSite(), epoch);
    },
    setHorizonProfile: (profile: HorizonProfileResponse | null) => {
      skylineOverlay = updateSkylineOverlay(globe.scene, skylineOverlay, currentOrFirstSite(), profile, celestialRef.current ?? undefined);
    },
    setFlyover: (active?: boolean) => { isFlyoverEnabled = active !== undefined ? active : !isFlyoverEnabled; },
    isFlyoverActive: () => isFlyoverEnabled,
    getDiagnostics: () => animator.getDiagnostics(),
    restoreContext: () => contextLossHandler.restoreContext(),
    getRecoveryState: () => contextLossHandler.getRecoveryState(),
    dispose: () => {
      isDisposed = true;
      animator.stop();
      orientationHud.dispose();
      psrOverlay.dispose();
      skylineOverlay?.dispose(globe.scene);
      keyboardOrbit.dispose();
      contextLossHandler.detach();
      resizeObserver.disconnect();
      picking.detach();
      globe.controls.removeEventListener('start', handleControlsStart);
      if (container.contains(globe.renderer.domElement)) {
        container.removeChild(globe.renderer.domElement);
      }
      globe.controls.dispose();
      globe.renderer.dispose();
      if (globe.starfield) {
        globe.starfield.geometry.dispose();
        (globe.starfield.material as THREE.Material).dispose();
      }
      customTargetBeacon.dispose(globe.scene);
      disposeFullGlobeSceneGraph({
        scene: globe.scene,
        markers,
        graticuleGroup,
        footprintGroup,
        vectorsGroup,
        customBeacon: null,
        surface,
        polarTerrain,
        laserTracks,
        sunLight: globe.sunLight,
        composer: globe.composer,
      });
    },
  };
}
