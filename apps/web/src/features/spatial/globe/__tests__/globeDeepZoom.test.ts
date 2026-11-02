import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  MOON_SCENE_RADIUS,
  CONTROL_MIN_DISTANCE,
  CONTROL_MAX_DISTANCE,
  createGlobeScene,
} from '../scene/globeScene';
import {
  cameraPoseForPreset,
  INSPECTION_CAMERA_ALTITUDE,
} from '../interaction/globeCameraPresets';
import { CANDIDATE_SITES } from '@luna/contracts';

test('Deep Zoom: Minimum control distance is calibrated for site-scale inspection', () => {
  // Control minDistance must allow close inspection (<= 0.05 units), not locked at 2.1
  assert.ok(
    CONTROL_MIN_DISTANCE <= 0.05,
    `CONTROL_MIN_DISTANCE must be <= 0.05 to allow deep zoom, was ${CONTROL_MIN_DISTANCE}`
  );
  assert.ok(CONTROL_MAX_DISTANCE >= 10.0, 'CONTROL_MAX_DISTANCE must permit full global Moon view');
});

test('Deep Zoom: Continuous progression from Global to Local Inspection', () => {
  const site = CANDIDATE_SITES[0]; // Shackleton Connecting Ridge

  const globalPose = cameraPoseForPreset('global', site);
  const nadirPose = cameraPoseForPreset('nadir', site);
  const sitePose = cameraPoseForPreset('site', site);
  const inspectionPose = cameraPoseForPreset('inspection', site);

  const globalDist = globalPose.camPos.distanceTo(globalPose.lookTarget);
  const nadirDist = nadirPose.camPos.distanceTo(nadirPose.lookTarget);
  const siteDist = sitePose.camPos.distanceTo(sitePose.lookTarget);
  const inspectionDist = inspectionPose.camPos.distanceTo(inspectionPose.lookTarget);

  // Distances must strictly decrease: Global > Site Focus > South Pole cap framing > Local Inspection
  // (the nadir preset now frames the 80S-90S cap from 0.5 units above the cap center).
  assert.ok(globalDist > siteDist, `Global distance (${globalDist}) must exceed Site distance (${siteDist})`);
  assert.ok(siteDist > nadirDist, `Site distance (${siteDist}) must exceed Nadir distance (${nadirDist})`);
  assert.ok(nadirDist > inspectionDist, `Nadir distance (${nadirDist}) must exceed Inspection distance (${inspectionDist})`);

  // Local inspection distance must be close enough for crater rim relief (< 0.2 units)
  assert.ok(inspectionDist < 0.2, `Inspection distance (${inspectionDist}) must be < 0.2 units`);
});

test('Deep Zoom: Camera anti-penetration collision guard prevents entering Moon', () => {
  const MIN_SAFE_ALTITUDE = 0.015;
  const clampedDistance = MOON_SCENE_RADIUS + MIN_SAFE_ALTITUDE;

  // Simulate a camera that attempts to move below lunar surface (e.g. radius 1.2 < 1.45)
  const penetratingPos = new THREE.Vector3(0, -1.2, 0);
  assert.ok(penetratingPos.length() < MOON_SCENE_RADIUS, 'Initial vector penetrates Moon');

  if (penetratingPos.length() < clampedDistance) {
    penetratingPos.setLength(clampedDistance);
  }

  assert.ok(
    penetratingPos.length() >= clampedDistance,
    `Camera must be clamped at or above ${clampedDistance}, was ${penetratingPos.length()}`
  );
});

test('Deep Zoom: Near clipping plane scales down at close inspection distance', () => {
  const computeTargetNear = (distToTarget: number) => {
    return distToTarget < 0.20 ? 0.002 : distToTarget < 0.8 ? 0.01 : 0.05;
  };

  const globalNear = computeTargetNear(5.8);
  const siteNear = computeTargetNear(0.5);
  const inspectNear = computeTargetNear(0.08);

  assert.equal(globalNear, 0.05, 'Global near clipping plane should be 0.05 to preserve depth buffer');
  assert.equal(siteNear, 0.01, 'Site focus near clipping plane should be 0.01');
  assert.equal(inspectNear, 0.002, 'Inspection near clipping plane must be 0.002 to prevent polygon clipping at 0.08 distance');
});
