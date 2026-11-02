import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { cameraPoseForPreset } from '../interaction/globeCameraPresets';
import { CANDIDATE_SITES } from '@luna/contracts';

test('Camera Orbit Stability: Polar nadir view aligns upVector with prime meridian (+Z)', () => {
  const site = CANDIDATE_SITES[0];
  const pose = cameraPoseForPreset('nadir', site);

  // When looking along -Y (South Pole), setting upVector to (0, 0, 1) ensures
  // the view vector (0, 1, 0) and up vector (0, 0, 1) are perpendicular (dot product 0)
  const viewDir = pose.lookTarget.clone().sub(pose.camPos).normalize();
  const dot = Math.abs(viewDir.dot(pose.upVector));
  assert.ok(dot < 0.05, `View direction and upVector must be near perpendicular to avoid gimbal lock, got dot=${dot}`);
});

test('Camera Orbit Stability: Spherical coordinates with (0,0,1) up places South Pole at phi = pi/2', () => {
  // If up is (0, 0, 1), the quaternion aligning up with world Y=(0, 1, 0) transforms (0, -1, 0) into (0, 0, -1) or (1, 0, 0)
  // which is in the x-z plane where phi = pi/2 (maximum sin(phi) = 1.0, maximum orbit rotation responsiveness).
  const up = new THREE.Vector3(0, 0, 1);
  const quat = new THREE.Quaternion().setFromUnitVectors(up, new THREE.Vector3(0, 1, 0));

  const southPoleOffset = new THREE.Vector3(0, -3.0, 0);
  southPoleOffset.applyQuaternion(quat);

  const radius = southPoleOffset.length();
  const phi = Math.acos(Math.max(-1, Math.min(1, southPoleOffset.y / radius)));

  // phi should be pi/2 (90 degrees), where sin(phi) = 1
  const sinPhi = Math.sin(phi);
  assert.ok(
    Math.abs(sinPhi - 1.0) < 0.05,
    `sin(phi) at South Pole must be ~1.0 for full orbit responsiveness without locking, got ${sinPhi}`
  );
});

test('Camera Orbit Stability: Target switches deterministically between candidate sites', () => {
  const site1 = CANDIDATE_SITES[0]; // Shackleton
  const site2 = CANDIDATE_SITES[5]; // Malapert Mountain

  const pose1 = cameraPoseForPreset('site', site1);
  const pose2 = cameraPoseForPreset('site', site2);

  assert.notDeepEqual(pose1.lookTarget, pose2.lookTarget);
  // Both targets must sit directly on the lunar surface
  assert.ok(Math.abs(pose1.lookTarget.length() - 1.45) < 0.01);
  assert.ok(Math.abs(pose2.lookTarget.length() - 1.45) < 0.01);

  // Both poses must maintain finite coordinates
  assert.ok(Number.isFinite(pose1.camPos.x) && Number.isFinite(pose1.camPos.y) && Number.isFinite(pose1.camPos.z));
  assert.ok(Number.isFinite(pose2.camPos.x) && Number.isFinite(pose2.camPos.y) && Number.isFinite(pose2.camPos.z));
});
