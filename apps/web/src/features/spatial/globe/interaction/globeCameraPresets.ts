import * as THREE from 'three';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';
import { CameraTransitioner, createCameraTransitionerWithResolver } from './globeCameraTransitioner';
import { getPrefersReducedMotion } from '@/features/accessibility/ui';
export { attachKeyboardOrbitControls } from './globeKeyboardOrbit';
import {
  CameraPose,
  TopocentricBasis,
  getTopocentricBasis,
  computeLocalPresetPose,
  computeSiteCelestialTangents,
  type EpochSubPoints,
  type SiteCelestialTangents,
  INSPECTION_CAMERA_ALTITUDE,
  INSPECTION_CAMERA_TILT,
} from './globeCameraPresetPoses';

export {
  INSPECTION_CAMERA_ALTITUDE,
  INSPECTION_CAMERA_TILT,
  getTopocentricBasis,
  computeSiteCelestialTangents,
};
export type { SiteCelestialTangents };
export type { CameraPose, TopocentricBasis };

/**
 * Calibrated camera distances for 38° FOV and Moon radius 1.45:
 * - South Pole Focus (nadir): 0.5 units above the cap-center surface -> the 80°S–90°S cap
 *   subtends ~74% of the vertical half-FOV, so the polar terrain is the frame's subject.
 * - Global Context: 5.6 units -> Full Moon with ~16% margin around all sides.
 * - Oblique: perspective across crater rims at ~38° inclination.
 * - Site Focus: 1.35 units above candidate normal.
 */
export const POLAR_CAP_CENTER_LAT_DEG = -85;
export const NADIR_CAP_CAMERA_DISTANCE = 0.5;
export const GLOBAL_CAMERA_POSITION: readonly [number, number, number] = [0, 0, 5.6];
export const GLOBAL_LOOK_TARGET: readonly [number, number, number] = [0, 0, 0];
export const GLOBAL_UP_VECTOR: readonly [number, number, number] = [0, 1, 0];
export const OBLIQUE_CAMERA_POSITION: readonly [number, number, number] = [0, -3.2, 2.2];
export const OBLIQUE_LOOK_TARGET: readonly [number, number, number] = [0, -0.8, 0];
export const OBLIQUE_UP_VECTOR: readonly [number, number, number] = [0, 0.6, 0.8];
export const SITE_CAMERA_ALTITUDE = 1.35;
export const SITE_CAMERA_TILT = 0.35;

/** Where each preset parks the camera, using rigorous topocentric coordinates for local modes. */
export function cameraPoseForPreset(
  preset: CameraPreset,
  site: CandidateSite,
  celestial?: SiteCelestialTangents,
): CameraPose {
  if (preset === 'nadir') {
    // Cap-centered South Pole framing: hover above the 85°S cap center looking at its
    // surface point (never the planetary center), prime-meridian north held up to align
    // with the 2D polar map.
    const basis = getTopocentricBasis(POLAR_CAP_CENTER_LAT_DEG, 0, MOON_SCENE_RADIUS);
    return {
      camPos: basis.surfacePos.clone().add(basis.normal.clone().multiplyScalar(NADIR_CAP_CAMERA_DISTANCE)),
      lookTarget: basis.surfacePos.clone(),
      upVector: basis.north.clone(),
    };
  }

  if (preset === 'global') {
    // Global context: complete Moon with safe margins and clear view
    return {
      camPos: new THREE.Vector3(...GLOBAL_CAMERA_POSITION),
      lookTarget: new THREE.Vector3(...GLOBAL_LOOK_TARGET),
      upVector: new THREE.Vector3(...GLOBAL_UP_VECTOR).normalize(),
    };
  }

  if (preset === 'oblique') {
    // Low perspective view across south-polar crater rims toward the terminator
    return {
      camPos: new THREE.Vector3(...OBLIQUE_CAMERA_POSITION),
      lookTarget: new THREE.Vector3(...OBLIQUE_LOOK_TARGET),
      upVector: new THREE.Vector3(...OBLIQUE_UP_VECTOR).normalize(),
    };
  }

  const elevMeters = site.coordinates.elevationMeters ?? 0;
  const elevSceneUnits = (elevMeters / 1000.0) * (MOON_SCENE_RADIUS / 1737.4);
  const basis = getTopocentricBasis(
    site.coordinates.latitudeDeg,
    site.coordinates.longitudeDeg,
    MOON_SCENE_RADIUS + elevSceneUnits,
  );

  return computeLocalPresetPose(preset, site, basis, celestial);
}

export type { CameraTransitioner } from './globeCameraTransitioner';

/**
 * Eased camera moves between presets, interruptible on user manipulation. The resolver
 * closes over `celestialRef` so `earth_align` / `sunward_terminator` always read the
 * latest backend epoch directions at move time (task 3.3).
 */
export function createCameraTransitioner(
  celestialRef?: { current: SiteCelestialTangents | null },
): CameraTransitioner {
  return createCameraTransitionerWithResolver(
    (preset, site) => cameraPoseForPreset(preset, site, celestialRef?.current ?? undefined),
    // Reduced motion (task 3.5): snap to preset poses instead of easing.
    { instant: getPrefersReducedMotion },
  );
}
