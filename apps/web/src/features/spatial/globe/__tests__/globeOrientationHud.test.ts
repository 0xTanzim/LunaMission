import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  computeCompassHeadingDeg,
  computeGroundMetersPerPixel,
  pickScaleBarMeters,
  updateOrientationHudElements,
  type OrientationHudElements,
} from '../scene/globeOrientationHud';
import { cameraPoseForPreset } from '../interaction/globeCameraPresets';
import { CANDIDATE_SITES } from '@luna/contracts';
import { MOON_SCENE_RADIUS, latLonToVector3 } from '../scene/globeScene';

const VIEWPORT_HEIGHT = 720;
const ANY_SITE = CANDIDATE_SITES[0];

function nadirPose() {
  return cameraPoseForPreset('nadir', ANY_SITE);
}

function makeCameraFromNadirPose(): THREE.PerspectiveCamera {
  const pose = nadirPose();
  const camera = new THREE.PerspectiveCamera(38, 16 / 9, 0.001, 100);
  camera.position.copy(pose.camPos);
  camera.up.copy(pose.upVector);
  camera.lookAt(pose.lookTarget);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

test('compass heading: cap-center nadir pose with up = local north reads 0°', () => {
  const camera = makeCameraFromNadirPose();
  const pose = nadirPose();
  const heading = computeCompassHeadingDeg(camera, pose.lookTarget);
  assert.ok(Math.abs(heading) < 1, `nadir pose heading ${heading} must read ~0° (N screen-up)`);
});

test('compass heading: rolling the camera rotates the reading by the same angle', () => {
  const camera = makeCameraFromNadirPose();
  const pose = nadirPose();
  camera.rotateZ(Math.PI / 2);
  camera.updateMatrixWorld(true);
  const heading = computeCompassHeadingDeg(camera, pose.lookTarget);
  assert.ok(Math.abs(heading - 90) < 1, `after +90° camera roll the heading is ${heading}, must be 90°`);
});

test('compass heading: result is always normalized to [0, 360)', () => {
  const camera = makeCameraFromNadirPose();
  const pose = nadirPose();
  for (const roll of [0, Math.PI / 3, Math.PI, (3 * Math.PI) / 2, 2 * Math.PI + 0.3]) {
    const rolled = makeCameraFromNadirPose();
    rolled.rotateZ(roll);
    rolled.updateMatrixWorld(true);
    const heading = computeCompassHeadingDeg(rolled, pose.lookTarget);
    assert.ok(heading >= 0 && heading < 360, `heading ${heading} out of range for roll ${roll}`);
  }
});

test('compass heading: orbit with up held to the local north tangent keeps N screen-up', () => {
  // The nadir pose pins camera-up to the north tangent at the cap center, so a pure
  // azimuth orbit around that axis is a compass-aligned rotation: the reading must stay
  // ~0. (A rose that spun while circling the pole would be wrong.)
  const cameraB = makeCameraFromNadirPose();
  const pose = nadirPose();
  cameraB.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
  cameraB.up.copy(pose.upVector);
  cameraB.lookAt(pose.lookTarget);
  cameraB.updateMatrixWorld(true);
  const headingB = computeCompassHeadingDeg(cameraB, pose.lookTarget);
  assert.ok(
    Math.abs(headingB) < 1 || Math.abs(headingB - 360) < 1,
    `heading ${headingB} must stay ~0° through the orbit`,
  );
});

test('compass heading: panning to a target 45° east rotates the reading to ~45°', () => {
  // The compass must track the *viewed surface point*: aiming at a target 45° east of
  // the cap center (same latitude) turns the local north tangent 45° on screen.
  const camera = makeCameraFromNadirPose();
  const eastTarget = latLonToVector3(-85, 45, MOON_SCENE_RADIUS);
  const heading = computeCompassHeadingDeg(camera, eastTarget);
  const offFrom45 = Math.abs(((heading - 45 + 540) % 360) - 180);
  assert.ok(offFrom45 < 10, `heading at the 45°E target is ${heading}°, must read ~45°`);
});

test('compass heading: does not blow up at the exact pole (singularity guard)', () => {
  const camera = makeCameraFromNadirPose();
  const poleTarget = new THREE.Vector3(0, -MOON_SCENE_RADIUS, 0);
  const heading = computeCompassHeadingDeg(camera, poleTarget);
  assert.ok(heading >= 0 && heading < 360, `pole target heading ${heading} must be finite and in range`);
});

test('ground scale: meters per pixel grows linearly with camera distance and matches the FOV formula', () => {
  const camera = makeCameraFromNadirPose();
  const near = computeGroundMetersPerPixel(camera, VIEWPORT_HEIGHT, 0.5);
  const far = computeGroundMetersPerPixel(camera, VIEWPORT_HEIGHT, 1.0);
  assert.ok(Math.abs(far / near - 2) < 1e-9, 'doubling distance must double meters per pixel');

  // Closed-form: 2·d·tan(fov/2)/viewportHeight scene units per pixel, scaled to meters.
  const expected =
    ((2 * 0.5 * Math.tan((38 * Math.PI) / 360)) / VIEWPORT_HEIGHT) * (1_737_400 / MOON_SCENE_RADIUS);
  assert.ok(Math.abs(near - expected) < expected * 1e-9, `mpp ${near} must match closed form ${expected}`);
});

test('ground scale: picked bar is a 1-2-5 nice value whose pixel width lands in [60, 160]', () => {
  for (const distance of [0.08, 0.5, 1.2, 4.8]) {
    const mpp = computeGroundMetersPerPixel(makeCameraFromNadirPose(), VIEWPORT_HEIGHT, distance);
    const bar = pickScaleBarMeters(mpp);
    assert.ok(bar, `no bar found for distance ${distance}`);
    assert.ok(bar!.pixels >= 60 && bar!.pixels <= 160, `bar pixels ${bar!.pixels} out of band at distance ${distance}`);
    const decade = 10 ** Math.floor(Math.log10(bar!.meters));
    const mantissa = bar!.meters / decade;
    assert.ok([1, 2, 5].includes(mantissa), `bar ${bar!.meters} m is not a 1-2-5 value`);
  }
});

function makeFakeHud(): OrientationHudElements {
  return {
    compassRose: { style: { transform: '' }, setAriaLabel: (_: string) => {} },
    scaleBarLine: { style: { width: '' } },
    scaleBarLabel: { textContent: '' },
    scaleBarRegion: { setAriaLabel: (_: string) => {} },
  };
}

test('orientation HUD writer: needle rotates by the heading; scale line and label update', () => {
  const hud = makeFakeHud();
  let compassAria = '';
  hud.compassRose.setAriaLabel = (label: string) => {
    compassAria = label;
  };

  updateOrientationHudElements(hud, { headingDeg: 42, scaleMeters: 20000, scalePixels: 70 });
  assert.equal(hud.compassRose.style.transform, 'rotate(42deg)');
  assert.equal(hud.scaleBarLine.style.width, '70px');
  assert.equal(hud.scaleBarLabel.textContent, '20 km');
  assert.ok(compassAria.includes('42'), 'compass must expose its heading accessibly');

  updateOrientationHudElements(hud, { headingDeg: 0, scaleMeters: 500, scalePixels: 100 });
  assert.equal(hud.compassRose.style.transform, 'rotate(0deg)');
  assert.equal(hud.scaleBarLabel.textContent, '500 m', 'sub-kilometer bars read in meters');
});
