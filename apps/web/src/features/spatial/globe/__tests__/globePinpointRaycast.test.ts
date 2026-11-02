import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { latLonToVector3, MOON_SCENE_RADIUS } from '../scene/globeScene';
import {
  createCustomTargetBeacon,
  raycastMoonSurface,
  vector3ToLatLon,
} from '../scene/globePinpoint';

test('Globe Pinpoint: accurately inverts latLonToVector3 across south-polar coordinates', () => {
  const testCases = [
    { lat: -90.0, lon: 0.0 },
    { lat: -89.5, lon: 45.0 },
    { lat: -85.2, lon: 180.0 },
    { lat: -80.0, lon: 270.0 },
    { lat: -75.4, lon: 315.5 },
  ];

  for (const { lat, lon } of testCases) {
    const vec = latLonToVector3(lat, lon, MOON_SCENE_RADIUS);
    const inverted = vector3ToLatLon(vec);

    assert.ok(Math.abs(inverted.latitudeDeg - lat) < 0.001);
    assert.ok(Math.abs(inverted.longitudeDeg - lon) < 0.001);
  }
});

test('Globe Pinpoint: handles negative longitudes and normalizes to [0, 360)', () => {
  const vec = latLonToVector3(-85.0, 315.0, MOON_SCENE_RADIUS);
  const inverted = vector3ToLatLon(vec);
  assert.ok(Math.abs(inverted.longitudeDeg - 315.0) < 0.001);
});

test('Globe Pinpoint: raycasts against moon sphere geometry and returns valid Selenographic hit', () => {
  const moonGeometry = new THREE.SphereGeometry(MOON_SCENE_RADIUS, 32, 32);
  const moonMesh = new THREE.Mesh(moonGeometry);

  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(0, 0, -5),
    new THREE.Vector3(0, 0, 1),
  );

  const hit = raycastMoonSurface(raycaster, moonMesh);
  assert.ok(hit !== null);
  if (hit) {
    assert.ok(Math.abs(hit.point.z - -MOON_SCENE_RADIUS) < 0.01);
    assert.ok(Math.abs(hit.latDeg - 0.0) < 0.1);
    assert.ok(Math.abs(hit.lonDeg - 180.0) < 0.1);
  }
});

test('Globe Pinpoint: creates an aerospace-grade pulsating beacon for custom landing targets', () => {
  const beacon = createCustomTargetBeacon({
    id: 'custom-beacon-test',
    name: 'Alpha Beacon',
    latitudeDeg: -88.5,
    longitudeDeg: 120.0,
    elevationKm: -1.2,
    createdAt: 1000,
  });

  assert.ok(beacon instanceof THREE.Group);
  assert.equal(beacon.userData.targetId, 'custom-beacon-test');
  assert.ok(beacon.children.length >= 2);
});
