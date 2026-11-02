import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  cameraPoseForPreset,
  createCameraTransitioner,
  GLOBAL_CAMERA_POSITION,
  GLOBAL_LOOK_TARGET,
  NADIR_CAP_CAMERA_DISTANCE,
  OBLIQUE_CAMERA_POSITION,
  OBLIQUE_LOOK_TARGET,
  SITE_CAMERA_ALTITUDE,
} from '../interaction/globeCameraPresets';
import { CANDIDATE_SITES } from '@luna/contracts';

const testSite = CANDIDATE_SITES[0]; // Shackleton Connecting Ridge

test('Camera presets: global preset frames entire Moon with comfortable margins', () => {
  const pose = cameraPoseForPreset('global', testSite);
  assert.deepEqual(
    [pose.camPos.x, pose.camPos.y, pose.camPos.z],
    [...GLOBAL_CAMERA_POSITION]
  );
  assert.deepEqual(
    [pose.lookTarget.x, pose.lookTarget.y, pose.lookTarget.z],
    [...GLOBAL_LOOK_TARGET]
  );
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-5);
});

test('Camera presets: nadir (South Pole) preset frames the polar cap, not the planetary center', () => {
  const pose = cameraPoseForPreset('nadir', testSite);
  // Target is the cap-center surface point on the reference sphere, deep in the south
  assert.ok(
    Math.abs(pose.lookTarget.length() - 1.45) < 0.01,
    `Look target must sit on the reference sphere, was ${pose.lookTarget.length()}`,
  );
  assert.ok(pose.lookTarget.y < -1.4, 'Look target must be the south-polar cap center');
  // Camera hovers a fixed altitude above the cap center along its surface normal
  const altitude = pose.camPos.distanceTo(pose.lookTarget);
  assert.ok(
    Math.abs(altitude - NADIR_CAP_CAMERA_DISTANCE) < 1e-6,
    `Camera altitude must equal the cap framing distance, was ${altitude}`,
  );
  // Prime meridian (+Z) held upward to align with the 2D polar map; no east/west roll
  assert.equal(pose.upVector.x, 0);
  assert.ok(pose.upVector.z > 0.9, 'Up vector must hold the prime meridian upward');
});

test('Camera presets: oblique preset provides perspective across crater relief', () => {
  const pose = cameraPoseForPreset('oblique', testSite);
  assert.deepEqual(
    [pose.camPos.x, pose.camPos.y, pose.camPos.z],
    [...OBLIQUE_CAMERA_POSITION]
  );
  assert.deepEqual(
    [pose.lookTarget.x, pose.lookTarget.y, pose.lookTarget.z],
    [...OBLIQUE_LOOK_TARGET]
  );
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-5, 'Up vector must be normalized');
});

test('Camera presets: site preset centers directly on the selected candidate site', () => {
  const pose = cameraPoseForPreset('site', testSite);
  // lookTarget should point exactly to site position on Moon surface
  assert.ok(pose.lookTarget.length() > 1.4 && pose.lookTarget.length() < 1.5, 'Target is on Moon surface');
  // camPos distance should be greater than site surface distance
  assert.ok(pose.camPos.length() > pose.lookTarget.length());
});

test('Camera presets: inspection preset provides close-range grazing view of candidate site', () => {
  const pose = cameraPoseForPreset('inspection', testSite);
  // lookTarget should point exactly to site position on Moon surface
  assert.ok(pose.lookTarget.length() > 1.4 && pose.lookTarget.length() < 1.5, 'Target is on Moon surface');
  // camPos distance should be close to site surface distance (within 0.15 units)
  const distToTarget = pose.camPos.distanceTo(pose.lookTarget);
  assert.ok(distToTarget < 0.15, `Inspection camera must be within 0.15 units of site, was ${distToTarget}`);
  assert.ok(distToTarget > 0.05, `Inspection camera must maintain safe altitude > 0.05 units, was ${distToTarget}`);
});

test('Camera transitioner: cancel immediately halts in-flight transition', () => {
  const transitioner = createCameraTransitioner();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 10);

  // Fake OrbitControls structure needed for step
  const fakeControls = {
    target: new THREE.Vector3(0, 0, 0),
  } as any;

  transitioner.moveTo('global', testSite);
  transitioner.cancel();

  // Stepping after cancel should do nothing
  const prevPos = camera.position.clone();
  transitioner.step(camera, fakeControls);
  assert.deepEqual(camera.position, prevPos);
});

test('Camera transitioner: step smoothly moves camera and reaches target pose', () => {
  const transitioner = createCameraTransitioner();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.up.set(0, 1, 0);

  const fakeControls = {
    target: new THREE.Vector3(0, 0, 0),
  } as any;

  transitioner.moveTo('nadir', testSite);

  // Simulate multiple animation frames
  for (let i = 0; i < 40; i++) {
    transitioner.step(camera, fakeControls);
  }

  // After sufficient frames (progress >= 1.0), camera should reach the target nadir pose
  const nadirPose = cameraPoseForPreset('nadir', testSite);
  assert.ok(camera.position.distanceTo(nadirPose.camPos) < 0.01);
  assert.ok(Math.abs(camera.up.z - nadirPose.upVector.z) < 0.01);
});

test('Camera presets: overhead preset frames candidate nadir with zenith up and steep tactical angle', () => {
  const pose = cameraPoseForPreset('overhead', testSite);
  assert.ok(pose.lookTarget.length() > 1.4 && pose.lookTarget.length() < 1.5, 'Target is on Moon surface');
  const dist = pose.camPos.distanceTo(pose.lookTarget);
  assert.ok(dist >= 0.12 && dist <= 0.16, `Overhead camera distance should be ~0.136, was ${dist}`);
  // Up vector is local zenith (normal) to enable smooth compass yaw rotation in OrbitControls
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-4);
  const targetNormal = pose.lookTarget.clone().normalize();
  assert.ok(pose.upVector.dot(targetNormal) > 0.99, 'Up vector is aligned with local surface normal');
});

test('Camera presets: horizon preset frames eye-level perspective toward terrain horizon', () => {
  const pose = cameraPoseForPreset('horizon', testSite);
  assert.ok(pose.camPos.length() > 1.45, 'Camera sits safely above Moon surface');
  const dist = pose.camPos.distanceTo(pose.lookTarget);
  assert.ok(dist < 0.12, `Horizon view look target distance should be compact, was ${dist}`);
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-4);
  const targetNormal = pose.lookTarget.clone().normalize();
  assert.ok(pose.upVector.dot(targetNormal) > 0.95, 'Up vector is aligned with surface normal');
});

test('Camera presets: eva preset frames first-person astronaut eye-level perspective', () => {
  const pose = cameraPoseForPreset('eva', testSite);
  assert.ok(pose.camPos.length() > 1.45, 'EVA camera is placed on lunar surface');
  const dist = pose.camPos.distanceTo(pose.lookTarget);
  assert.ok(dist < 0.1, `EVA camera look distance should be intimate, was ${dist}`);
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-4);
});

test('Camera presets: earth_align preset frames direct RF line-of-sight toward Earth on horizon', () => {
  const pose = cameraPoseForPreset('earth_align', testSite);
  assert.ok(pose.camPos.length() > 1.45, 'Earth align camera is above surface');
  const lookDir = pose.lookTarget.clone().sub(pose.camPos).normalize();
  // Earth is positioned roughly toward +Z (prime meridian) at lunar South Pole
  assert.ok(lookDir.z > 0.3, 'Look direction points toward Earth hemisphere (+Z)');
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-4);
});

test('Camera presets: orbit360 preset frames circular orbital overview around candidate', () => {
  const pose = cameraPoseForPreset('orbit360', testSite);
  const alt = pose.camPos.distanceTo(pose.lookTarget);
  assert.ok(alt > 0.5 && alt < 1.0, `Orbit 360 altitude should be ~0.7, was ${alt}`);
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-4);
});

test('Camera presets: north_look preset frames view looking true North along prime meridian', () => {
  const pose = cameraPoseForPreset('north_look', testSite);
  assert.ok(pose.camPos.length() > 1.45, 'North look camera sits above surface');
  const dist = pose.camPos.distanceTo(pose.lookTarget);
  assert.ok(dist < 0.15, `North look target distance should be compact, was ${dist}`);
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-4);
});

test('Camera presets: sunward_terminator preset frames grazing low-sun terminator line', () => {
  const pose = cameraPoseForPreset('sunward_terminator', testSite);
  assert.ok(pose.camPos.length() > 1.45, 'Sunward camera sits above surface');
  const dist = pose.camPos.distanceTo(pose.lookTarget);
  assert.ok(dist < 0.15, `Sunward terminator target distance should be compact, was ${dist}`);
  assert.ok(Math.abs(pose.upVector.length() - 1.0) < 1e-4);
});



// Task 5.3: in the North Look mode the compass rose must confirm the framing —
// lunar north should project straight up the screen (heading ≈ 0°).
test('Camera presets: north_look compass heading reads ~0° (north up the screen)', () => {
  const { computeCompassHeadingDeg } = require('../scene/globeOrientationHud') as {
    computeCompassHeadingDeg: (camera: THREE.Camera, target: THREE.Vector3) => number;
  };
  const pose = cameraPoseForPreset('north_look', testSite);
  const camera = new THREE.PerspectiveCamera(50, 16 / 9, 0.01, 100);
  camera.position.copy(pose.camPos);
  camera.up.copy(pose.upVector);
  camera.lookAt(pose.lookTarget);
  camera.updateMatrixWorld();
  const heading = computeCompassHeadingDeg(camera, pose.lookTarget);
  const angularError = Math.min(heading, 360 - heading);
  assert.ok(angularError <= 5, `north_look compass heading should be ~0°, got ${heading.toFixed(1)}°`);
});
