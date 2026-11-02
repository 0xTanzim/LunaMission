import test from 'node:test';
import assert from 'node:assert/strict';
import { latLonToVector3, MOON_SCENE_RADIUS } from '../scene/globeScene';

test('latLonToVector3: North and South pole positions', () => {
  const northPole = latLonToVector3(90, 0, MOON_SCENE_RADIUS);
  assert.ok(Math.abs(northPole.x) < 1e-6);
  assert.ok(Math.abs(northPole.y - MOON_SCENE_RADIUS) < 1e-6);
  assert.ok(Math.abs(northPole.z) < 1e-6);

  const southPole = latLonToVector3(-90, 0, MOON_SCENE_RADIUS);
  assert.ok(Math.abs(southPole.x) < 1e-6);
  assert.ok(Math.abs(southPole.y - (-MOON_SCENE_RADIUS)) < 1e-6);
  assert.ok(Math.abs(southPole.z) < 1e-6);
});

test('latLonToVector3: Equator and cardinal longitudes', () => {
  // Prime meridian (0° lon) faces Earth (+Z)
  const primeMeridian = latLonToVector3(0, 0, MOON_SCENE_RADIUS);
  assert.ok(Math.abs(primeMeridian.x) < 1e-6);
  assert.ok(Math.abs(primeMeridian.y) < 1e-6);
  assert.ok(Math.abs(primeMeridian.z - MOON_SCENE_RADIUS) < 1e-6);

  // 90° East longitude (+X)
  const east90 = latLonToVector3(0, 90, MOON_SCENE_RADIUS);
  assert.ok(Math.abs(east90.x - MOON_SCENE_RADIUS) < 1e-6);
  assert.ok(Math.abs(east90.y) < 1e-6);
  assert.ok(Math.abs(east90.z) < 1e-6);

  // 180° Far side (-Z)
  const farSide = latLonToVector3(0, 180, MOON_SCENE_RADIUS);
  assert.ok(Math.abs(farSide.x) < 1e-6);
  assert.ok(Math.abs(farSide.y) < 1e-6);
  assert.ok(Math.abs(farSide.z - (-MOON_SCENE_RADIUS)) < 1e-6);
});

test('latLonToVector3: South Pole candidate latitudes are close to -Y pole', () => {
  // Shackleton Ridge at ~89.7°S
  const candidatePos = latLonToVector3(-89.7, 120, MOON_SCENE_RADIUS);
  assert.ok(candidatePos.y < -1.44); // Very close to -1.45 (-Y south pole)
  assert.ok(Math.abs(candidatePos.length() - MOON_SCENE_RADIUS) < 1e-6);
});
