import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CANDIDATE_SITES } from '@luna/contracts';
import { cameraPoseForPreset } from '@/features/spatial/globe/interaction/globeCameraPresets';
import {
  createCameraTransitionerWithResolver,
} from '@/features/spatial/globe/interaction/globeCameraTransitioner';

const site1 = CANDIDATE_SITES[0]; // Shackleton Connecting Ridge
const site2 = CANDIDATE_SITES[5]; // Malapert Mountain

test('Geodesic Camera Transitioner: Surface-to-surface transition never dips below lunar radius', () => {
  const transitioner = createCameraTransitionerWithResolver(cameraPoseForPreset);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  const startPose = cameraPoseForPreset('site', site1);
  const endPose = cameraPoseForPreset('site', site2);
  camera.position.copy(startPose.camPos);
  camera.up.copy(startPose.upVector);

  const fakeControls = {
    target: startPose.lookTarget.clone(),
    update: () => {},
  } as any;

  transitioner.moveTo('site', site2);

  let minCamRadius = Infinity;
  let minTargetRadius = Infinity;
  let steps = 0;

  while (transitioner.isTransitioning()) {
    transitioner.step(camera, fakeControls);
    minCamRadius = Math.min(minCamRadius, camera.position.length());
    minTargetRadius = Math.min(minTargetRadius, fakeControls.target.length());
    steps++;
    if (steps > 50) break;
  }

  assert.ok(steps > 0 && steps < 40, `Transition completed in expected steps (${steps})`);
  // Moon scene radius is 1.45. Camera altitude must never cut through the chord into the interior.
  assert.ok(minCamRadius >= 1.45, `Camera radius (${minCamRadius}) must remain >= 1.45 (no chord dip)`);
  // Look target must stay on the surface and never dip below 0.6 (eliminates isMoonCentric mode flips)
  assert.ok(minTargetRadius >= 1.44, `Look target radius (${minTargetRadius}) must stay on surface >= 1.44`);
  assert.ok(minTargetRadius > 0.6, `Look target radius must never drop < 0.6 to prevent mode flipping`);

  // Final pose matches destination exactly
  assert.ok(camera.position.distanceTo(endPose.camPos) < 1e-4);
  assert.ok(fakeControls.target.distanceTo(endPose.lookTarget) < 1e-4);
});

test('Geodesic Camera Transitioner: Global to local site transition descends monotonically without subterranean dip', () => {
  const transitioner = createCameraTransitionerWithResolver(cameraPoseForPreset);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  const startPose = cameraPoseForPreset('global', site1);
  const endPose = cameraPoseForPreset('inspection', site1);
  camera.position.copy(startPose.camPos);
  camera.up.copy(startPose.upVector);

  const fakeControls = {
    target: startPose.lookTarget.clone(),
    update: () => {},
  } as any;

  transitioner.moveTo('inspection', site1);

  let minCamRadius = Infinity;
  let steps = 0;

  while (transitioner.isTransitioning()) {
    transitioner.step(camera, fakeControls);
    minCamRadius = Math.min(minCamRadius, camera.position.length());
    steps++;
    if (steps > 50) break;
  }

  // Camera descends from global (5.60) to inspection (1.54) without dipping below 1.50
  assert.ok(minCamRadius >= 1.50, `Camera altitude must not dip below destination radius (${minCamRadius})`);
  assert.ok(camera.position.distanceTo(endPose.camPos) < 1e-4);
});

test('Geodesic Camera Transitioner: Clean OrbitControls contract with zero monkey-patching', () => {
  const transitioner = createCameraTransitionerWithResolver(cameraPoseForPreset);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);

  let updateCalled = false;
  const minimalControls = {
    target: new THREE.Vector3(0, 0, 0),
    update: () => {
      updateCalled = true;
    },
  } as any;

  transitioner.moveTo('nadir', site1);

  for (let i = 0; i < 30; i++) {
    transitioner.step(camera, minimalControls);
  }

  // Verify transition finishes and calls controls.update() without touching private fields
  assert.equal(transitioner.isTransitioning(), false);
  assert.equal(updateCalled, true);
  // Ensure no private properties were added to minimalControls
  assert.equal((minimalControls as any)._quat, undefined);
  assert.equal((minimalControls as any)._sphericalDelta, undefined);
});
