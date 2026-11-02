import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  createSiteMarkers,
  computeElevationAwareMarkerRadius,
  applyMarkerHorizonOcclusion,
  LUNAR_RADIUS_METERS,
  STALK_LIFT,
} from '@/features/spatial/globe/scene/globeSiteMarkers';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';
import { createCraterFeatures } from '@/features/spatial/globe/components/globeCraterFeatures';

import { LabelDeclutterManager, projectLabelRect } from '@/features/spatial/globe/scene/globeLabelDeclutter';

/** Builds screen-space declutter params from a nadir-style camera and 3D badge positions. */
function makeDeclutterParams(
  camPos: THREE.Vector3,
  targetPos: THREE.Vector3,
  badgePositions: THREE.Vector3[],
  distToTarget: number,
  showLabels = true,
) {
  const camera = new THREE.PerspectiveCamera(38, 1280 / 720, 0.001, 100);
  camera.position.copy(camPos);
  camera.up.set(0, 0.08716, 0.99619);
  camera.lookAt(targetPos);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  const viewportWidth = 1280;
  const viewportHeight = 720;
  return {
    camera,
    viewportWidth,
    viewportHeight,
    distToTarget,
    showLabels,
    badgeScreenRects: badgePositions.map((pos) => projectLabelRect(pos, camera, viewportWidth, viewportHeight)),
    manager: new LabelDeclutterManager(),
  };
}


test('Elevation-Aware Site Markers: Computes correct radial displacement from LOLA elevation', () => {
  // Test Shackleton Rim (+4,250 m)
  const shackletonSite = CANDIDATE_SITES.find((s) => s.id === 'shackleton-rim')!;
  assert.ok(shackletonSite, 'Shackleton site exists in catalog');
  const shackletonElev = shackletonSite.coordinates.elevationMeters ?? 4250;
  const expectedRadius = MOON_SCENE_RADIUS * (1.0 + shackletonElev / LUNAR_RADIUS_METERS) + STALK_LIFT;
  const computedRadius = computeElevationAwareMarkerRadius(shackletonElev);
  assert.ok(Math.abs(computedRadius - expectedRadius) < 1e-6);

  // Test Malapert Massif (+5,080 m)
  const malapertSite = CANDIDATE_SITES.find((s) => s.id === 'malapert-massif')!;
  const malapertElev = malapertSite.coordinates.elevationMeters ?? 5080;
  const malapertRadius = computeElevationAwareMarkerRadius(malapertElev);
  assert.ok(malapertRadius > 1.4548, 'Malapert Massif marker must sit elevated above reference sphere');

  // Test Negative Elevation / Depression Floor (-4,000 m)
  const negativeRadius = computeElevationAwareMarkerRadius(-4000);
  assert.ok(negativeRadius < 1.448, 'Negative elevation marker must descend flush into depression floor');

  // Verify markers layer instantiates with elevation-displaced surface positions
  const { markers } = createSiteMarkers('shackleton-rim');
  const shackletonMarker = markers.get('shackleton-rim')!;
  assert.ok(shackletonMarker, 'Shackleton marker instantiated');
  assert.ok(Math.abs(shackletonMarker.surfacePos.length() - expectedRadius) < 1e-4);
});

test('Label Decluttering: Candidate site badges take precedence and suppress colliding crater nomenclature', () => {
  const craterFeatures = createCraterFeatures();
  const shackletonSite = CANDIDATE_SITES.find((s) => s.id === 'shackleton-rim')!;

  const { markers } = createSiteMarkers('shackleton-rim');
  const scratch = new THREE.Vector3();
  const camPos = new THREE.Vector3(0, -3.0, 0); // South-polar nadir view
  const targetPos = new THREE.Vector3(0, -1.45, 0);

  // Collect active badge positions at regional zoom
  const activeBadgePositions = applyMarkerHorizonOcclusion(
    markers,
    camPos,
    targetPos,
    'shackleton-rim',
    scratch,
    { showMarkers: true, showLabels: true },
  );

  assert.ok(activeBadgePositions.length > 0, 'Active badge position returned for selected site');

  // Apply decluttering
  const declutterParams = makeDeclutterParams(camPos, targetPos, activeBadgePositions, 1.55);
  const declutterCamera = declutterParams.camera;
  const badgeScreen = declutterParams.badgeScreenRects[0]!;
  craterFeatures.updateLabelsDeclutter(declutterParams);

  // Verify crater billboards in labelsGroup
  const billboards: { name: string; visible: boolean }[] = [];
  craterFeatures.labelsGroup.traverse((child) => {
    if (child instanceof THREE.Sprite) {
      billboards.push({ name: child.name, visible: child.visible });
    }
  });

  assert.ok(billboards.length >= 4, 'Major crater billboards exist in labelsGroup');

  // Find Shackleton billboard and Amundsen billboard
  // Shackleton crater is at (-89.9°, 0°) coinciding with shackleton-rim
  // It must be suppressed (visible === false) due to collision with the active candidate badge
  let shackletonCraterVisible = false;
  let amundsenCraterVisible = false;

  craterFeatures.labelsGroup.children.forEach((child) => {
    if (child instanceof THREE.Sprite) {
      // Check proximity to Shackleton site
      const distToShackleton = child.position.distanceTo(activeBadgePositions[0]);
      if (distToShackleton < 0.06) {
        shackletonCraterVisible = child.visible;
      } else if (distToShackleton > 0.10) {
        // Amundsen or distant crater
        if (child.visible) amundsenCraterVisible = true;
      }
    }
  });

  assert.equal(shackletonCraterVisible, false, 'Colliding crater label (Shackleton) must be suppressed');
  assert.equal(amundsenCraterVisible, true, 'Distant non-colliding crater label (Amundsen) must remain visible');

  craterFeatures.dispose();
});

test('Label Decluttering: Deep zoom (< 0.40 distance) completely culls crater nomenclature', () => {
  const craterFeatures = createCraterFeatures();
  const capCenterCam = new THREE.Vector3(0, -1.94448, 0.16997);
  const capCenterTarget = new THREE.Vector3(0, -1.44448, 0.12639);

  // At deep zoom (distToTarget = 0.25 < 0.40)
  craterFeatures.updateLabelsDeclutter(makeDeclutterParams(capCenterCam, capCenterTarget, [], 0.25));

  let anyVisible = false;
  craterFeatures.labelsGroup.traverse((child) => {
    if (child instanceof THREE.Sprite && child.visible) {
      anyVisible = true;
    }
  });

  assert.equal(anyVisible, false, 'At deep zoom (< 0.40), all crater labels must be culled');

  // At regional zoom (distToTarget = 1.20 >= 0.40)
  craterFeatures.updateLabelsDeclutter(makeDeclutterParams(capCenterCam, capCenterTarget, [], 1.20));

  let hasVisibleAtRegional = false;
  craterFeatures.labelsGroup.traverse((child) => {
    if (child instanceof THREE.Sprite && child.visible) {
      hasVisibleAtRegional = true;
    }
  });

  assert.equal(hasVisibleAtRegional, true, 'At regional zoom, crater labels must be visible');

  craterFeatures.dispose();
});
