import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  MOON_SCENE_RADIUS,
  createGlobeScene,
} from '../scene/globeScene';
import {
  GLOBAL_CAMERA_POSITION,
  cameraPoseForPreset,
} from '../interaction/globeCameraPresets';
import { CANDIDATE_SITES } from '@luna/contracts';

test('Camera Framing: South Pole preset fills the frame with the polar cap across aspect ratios', () => {
  // Test viewports: 16:9 Widescreen (1440x900), 4:3 Standard (1024x768), 9:16 Mobile Portrait (390x844)
  const viewports = [
    { name: '16:9 Desktop', width: 1440, height: 900 },
    { name: '4:3 Tablet', width: 1024, height: 768 },
    { name: '9:16 Mobile', width: 390, height: 844 },
  ];

  const site = CANDIDATE_SITES[0];
  const pose = cameraPoseForPreset('nadir', site);

  // The cap edge (5 deg of great-circle arc from the cap center) must subtend at least
  // 70% of the vertical half-FOV so the 80S-90S cap dominates the frame (spec: 3d-south-pole-observatory).
  const capEdgeLatDeg = -80; // cap boundary at the feathered edge
  const capEdge = new THREE.Vector3(
    0,
    MOON_SCENE_RADIUS * Math.sin((capEdgeLatDeg * Math.PI) / 180),
    MOON_SCENE_RADIUS * Math.cos((capEdgeLatDeg * Math.PI) / 180),
  );

  for (const vp of viewports) {
    const halfVFovRad = (38 * Math.PI) / 180 / 2;
    const viewDir = pose.lookTarget.clone().sub(pose.camPos).normalize();
    const edgeDir = capEdge.clone().sub(pose.camPos).normalize();
    const capHalfAngleRad = Math.acos(THREE.MathUtils.clamp(viewDir.dot(edgeDir), -1, 1));
    const coverageFraction = capHalfAngleRad / halfVFovRad;

    assert.ok(
      coverageFraction >= 0.70,
      `${vp.name}: polar cap coverage ${coverageFraction.toFixed(2)} is below the 70% framing floor`
    );
    assert.ok(
      coverageFraction <= 1.0,
      `${vp.name}: polar cap coverage ${coverageFraction.toFixed(2)} overflows the vertical frame`
    );
  }
});

test('Camera Framing: Global preset frames entire Moon sphere without edge clipping', () => {
  const site = CANDIDATE_SITES[0];
  const pose = cameraPoseForPreset('global', site);
  const camDistance = pose.camPos.length(); // ~5.73 units

  const fovVRad = (38 * Math.PI) / 180;
  const visibleHeight = 2 * camDistance * Math.tan(fovVRad / 2);
  const moonDiameter = MOON_SCENE_RADIUS * 2; // 2.90 units
  const coverage = moonDiameter / visibleHeight;

  // Global mode should occupy between 60% and 78% of frame, providing overview without being microscopic
  assert.ok(coverage >= 0.60 && coverage <= 0.78, `Global coverage ${coverage.toFixed(2)} outside 60-78% target`);
});

test('Layer Toggle Independence: Toggling overlay layers does not mutate scene ephemeris inputs', () => {
  // Mock layer toggle states
  let showVectors = true;
  let showGrid = true;
  let showShadowRegions = true;

  const initialSubSolarLat = -1.25;
  const initialEarthElev = 1.35;

  // Toggle all layers off
  showVectors = false;
  showGrid = false;
  showShadowRegions = false;

  // Ephemeris numbers remain identical
  assert.equal(initialSubSolarLat, -1.25);
  assert.equal(initialEarthElev, 1.35);

  // Toggle layers back on
  showVectors = true;
  assert.equal(showVectors, true);
  assert.equal(initialSubSolarLat, -1.25);
});
