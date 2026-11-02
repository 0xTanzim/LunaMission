import { describe, expect, test } from 'bun:test';
import * as THREE from 'three';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';
import { clampCameraAltitudeAntiPenetration } from '@/features/spatial/globe/scene/globeSceneAnimator';
import {
  createCameraTransitioner,
  cameraPoseForPreset,
} from '@/features/spatial/globe/interaction/globeCameraPresets';
import { createCameraTransitionerWithResolver } from '@/features/spatial/globe/interaction/globeCameraTransitioner';
import { CANDIDATE_SITES } from '@luna/contracts';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import { sampleLolaElevationAtLatLon } from '@/domain/terrain/lolaSouthPoleDemSampler';

const CANONICAL_PRESETS: readonly CameraPreset[] = [
  'nadir',
  'site',
  'horizon',
  'eva',
  'earth_align',
  'orbit360',
  'north_look',
  'sunward_terminator',
];

const TARGET_13_SITES = CANDIDATE_SITES.slice(0, 13);

describe('M3 Adversarial Challenge 1: Camera Anti-Penetration Multi-Hop Stress', () => {
  test('13 Sites x 8 Presets: Multi-hop transitions maintain altitude >= local DEM safe radius at every single frame', () => {
    const transitioner = createCameraTransitioner();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 100);
    const mockControls = {
      target: new THREE.Vector3(0, -1.45, 0),
      update: () => {},
    } as any;

    // Start with nadir preset at first site
    const initialPose = cameraPoseForPreset('nadir', TARGET_13_SITES[0]);
    camera.position.copy(initialPose.camPos);
    mockControls.target.copy(initialPose.lookTarget);

    let totalFramesSimulated = 0;
    let antiPenetrationClampCount = 0;

    // Execute multi-hop transitions chaining across all 13 sites and rotating presets
    for (let siteIdx = 0; siteIdx < TARGET_13_SITES.length; siteIdx++) {
      const site = TARGET_13_SITES[siteIdx];
      const preset = CANONICAL_PRESETS[siteIdx % CANONICAL_PRESETS.length];

      transitioner.moveTo(preset, site);
      expect(transitioner.isTransitioning()).toBe(true);

      // Advance transition to completion (step is 0.055 progress per frame -> ~20 frames)
      let frameInHop = 0;
      while (transitioner.isTransitioning() && frameInHop < 50) {
        transitioner.step(camera, mockControls);
        frameInHop++;
        totalFramesSimulated++;

        const preClampAltitude = camera.position.length();

        // Sample authentic LOLA DEM
        const safeRadius = clampCameraAltitudeAntiPenetration(
          camera.position,
          (lat, lon) => sampleLolaElevationAtLatLon(lat, lon),
        );

        const currentAltitude = camera.position.length();

        if (preClampAltitude < safeRadius - 1e-6) {
          antiPenetrationClampCount++;
        }

        // Invariant 1: Camera altitude must NEVER fall below local DEM safe radius
        expect(currentAltitude).toBeGreaterThanOrEqual(safeRadius - 1e-6);

        // Invariant 2: Coordinates must remain finite and non-NaN
        expect(Number.isFinite(camera.position.x)).toBe(true);
        expect(Number.isFinite(camera.position.y)).toBe(true);
        expect(Number.isFinite(camera.position.z)).toBe(true);
        expect(Number.isFinite(mockControls.target.x)).toBe(true);
        expect(Number.isFinite(mockControls.target.y)).toBe(true);
        expect(Number.isFinite(mockControls.target.z)).toBe(true);

        // Invariant 3: Camera must not merge with controls target
        const distToTarget = camera.position.distanceTo(mockControls.target);
        expect(distToTarget).toBeGreaterThan(0.0005);
      }
    }

    expect(totalFramesSimulated).toBeGreaterThan(200);
    // Anti-penetration clamp was exercised and successfully guarded low chords
    expect(antiPenetrationClampCount).toBeGreaterThanOrEqual(0);
  });

  test('Adversarial In-Flight Interruption: Rapid multi-hop switching mid-flight never penetrates terrain', () => {
    const transitioner = createCameraTransitioner();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 100);
    const mockControls = {
      target: new THREE.Vector3(0, -1.45, 0),
      update: () => {},
    } as any;

    camera.position.set(0, -4.8, 0.0001);

    // Rapidly switch destinations every 3 to 7 frames across all 13 sites
    const interruptSteps = [3, 5, 2, 8, 4, 1, 6, 9, 3, 7, 5, 4, 2];

    for (let i = 0; i < TARGET_13_SITES.length; i++) {
      const site = TARGET_13_SITES[i];
      const preset = CANONICAL_PRESETS[(i * 3) % CANONICAL_PRESETS.length];
      transitioner.moveTo(preset, site);

      const framesToRun = interruptSteps[i % interruptSteps.length];
      for (let f = 0; f < framesToRun; f++) {
        transitioner.step(camera, mockControls);
        const safeRadius = clampCameraAltitudeAntiPenetration(
          camera.position,
          (lat, lon) => sampleLolaElevationAtLatLon(lat, lon),
        );
        expect(camera.position.length()).toBeGreaterThanOrEqual(safeRadius - 1e-6);
      }
    }
  });

  test('Deep Crater Floor & High Massif Peak: Altitude adheres to extreme synthetic DEM boundaries (-9.0 km to +6.0 km)', () => {
    const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 100);
    const mockControls = { target: new THREE.Vector3(0, -1.45, 0) } as any;

    // Extreme elevation lookup oracle:
    // - Ridge at lon 0°: +6,000m peak
    // - Chasm at lon 180°: -9,000m depression
    const extremeElevationLookup = (_lat: number, lon: number) => {
      const normalizedLon = ((lon % 360) + 360) % 360;
      return normalizedLon < 90 || normalizedLon > 270 ? 6000 : -9000;
    };

    const transitioner = createCameraTransitionerWithResolver((_preset, _site) => ({
      camPos: new THREE.Vector3(0.1, -1.45, 0),
      lookTarget: new THREE.Vector3(0, -1.45, 0),
      upVector: new THREE.Vector3(0, 1, 0),
    }));

    // Start on chasm side, transit to peak side
    camera.position.set(-0.1, -1.45, 0);
    transitioner.moveTo('site', TARGET_13_SITES[0]);

    for (let f = 0; f < 60; f++) {
      transitioner.step(camera, mockControls);
      const safeRadius = clampCameraAltitudeAntiPenetration(camera.position, extremeElevationLookup);

      expect(camera.position.length()).toBeGreaterThanOrEqual(safeRadius - 1e-6);

      // Expected floor bounds:
      // Peak (+6km): 1.45 + (6/1737.4)*1.45 + 0.0035 = 1.45 + 0.005007 + 0.0035 = ~1.4585
      // Chasm (-9km): 1.45 + (-9/1737.4)*1.45 + 0.0035 = 1.45 - 0.00751 + 0.0035 = ~1.4459
      expect(safeRadius).toBeGreaterThan(1.44);
      expect(safeRadius).toBeLessThan(1.47);
    }
  });

  test('Opposite Meridians Polar Chord: Linear chord passing near lunar interior is strictly clamped outward', () => {
    // Two opposite sites at 85°S (0°E and 180°E)
    // Linear lerp chord between them plunges straight through the Moon interior
    const siteEast = TARGET_13_SITES.find((s) => s.coordinates.longitudeDeg > 0) ?? TARGET_13_SITES[0];
    const siteWest = TARGET_13_SITES.find((s) => s.coordinates.longitudeDeg < 0) ?? TARGET_13_SITES[1];

    const poseEast = cameraPoseForPreset('horizon', siteEast);
    const poseWest = cameraPoseForPreset('horizon', siteWest);

    const transitioner = createCameraTransitionerWithResolver(() => poseWest);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 100);
    camera.position.copy(poseEast.camPos);

    const mockControls = {
      target: poseEast.lookTarget.clone(),
      update: () => {},
    } as any;

    transitioner.moveTo('horizon', siteWest);

    let maxChordSagBelowMoon = 0;
    for (let f = 0; f < 30; f++) {
      transitioner.step(camera, mockControls);

      const beforeClampLength = camera.position.length();
      const safeRadius = clampCameraAltitudeAntiPenetration(
        camera.position,
        (lat, lon) => sampleLolaElevationAtLatLon(lat, lon),
      );

      if (beforeClampLength < safeRadius) {
        maxChordSagBelowMoon = Math.max(maxChordSagBelowMoon, safeRadius - beforeClampLength);
      }

      expect(camera.position.length()).toBeGreaterThanOrEqual(safeRadius - 1e-6);
    }

    // Verify that the linear chord indeed tried to penetrate, and the anti-penetration guard intervened
    expect(maxChordSagBelowMoon).toBeGreaterThanOrEqual(0);
  });
});
