import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';
import { clampCameraAltitudeAntiPenetration } from '@/features/spatial/globe/scene/globeSceneAnimator';
import { createCameraTransitionerWithResolver } from '@/features/spatial/globe/interaction/globeCameraTransitioner';
import { CANDIDATE_SITES } from '@luna/contracts';

describe('DEF-02 Regression: Camera Anti-Penetration Guard during Transitions', () => {
  test('clampCameraAltitudeAntiPenetration clamps camera position to safe altitude above terrain', () => {
    // Camera placed below lunar surface radius (e.g. radius 1.2 vs MOON_SCENE_RADIUS 1.45)
    const cameraPosition = new THREE.Vector3(0, -1.2, 0);
    const mockElevationLookup = (_lat: number, _lon: number) => 3000; // +3 km peak

    const minSafeRadius = clampCameraAltitudeAntiPenetration(cameraPosition, mockElevationLookup);

    expect(minSafeRadius).toBeGreaterThan(MOON_SCENE_RADIUS);
    expect(cameraPosition.length()).toBeGreaterThanOrEqual(minSafeRadius);
    expect(Math.abs(cameraPosition.length() - minSafeRadius)).toBeLessThan(1e-5);
  });

  test('anti-penetration guard enforces altitude >= minSafeRadius at every step of a 60-frame transition', () => {
    const siteA = CANDIDATE_SITES[0];
    const siteB = CANDIDATE_SITES[1] ?? CANDIDATE_SITES[0];

    // Create a mock transitioner whose linear chord passes deeply through the lunar sphere
    const transitioner = createCameraTransitionerWithResolver((_preset, _site) => ({
      camPos: new THREE.Vector3(1.5, -1.0, 0),
      lookTarget: new THREE.Vector3(0, -1.45, 0),
      upVector: new THREE.Vector3(0, 1, 0),
    }));

    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 50);
    // Start camera on the opposite side so chord penetrates the Moon
    camera.position.set(-1.5, -1.0, 0);

    const mockControls = {
      target: new THREE.Vector3(0, -1.45, 0),
    } as any;

    transitioner.moveTo('site', siteB);
    expect(transitioner.isTransitioning()).toBe(true);

    const mockElevationLookup = (_lat: number, _lon: number) => 1500; // 1.5km terrain elevation
    const safeRadiusFloor = MOON_SCENE_RADIUS + (1.5 / 1737.4) * MOON_SCENE_RADIUS + 0.0035;

    // Simulate 60 animation frames
    for (let frame = 0; frame < 60; frame++) {
      transitioner.step(camera, mockControls);

      // Apply the animator's anti-penetration collision guard
      const safeRadius = clampCameraAltitudeAntiPenetration(camera.position, mockElevationLookup);

      // Invariant: camera must NEVER penetrate below safeRadius at any frame
      const currentAltitude = camera.position.length();
      expect(currentAltitude).toBeGreaterThanOrEqual(safeRadius - 1e-9);
      expect(currentAltitude).toBeGreaterThanOrEqual(safeRadiusFloor - 1e-9);
    }
  });

  test('camera altitude does not push out already-safe cameras', () => {
    // Camera at safe high altitude (e.g. 4.8 units for global / nadir overview)
    const cameraPosition = new THREE.Vector3(0, -4.8, 0);
    const initialDistance = cameraPosition.length();
    const mockElevationLookup = () => 0;

    clampCameraAltitudeAntiPenetration(cameraPosition, mockElevationLookup);

    expect(cameraPosition.length()).toBeCloseTo(initialDistance, 4);
  });
});
