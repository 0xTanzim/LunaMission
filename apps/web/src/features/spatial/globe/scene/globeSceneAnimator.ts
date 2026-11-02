import * as THREE from 'three';
import { MOON_SCENE_RADIUS, DEEP_ZOOM_DISTANCE_UNITS, GlobeScene, isSoftwareGl } from '@/features/spatial/globe/scene/globeScene';
import { getPrefersReducedMotion } from '@/features/accessibility/ui';
import { getZoomTier, getTierLabelDensity } from '@/features/spatial/globe/scene/globeZoomTiers';
import { SiteMarker, applyMarkerHorizonOcclusion } from '@/features/spatial/globe/scene/globeSiteMarkers';
import { LabelDeclutterManager, projectLabelRect } from '@/features/spatial/globe/scene/globeLabelDeclutter';
import type { OrientationHudController } from '@/features/spatial/globe/scene/globeOrientationHud';
import { CameraTransitioner } from '@/features/spatial/globe/interaction/globeCameraPresets';
import { createPolarTerrainFeatures } from '@/features/spatial/globe/scene/globePolarTerrain';
import { calculate3DOrbitSensitivity } from '@/features/spatial/interaction/zoomAwareInteractionModel';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import { GlobeDiagnosticsMetrics } from './globeSceneBuilderTypes';

const FALLBACK_CONTAINER_HEIGHT = 450;

export interface GlobeAnimatorContext {
  globe: GlobeScene;
  container: HTMLDivElement;
  polarTerrain: ReturnType<typeof createPolarTerrainFeatures>;
  transitioner: CameraTransitioner;
  markers: Map<string, SiteMarker>;
  graticuleGroup: THREE.Group;
  footprintGroup: THREE.Group;
  /** Modeled PSR hatch + boundary group (SP-7); rides the `psr` overlay toggle. */
  psrOverlayGroup?: THREE.Group;
  vectorsGroup: THREE.Group;
  getCurrentSelectedSiteId: () => string;
  getCurrentCameraPreset: () => CameraPreset;
  getDisplayOptions: () => { showMarkers: boolean; showLabels: boolean; showTerrain: boolean };
  getLayerVisibility: () => { showGrid: boolean; showShadowRegions: boolean };
  getIsVectorsEnabled: () => boolean;
  getIsFlyoverEnabled: () => boolean;
  /** Compass + scale bar DOM controller (SP-3/SP-9); updated once per frame. */
  orientationHud?: OrientationHudController;
}

export function clampCameraAltitudeAntiPenetration(
  cameraPosition: THREE.Vector3,
  getSurfaceElevationAt: (latDeg: number, lonDeg: number) => number,
): number {
  const camDist = cameraPosition.length();
  let minSafeRadius = MOON_SCENE_RADIUS + 0.0035;
  if (camDist > 0.01) {
    const phi = Math.acos(Math.max(-1, Math.min(1, cameraPosition.y / camDist)));
    const camLatDeg = 90 - (phi * 180) / Math.PI;
    let camLonDeg = (Math.atan2(cameraPosition.x, cameraPosition.z) * 180) / Math.PI;
    if (camLonDeg < 0) camLonDeg += 360;

    const elevM = getSurfaceElevationAt(camLatDeg, camLonDeg);
    minSafeRadius = MOON_SCENE_RADIUS + (elevM / 1000.0) * (MOON_SCENE_RADIUS / 1737.4) + 0.0035;
    if (camDist < minSafeRadius) cameraPosition.setLength(minSafeRadius);
  }
  return minSafeRadius;
}

export function createGlobeSceneAnimator(ctx: GlobeAnimatorContext) {
  const labelDeclutterManager = new LabelDeclutterManager();
  const {
    globe, container, polarTerrain, transitioner, markers,
    graticuleGroup, footprintGroup, psrOverlayGroup, vectorsGroup, getCurrentSelectedSiteId,
    getCurrentCameraPreset, getDisplayOptions, getLayerVisibility,
    getIsVectorsEnabled, getIsFlyoverEnabled,
  } = ctx;

  const occlusionScratch = new THREE.Vector3();
  const flyoverAxis = new THREE.Vector3();
  let animationId = 0, timerId: number | null = null;
  const frameTimes: number[] = [];
  let lastFrameTimestamp = performance.now(), lastStatsUpdate = performance.now();
  let flyoverAccumDeg = 0; // task 5.3: accumulated auto-orbit angle for progress feedback

  let cachedMetrics: GlobeDiagnosticsMetrics = {
    fps: 60, frameTimeMs: 16.6, frameTimeP95Ms: 16.6, drawCalls: 0, triangles: 0,
    cameraDistance: 4.8, cameraTargetDistance: 0, cameraNear: 0.05,
    pixelRatio: globe.renderer.getPixelRatio(), isSoftwareGl,
  };

  function afterDraw(cb: () => void) {
    const gl = globe.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      timerId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (sync && gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.UNSIGNALED) {
        timerId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        timerId = window.setTimeout(cb, 80);
      }
    };
    timerId = window.setTimeout(poll, 5);
  }

  const animate = () => {
    const now = performance.now();
    const dt = now - lastFrameTimestamp;
    lastFrameTimestamp = now;
    if (dt > 0 && dt < 200) {
      frameTimes.push(dt);
      if (frameTimes.length > 60) frameTimes.shift();
    }

    if (now - lastStatsUpdate > 250 && frameTimes.length > 0) {
      lastStatsUpdate = now;
      const sorted = [...frameTimes].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length * 0.5)];
      const avgDt = frameTimes.reduce((sum, v) => sum + v, 0) / frameTimes.length;
      cachedMetrics = {
        fps: Math.round(1000 / (avgDt || 16.6)), frameTimeMs: Math.round(median * 10) / 10,
        frameTimeP95Ms: Math.round((sorted[Math.floor(sorted.length * 0.95)] ?? median) * 10) / 10,
        drawCalls: globe.renderer.info.render.calls, triangles: globe.renderer.info.render.triangles,
        cameraDistance: Math.round(globe.camera.position.length() * 100) / 100,
        cameraTargetDistance: Math.round(globe.camera.position.distanceTo(globe.controls.target) * 100) / 100,
        cameraNear: globe.camera.near, pixelRatio: globe.renderer.getPixelRatio(), isSoftwareGl,
        terrainLod: polarTerrain.getTerrainDiagnostics().currentLOD,
        terrainDemSource: polarTerrain.getTerrainDiagnostics().sourceDem,
        terrainEffectiveResolution: polarTerrain.getTerrainDiagnostics().effectiveResolution,
        orbitRotateSpeed: Math.round(globe.controls.rotateSpeed * 1000) / 1000,
        orbitDamping: Math.round(globe.controls.dampingFactor * 1000) / 1000,
        flyoverOrbitDeg: getIsFlyoverEnabled() && !getPrefersReducedMotion() ? Math.round(flyoverAccumDeg) : undefined,
      };
    }

    const currentSelectedSiteId = getCurrentSelectedSiteId();
    const currentCameraPreset = getCurrentCameraPreset();
    const displayOptions = getDisplayOptions(), layerVisibility = getLayerVisibility(), isVectorsEnabled = getIsVectorsEnabled();

    transitioner.step(globe.camera, globe.controls);

    if (getIsFlyoverEnabled() && !transitioner.isTransitioning() && !getPrefersReducedMotion()) {
      flyoverAxis.copy(globe.camera.up).normalize();
      if (flyoverAxis.lengthSq() < 0.1) flyoverAxis.set(0, 1, 0);
      const offset = globe.camera.position.clone().sub(globe.controls.target).applyAxisAngle(flyoverAxis, 0.0035);
      globe.camera.position.copy(globe.controls.target).add(offset);
      globe.controls.update();
      flyoverAccumDeg = (flyoverAccumDeg + THREE.MathUtils.radToDeg(0.0035)) % 360;
    }

    const minSafeRadius = clampCameraAltitudeAntiPenetration(
      globe.camera.position,
      (lat, lon) => polarTerrain.multiLodTerrain.getSurfaceElevationAt(lat, lon),
    );

    // Surface target constraint: prevent lookTarget interior penetration
    const isMoonCentricPreset = currentCameraPreset === 'nadir' || currentCameraPreset === 'global' || currentCameraPreset === 'oblique';
    const targetLen = globe.controls.target.length();
    if (!isMoonCentricPreset && !transitioner.isTransitioning() && targetLen < MOON_SCENE_RADIUS - 0.05) {
      globe.controls.target.setLength(MOON_SCENE_RADIUS);
    }

    const isMoonCentric = isMoonCentricPreset && targetLen < 0.6;
    const rawDistToTarget = globe.camera.position.distanceTo(globe.controls.target);
    const surfaceAltitude = Math.max(0.015, globe.camera.position.length() - minSafeRadius);
    const distToTarget = isMoonCentric ? surfaceAltitude : rawDistToTarget;

    const minOrbitDist = isMoonCentric ? minSafeRadius + 0.005 : 0.015;
    if (Math.abs(globe.controls.minDistance - minOrbitDist) > 0.001) {
      globe.controls.minDistance = minOrbitDist;
    }

    polarTerrain.updateLOD(distToTarget);

    const sensitivity = calculate3DOrbitSensitivity(distToTarget, container.clientHeight || FALLBACK_CONTAINER_HEIGHT);
    globe.controls.rotateSpeed = sensitivity.rotateSpeed;
    globe.controls.panSpeed = sensitivity.panSpeed;
    globe.controls.dampingFactor = sensitivity.dampingFactor;
    if (typeof (globe.controls as any).zoomSpeed === 'number') {
      (globe.controls as any).zoomSpeed = sensitivity.zoomSpeed;
    }

    const isDeepZoom = distToTarget < DEEP_ZOOM_DISTANCE_UNITS;
    graticuleGroup.visible = !isDeepZoom && layerVisibility.showGrid;
    footprintGroup.visible = !isDeepZoom && layerVisibility.showShadowRegions;
    if (psrOverlayGroup) psrOverlayGroup.visible = !isDeepZoom && layerVisibility.showShadowRegions;

    const isLocalPreset = ['overhead', 'horizon', 'inspection', 'site'].includes(currentCameraPreset);
    vectorsGroup.visible = !isDeepZoom && !isLocalPreset && isVectorsEnabled;
    polarTerrain.setCraterOutlinesVisible(!isDeepZoom && !isLocalPreset);

    const targetNear = distToTarget < 0.25 ? 0.002 : distToTarget < 0.8 ? 0.01 : 0.05;
    if (Math.abs(globe.camera.near - targetNear) > 0.0005) {
      globe.camera.near = targetNear;
      globe.camera.updateProjectionMatrix();
    }

    const activeBadgePositions = applyMarkerHorizonOcclusion(
      markers, globe.camera.position, globe.controls.target, currentSelectedSiteId, occlusionScratch, displayOptions,
    );

    // Screen-space label declutter: project visible site badges and let the shared manager
    // resolve overlaps against crater nomenclature (persistent instance => hysteresis).
    const viewportWidth = globe.renderer.domElement.clientWidth || 1;
    const viewportHeight = globe.renderer.domElement.clientHeight || 1;
    const badgeScreenRects = activeBadgePositions.map((pos) =>
      projectLabelRect(pos, globe.camera, viewportWidth, viewportHeight),
    );
    polarTerrain.updateCraterLabelsDeclutter({
      camera: globe.camera,
      viewportWidth,
      viewportHeight,
      distToTarget,
      showLabels: displayOptions?.showLabels,
      badgeScreenRects,
      manager: labelDeclutterManager,
      // Task 5.3: during the 360° auto-orbit the swinging camera churns the nomenclature
      // declutter — park crater labels and keep only the site badges.
      maxCraterLabels: currentCameraPreset === 'orbit360'
        ? 0
        : getTierLabelDensity(getZoomTier(distToTarget)).maxCraterLabels,
    });

    if (!transitioner.isTransitioning()) globe.controls.update();

    ctx.orientationHud?.update(globe.camera, globe.controls.target, viewportHeight);

    if (globe.composer) globe.composer.render();
    else globe.renderer.render(globe.scene, globe.camera);

    if (isSoftwareGl) afterDraw(animate);
    else animationId = requestAnimationFrame(animate);
  };

  return {
    start: () => (isSoftwareGl ? afterDraw(animate) : (animationId = requestAnimationFrame(animate))),
    stop: () => {
      cancelAnimationFrame(animationId);
      if (timerId !== null) clearTimeout(timerId);
    },
    getDiagnostics: () => cachedMetrics,
  };
}
