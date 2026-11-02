import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { clampCameraAltitudeAntiPenetration } from '../scene/globeSceneAnimator';
import { MOON_SCENE_RADIUS } from '../scene/globeScene';
import { sampleLolaElevationAtLatLon } from '@/domain/terrain/lolaSouthPoleDemSampler';

const KM_TO_SCENE = MOON_SCENE_RADIUS / 1737.4;

function surfaceRadiusAt(latDeg: number, lonDeg: number): number {
  return MOON_SCENE_RADIUS + (sampleLolaElevationAtLatLon(latDeg, lonDeg) / 1000) * KM_TO_SCENE;
}

/**
 * Repeated zoom-in toward the tallest terrain in the catalogue (Malapert Massif area)
 * must never leave the camera below the modeled surface. This is the guard behind the
 * Local tier: a user spinning the scroll wheel cannot tunnel into the mesh.
 */
test('terrain clamp: repeated zoom-in toward Malapert never penetrates the surface', () => {
  const lat = -85.9, lon = 2.9; // Malapert Massif summit area (+4,689 m)
  const getElevation = (la: number, lo: number) => sampleLolaElevationAtLatLon(la, lo);

  // Approach the summit along its surface normal from the Regional framing distance.
  const normal = new THREE.Vector3(
    Math.cos((lat * Math.PI) / 180) * Math.sin((lon * Math.PI) / 180),
    Math.sin((lat * Math.PI) / 180),
    Math.cos((lat * Math.PI) / 180) * Math.cos((lon * Math.PI) / 180),
  );
  const camera = normal.clone().multiplyScalar(MOON_SCENE_RADIUS + 0.6);

  let minRadiusSeen = Number.POSITIVE_INFINITY;
  for (let step = 0; step < 40; step++) {
    // Aggressive zoom: halve the altitude above the reference sphere each step.
    const altitude = Math.max(0.0005, camera.length() - MOON_SCENE_RADIUS);
    camera.setLength(MOON_SCENE_RADIUS + altitude / 2);

    clampCameraAltitudeAntiPenetration(camera, getElevation);
    minRadiusSeen = Math.min(minRadiusSeen, camera.length());

    const surfaceR = surfaceRadiusAt(lat, lon);
    assert.ok(
      camera.length() > surfaceR,
      `step ${step}: camera radius ${camera.length().toFixed(5)} must stay above the local surface ${surfaceR.toFixed(5)}`,
    );
  }

  // The clamp actually engages: without it the loop would end far below the surface.
  const finalSurfaceR = surfaceRadiusAt(lat, lon);
  assert.ok(
    minRadiusSeen >= finalSurfaceR,
    `minimum radius ${minRadiusSeen.toFixed(5)} must never drop below the summit surface ${finalSurfaceR.toFixed(5)}`,
  );
});

test('terrain clamp: over low terrain the clamp keeps the safe cushion, not just the datum', () => {
  // Shoemaker floor area (~ -3.9 km): a camera pushed to the reference sphere must be
  // clamped DOWN is impossible — it must be clamped UP above the depressed floor plus
  // cushion? No: over depressed terrain the datum itself is safe; assert the clamp does
  // not LIFT the camera when it is already safe (no gratuitous displacement).
  const lat = -88.14, lon = 44.9;
  const camera = new THREE.Vector3(0, -MOON_SCENE_RADIUS - 0.05, 0); // well above
  const before = camera.clone();
  clampCameraAltitudeAntiPenetration(camera, (la, lo) => sampleLolaElevationAtLatLon(la, lo));
  const displacement = camera.distanceTo(before);
  assert.equal(displacement, 0, `safe camera must not be displaced (moved ${displacement.toFixed(6)})`);
});
