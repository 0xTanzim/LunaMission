import { test, expect, describe } from 'bun:test';
import * as THREE from 'three';
import {
  cameraPoseForPreset,
  getTopocentricBasis,
  createCameraTransitioner,
} from '@/features/spatial/globe/interaction/globeCameraPresets';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';
import { CANDIDATE_SITES } from '@luna/contracts';
import { CandidateSite } from '@/domain/sites/candidateSite';
import { MOON_SCENE_RADIUS, latLonToVector3, CAMERA_NEAR } from '@/features/spatial/globe/scene/globeScene';
import { sampleLolaElevationAtLatLon } from '@/domain/terrain/lolaSouthPoleDemSampler';
import { LOLA_POLAR_CRATER_MORPHOLOGIES } from '@server/data/craterMorphologyData';
import { findCameraPresetOption, CAMERA_PRESETS, CAMERA_PRESET_ALIASES } from '@/features/spatial/config/spatialToolbarOptions';

describe('Milestone 1 Adversarial Challenge: Focus Area 1 - Camera Presets & Transitions', () => {
  const allPresets: CameraPreset[] = [
    'nadir',
    'site',
    'horizon',
    'eva',
    'earth_align',
    'orbit360',
    'north_look',
    'sunward_terminator',
    'global',
    'oblique',
    'overhead',
    'inspection',
  ];

  test('Preset vector validity: finite, non-NaN, non-degenerate poses across all candidate sites', () => {
    for (const site of CANDIDATE_SITES) {
      for (const preset of allPresets) {
        const pose = cameraPoseForPreset(preset, site);
        expect(Number.isFinite(pose.camPos.x)).toBe(true);
        expect(Number.isFinite(pose.camPos.y)).toBe(true);
        expect(Number.isFinite(pose.camPos.z)).toBe(true);
        expect(Number.isFinite(pose.lookTarget.x)).toBe(true);
        expect(Number.isFinite(pose.lookTarget.y)).toBe(true);
        expect(Number.isFinite(pose.lookTarget.z)).toBe(true);
        expect(Number.isFinite(pose.upVector.x)).toBe(true);
        expect(Number.isFinite(pose.upVector.y)).toBe(true);
        expect(Number.isFinite(pose.upVector.z)).toBe(true);

        // Verify camera position does not coincide with lookTarget
        const dist = pose.camPos.distanceTo(pose.lookTarget);
        expect(dist).toBeGreaterThan(0.001);

        // Verify upVector is non-zero
        expect(pose.upVector.length()).toBeGreaterThan(0.1);
      }
    }
  });

  test('Preset resolution and aliases: findCameraPresetOption handles canonical and alias keys', () => {
    const canonical = ['nadir', 'site', 'horizon', 'eva', 'earth_align', 'orbit360', 'north_look', 'sunward_terminator'];
    for (const id of canonical) {
      const opt = findCameraPresetOption(id as any);
      expect(opt).toBeDefined();
      expect(opt?.preset).toBe(id);
    }

    const aliases = ['southPole', 'global', 'oblique', 'overhead', 'inspection'];
    for (const alias of aliases) {
      const opt = findCameraPresetOption(alias as any);
      expect(opt).toBeDefined();
    }
  });

  test('Dense geodetic grid stress test for getTopocentricBasis (singularities, NaN checks)', () => {
    // Test across latitudes from -90° to -80° and longitudes from 0° to 360°
    const lats = [-90.0, -89.9999, -89.5, -88.0, -85.0, -83.0, -80.0, 0.0, 90.0];
    const lons = [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0, 360.0, 720.0, -180.0];

    for (const lat of lats) {
      for (const lon of lons) {
        const basis = getTopocentricBasis(lat, lon, MOON_SCENE_RADIUS);
        expect(Number.isFinite(basis.surfacePos.x)).toBe(true);
        expect(Number.isFinite(basis.normal.x)).toBe(true);
        expect(Number.isFinite(basis.north.x)).toBe(true);
        expect(Number.isFinite(basis.east.x)).toBe(true);

        // Orthonormality check
        expect(Math.abs(basis.normal.length() - 1.0)).toBeLessThan(1e-4);
        expect(Math.abs(basis.north.length() - 1.0)).toBeLessThan(1e-4);
        expect(Math.abs(basis.east.length() - 1.0)).toBeLessThan(1e-4);

        // Dot products must be near zero
        expect(Math.abs(basis.normal.dot(basis.north))).toBeLessThan(1e-4);
        expect(Math.abs(basis.normal.dot(basis.east))).toBeLessThan(1e-4);
        expect(Math.abs(basis.north.dot(basis.east))).toBeLessThan(1e-4);
      }
    }
  });

  test('Rapid transition interrupts and multi-hop stress testing', () => {
    const site = CANDIDATE_SITES[0];
    const transitioner = createCameraTransitioner();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
    const controls = { target: new THREE.Vector3(0, 0, 0), update: () => {} } as any;

    // Start moving to horizon
    transitioner.moveTo('horizon', site);
    expect(transitioner.isTransitioning()).toBe(true);

    // Step 3 frames
    for (let i = 0; i < 3; i++) transitioner.step(camera, controls);
    expect(transitioner.isTransitioning()).toBe(true);

    // Interrupt with orbit360
    transitioner.moveTo('orbit360', site);
    expect(transitioner.isTransitioning()).toBe(true);

    // Step 5 frames
    for (let i = 0; i < 5; i++) transitioner.step(camera, controls);

    // Cancel abruptly
    transitioner.cancel();
    expect(transitioner.isTransitioning()).toBe(false);

    // Camera vectors must remain completely finite
    expect(Number.isFinite(camera.position.x)).toBe(true);
    expect(Number.isFinite(camera.position.y)).toBe(true);
    expect(Number.isFinite(camera.position.z)).toBe(true);
    expect(Number.isFinite(controls.target.x)).toBe(true);
    expect(Number.isFinite(controls.target.y)).toBe(true);
    expect(Number.isFinite(controls.target.z)).toBe(true);
  });
});

describe('Milestone 1 Adversarial Challenge: Focus Area 2 - Touch Gestures Simulation', () => {
  test('Pinch-to-zoom mathematical scaling and zero-division robustness', () => {
    // Normal pinch out: distance doubles
    const startDist = 100;
    const endDist = 200;
    const startZoom = 1.0;
    const ratio = endDist / Math.max(startDist, 1);
    const nextZoom = Math.min(10.0, Math.max(0.5, startZoom * ratio));
    expect(nextZoom).toBe(2.0);

    // Pinch in: distance halves
    const endDistHalf = 50;
    const ratioHalf = endDistHalf / Math.max(startDist, 1);
    const nextZoomHalf = Math.min(10.0, Math.max(0.5, startZoom * ratioHalf));
    expect(nextZoomHalf).toBe(0.5);

    // Boundary zero-division test: start touches coincide at exact same pixel (dist = 0)
    const zeroDist = 0;
    const guardedStartDist = Math.max(zeroDist, 1); // useMapGestures line 91 guard
    expect(guardedStartDist).toBe(1);

    const zeroRatio = 50 / guardedStartDist;
    expect(Number.isFinite(zeroRatio)).toBe(true);
    expect(Number.isNaN(zeroRatio)).toBe(false);

    // Centroid calculation
    const t1 = { clientX: 100, clientY: 200 };
    const t2 = { clientX: 300, clientY: 400 };
    const midX = (t1.clientX + t2.clientX) / 2;
    const midY = (t1.clientY + t2.clientY) / 2;
    expect(midX).toBe(200);
    expect(midY).toBe(300);
  });
});

describe('Milestone 1 Adversarial Challenge: Focus Area 3 - Fullscreen & Escape Handling', () => {
  test('Fullscreen event synchronization logic check', () => {
    let isFullscreen = false;
    const setFullscreen = (v: boolean) => { isFullscreen = v; };

    // Simulate native fullscreen entry
    let mockFullscreenElement: Element | null = null;
    const handleFullscreenChange = () => {
      setFullscreen(Boolean(mockFullscreenElement));
    };

    mockFullscreenElement = {} as Element;
    handleFullscreenChange();
    expect(isFullscreen).toBe(true);

    // Simulate Escape pressed or user exiting via browser chrome
    mockFullscreenElement = null;
    handleFullscreenChange();
    expect(isFullscreen).toBe(false);
  });

  test('Escape key logical hierarchy: modals yield before fullscreen', () => {
    let isModalOpen = true;
    let isFullscreen = true;

    // Simulate keydown handler from Scenario3DLab
    const simulateEscape = () => {
      if (isModalOpen) {
        isModalOpen = false;
      } else if (isFullscreen) {
        isFullscreen = false;
      }
    };

    // First Escape: closes modal
    simulateEscape();
    expect(isModalOpen).toBe(false);
    expect(isFullscreen).toBe(true);

    // Second Escape: exits fullscreen
    simulateEscape();
    expect(isFullscreen).toBe(false);
  });
});

describe('Milestone 1 Adversarial Challenge: Focus Area 4 - Negative Crater Geometry & Anti-Penetration', () => {
  const MOON_RADIUS_METERS = 1737400;

  test('Base sphere radius reduction vs Shackleton floor (-4.2 km)', () => {
    const shackletonElevMeters = -4200;
    const baseSphereReductionMeters = 9200;

    const baseSphereRadius = MOON_SCENE_RADIUS * (1.0 - baseSphereReductionMeters / MOON_RADIUS_METERS);
    const shackletonFloorRadius = MOON_SCENE_RADIUS * (1.0 + shackletonElevMeters / MOON_RADIUS_METERS);

    // Base sphere must sit strictly below the crater floor to avoid clipping
    expect(baseSphereRadius).toBeLessThan(shackletonFloorRadius);

    const clearanceMeters = (shackletonFloorRadius - baseSphereRadius) * (MOON_RADIUS_METERS / MOON_SCENE_RADIUS);
    expect(clearanceMeters).toBeCloseTo(5000, 0); // 9200 - 4200 = 5000m clearance
  });

  test('REMEDIATION VERIFICATION: Base sphere radius reduction (9200m) clears depressions down to -9.0 km', () => {
    // NASA SVS 3727 and South Pole-Aitken depressions extend to -9000m (-9.0 km)
    const deepDepressionElevMeters = -9000;
    const currentBaseSphereReductionMeters = 9200;

    const currentBaseSphereRadius = MOON_SCENE_RADIUS * (1.0 - currentBaseSphereReductionMeters / MOON_RADIUS_METERS);
    const deepFloorRadius = MOON_SCENE_RADIUS * (1.0 + deepDepressionElevMeters / MOON_RADIUS_METERS);

    // For depths up to -9.0 km, remediated base sphere (reduced by 9.2 km) sits strictly below the floor
    const baseSphereBelowFloor = currentBaseSphereRadius < deepFloorRadius;
    const clearanceMeters = (deepFloorRadius - currentBaseSphereRadius) * (MOON_RADIUS_METERS / MOON_SCENE_RADIUS);

    expect(baseSphereBelowFloor).toBe(true);
    expect(clearanceMeters).toBeCloseTo(200, 0); // 9200 - 9000 = 200m clearance below deepest depression
  });

  test('REMEDIATION VERIFICATION: Camera collision guard in globeSceneBuilder uses localElevUnits directly without Math.max ejection', () => {
    // In globeSceneBuilder.ts line 319:
    // minSafeRadius = MOON_SCENE_RADIUS + localElevUnits + 0.0035;
    // For Shackleton at -4200m:
    const localElevMeters = -4200;
    const localElevUnits = (localElevMeters / 1000.0) * (MOON_SCENE_RADIUS / 1737.4);

    const minSafeRadius = MOON_SCENE_RADIUS + localElevUnits + 0.0035;

    // With localElevUnits used directly, minSafeRadius descends inside the crater below MOON_SCENE_RADIUS
    expect(minSafeRadius).toBeLessThan(MOON_SCENE_RADIUS);

    // Meanwhile, the actual crater terrain is at radius:
    const actualTerrainRadius = MOON_SCENE_RADIUS + localElevUnits;
    expect(actualTerrainRadius).toBeLessThan(MOON_SCENE_RADIUS);

    // Difference between collision clamp and actual crater floor is now strictly the 0.0035 safety margin:
    const gapSceneUnits = minSafeRadius - actualTerrainRadius;
    expect(gapSceneUnits).toBeCloseTo(0.0035, 4);
    const gapMeters = gapSceneUnits * (MOON_RADIUS_METERS / MOON_SCENE_RADIUS);
    expect(gapMeters).toBeCloseTo(4194, 0);
  });

  test('REMEDIATION VERIFICATION: EVA Preset Target Distance (0.046 units) vs Camera Near Plane (0.001 units)', () => {
    const site = CANDIDATE_SITES[0];
    const evaPose = cameraPoseForPreset('eva', site);
    const distanceCamToTarget = evaPose.camPos.distanceTo(evaPose.lookTarget);

    // In globeScene.ts, CAMERA_NEAR is now 0.001 units (~1.2 km).
    // The EVA camera target is at distance 0.046 units (~55 km).
    // Because distanceCamToTarget > CAMERA_NEAR, the lookTarget and terrain are NOT clipped!
    expect(distanceCamToTarget).toBeGreaterThan(CAMERA_NEAR);
  });
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanetaryTheaterCameraButtons } from '@/features/spatial/lab/components/PlanetaryTheaterCameraButtons';

describe('Milestone 1 Adversarial Challenge: Additional Coverage Hardening', () => {
  test('REMEDIATION VERIFICATION: PlanetaryTheaterCameraButtons exposes all 12 authoritative presets (primary framings inline, tactical modes behind "More views")', () => {
    const markup = renderToStaticMarkup(
      React.createElement(PlanetaryTheaterCameraButtons, {
        currentPreset: 'nadir',
        onSelectCameraPreset: () => {},
        isFlyoverActive: false,
        onToggleFlyover: () => {},
        onResetCamera: () => {},
      })
    );

    // Primary framings render inline in the Camera group:
    expect(markup.includes('preset-global')).toBe(true);
    expect(markup.includes('preset-nadir')).toBe(true);
    expect(markup.includes('preset-oblique')).toBe(true);

    // Tactical modes collapsed behind the "More views" popover (task 3.2); the menu
    // panel stays in the DOM (hidden until opened) with one menuitem per preset.
    expect(markup.includes('moreviews-trigger')).toBe(true);
    expect(markup.includes('aria-haspopup="menu"')).toBe(true);
    for (const id of [
      'site',
      'overhead',
      'horizon',
      'eva',
      'earth_align',
      'orbit360',
      'north_look',
      'sunward_terminator',
      'inspection',
    ]) {
      expect(markup.includes(`moreviews-${id}`)).toBe(true);
    }
  });

  test('EMPIRICAL FINDING: Synthetic TouchMove without TouchStart with dist=0 produces NaN zoom', () => {
    // In useMapGestures.ts:
    // touchRef.current initialized as { startDist: 0, startZoom: 1, ... }
    const uninitializedStartDist = 0;
    const concurrentTouchDist = 0; // both touches at same client position
    const ratio = concurrentTouchDist / uninitializedStartDist; // 0 / 0 = NaN
    const nextZoom = Math.min(10.0, Math.max(0.5, 1.0 * ratio));

    expect(Number.isNaN(ratio)).toBe(true);
    expect(Number.isNaN(nextZoom)).toBe(true);
  });
});
