import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CandidateSite } from '@luna/contracts';
import {
  createSiteMarkers,
  computeElevationAwareMarkerRadius,
  applyMarkerHorizonOcclusion,
  updateSiteMarkerSelection,
  LUNAR_RADIUS_METERS,
  STALK_LIFT,
  STALK_HEIGHT,
} from '@/features/spatial/globe/scene/globeSiteMarkers';
import { MOON_SCENE_RADIUS, latLonToVector3 } from '@/features/spatial/globe/scene/globeScene';
import { createCraterFeatures } from '@/features/spatial/globe/components/globeCraterFeatures';
import {
  LabelDeclutterManager,
  projectLabelRect,
} from '@/features/spatial/globe/scene/globeLabelDeclutter';

/** Nadir camera over the south pole matching the animator's framing for these scenes. */
function makeNadirCamera(camPos: THREE.Vector3, targetPos: THREE.Vector3): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(38, 1280 / 720, 0.001, 100);
  camera.position.copy(camPos);
  camera.up.set(0, 0.08716, 0.99619);
  camera.lookAt(targetPos);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  return camera;
}

function makeDeclutterParams(
  camera: THREE.PerspectiveCamera,
  badgePositions: THREE.Vector3[],
  distToTarget: number,
  showLabels = true,
  viewportWidth = 1280,
  viewportHeight = 720,
) {
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

test('CHALLENGE 1: Extreme Elevation Tracking (Depression Floors vs Massif Summits)', () => {
  // Scenario A: Extreme depression - Shoemaker crater floor (-3,927 m)
  const shoemakerDepressionElev = -3927.0;
  const shoemakerRadius = computeElevationAwareMarkerRadius(shoemakerDepressionElev);
  const expectedShoemakerRadius = MOON_SCENE_RADIUS * (1.0 + shoemakerDepressionElev / LUNAR_RADIUS_METERS) + STALK_LIFT;
  assert.ok(Math.abs(shoemakerRadius - expectedShoemakerRadius) < 1e-7, 'Shoemaker depression radius exact');
  assert.ok(shoemakerRadius < MOON_SCENE_RADIUS, 'Shoemaker depression marker sits below reference sphere');
  
  // Back-calculate physical elevation from scene radius
  const reconstructedElevShoemaker = ((shoemakerRadius - STALK_LIFT - MOON_SCENE_RADIUS) / MOON_SCENE_RADIUS) * LUNAR_RADIUS_METERS;
  assert.ok(Math.abs(reconstructedElevShoemaker - shoemakerDepressionElev) < 1e-4, 'Physical elevation reconstructed accurately');

  // Verify baseline flaw eliminated:
  // Baseline static placement: 1.45 * 1.002 = 1.4529
  const baselineStaticRadius = 1.4529;
  const baselineErrorMetersShoemaker = ((baselineStaticRadius - shoemakerRadius) / MOON_SCENE_RADIUS) * LUNAR_RADIUS_METERS;
  assert.ok(baselineErrorMetersShoemaker > 6600, 'Baseline was floating > 6.6 km above crater floor');

  // Scenario B: Extreme peak - Malapert Massif ridge summit (+4,689 m)
  const malapertSummitElev = 4689.0;
  const malapertRadius = computeElevationAwareMarkerRadius(malapertSummitElev);
  const expectedMalapertRadius = MOON_SCENE_RADIUS * (1.0 + malapertSummitElev / LUNAR_RADIUS_METERS) + STALK_LIFT;
  assert.ok(Math.abs(malapertRadius - expectedMalapertRadius) < 1e-7, 'Malapert summit radius exact');
  assert.ok(malapertRadius > MOON_SCENE_RADIUS + 0.0035, 'Malapert summit sits elevated above reference sphere');

  // Verify baseline flaw eliminated:
  const baselineErrorMetersMalapert = ((malapertRadius - baselineStaticRadius) / MOON_SCENE_RADIUS) * LUNAR_RADIUS_METERS;
  assert.ok(baselineErrorMetersMalapert > 1400, 'Baseline was buried > 1.4 km inside mountain rock');

  // Scenario C: Deep South Pole-Aitken depression floor (-9,000 m)
  const extremeDepressionRadius = computeElevationAwareMarkerRadius(-9000);
  assert.ok(extremeDepressionRadius > 1.435, 'Extreme -9km depression maintains valid positive scene radius');
  assert.ok(extremeDepressionRadius < shoemakerRadius, 'Monotonically lower than -3927m');

  // Scenario D: High peak (+8,000 m)
  const extremePeakRadius = computeElevationAwareMarkerRadius(8000);
  assert.ok(extremePeakRadius > malapertRadius, 'Monotonically higher than +4689m');
});

test('CHALLENGE 2: Ring and Stalk Co-location & Flush Terrain Seating Across All Sites', () => {
  // Test with custom dynamic sites covering extreme topologies
  const testSites: CandidateSite[] = [
    {
      id: 'shoemaker-floor-test',
      code: 'TEST-DEPR',
      name: 'Shoemaker Crater Floor',
      priority: 'PSR Target',
      category: 'polar-benchmark',
      coordinates: { latitudeDeg: -88.14, longitudeDeg: 44.9, elevationMeters: -3927 },
      description: 'Test deep depression floor',
    },
    {
      id: 'malapert-peak-test',
      code: 'TEST-PEAK',
      name: 'Malapert Massif Peak',
      priority: 'Artemis Candidate',
      category: 'artemis-2024',
      coordinates: { latitudeDeg: -85.90, longitudeDeg: 2.9, elevationMeters: 4689 },
      description: 'Test high massif peak',
    },
  ];

  const { markers } = createSiteMarkers('shoemaker-floor-test', testSites);
  const deprMarker = markers.get('shoemaker-floor-test')!;
  const peakMarker = markers.get('malapert-peak-test')!;

  assert.ok(deprMarker, 'Depression marker created');
  assert.ok(peakMarker, 'Peak marker created');

  // Ring geometry checks:
  assert.ok(Math.abs(deprMarker.ring.position.length() - deprMarker.surfacePos.length()) < 1e-6, 'Ring sits exactly at surfacePos');
  assert.ok(Math.abs(peakMarker.ring.position.length() - peakMarker.surfacePos.length()) < 1e-6, 'Ring sits exactly at surfacePos');

  // Stalk orientation checks:
  // Stalk line geometry points must be [surfacePos, beaconPos]
  const stalkGeo = deprMarker.stalk.geometry;
  const posAttr = stalkGeo.attributes.position;
  assert.equal(posAttr.count, 2, 'Stalk has 2 vertices');
  const v0 = new THREE.Vector3(posAttr.getX(0), posAttr.getY(0), posAttr.getZ(0));
  const v1 = new THREE.Vector3(posAttr.getX(1), posAttr.getY(1), posAttr.getZ(1));

  assert.ok(v0.distanceTo(deprMarker.surfacePos) < 1e-5, 'Stalk starts flush at surfacePos');
  const delta = v1.clone().sub(v0);
  assert.ok(Math.abs(delta.length() - STALK_HEIGHT) < 1e-5, 'Stalk height matches STALK_HEIGHT');
  assert.ok(Math.abs(delta.normalize().dot(deprMarker.normal) - 1.0) < 1e-5, 'Stalk extends radially along normal');

  // Zero-Burying & Zero-Floating Invariant:
  // Ring radius must be exactly MOON_SCENE_RADIUS * (1.0 + elev / LUNAR_RADIUS) + STALK_LIFT
  // STALK_LIFT (+0.0006) provides anti-Z-fighting cushion while maintaining flush seating
  const deprTargetR = MOON_SCENE_RADIUS * (1.0 - 3927.0 / LUNAR_RADIUS_METERS) + STALK_LIFT;
  assert.ok(Math.abs(deprMarker.surfacePos.length() - deprTargetR) < 1e-5, 'Depression ring sits flush without burying');

  const peakTargetR = MOON_SCENE_RADIUS * (1.0 + 4689.0 / LUNAR_RADIUS_METERS) + STALK_LIFT;
  assert.ok(Math.abs(peakMarker.surfacePos.length() - peakTargetR) < 1e-5, 'Peak ring sits flush without burying');
});

test('CHALLENGE 3: Label Collision Suppression Across ALL Overlapping Candidate Sites', () => {
  const craterFeatures = createCraterFeatures();
  const camPos = new THREE.Vector3(0, -3.2, 0); // Nadir viewing
  const targetPos = new THREE.Vector3(0, -1.45, 0);
  const camera = makeNadirCamera(camPos, targetPos);
  const scratch = new THREE.Vector3();

  // Test Case A: Shackleton Crater Rim (-89.9°, 0°)
  {
    const { markers } = createSiteMarkers('shackleton-rim');
    const activeBadgePositions = applyMarkerHorizonOcclusion(
      markers, camPos, targetPos, 'shackleton-rim', scratch, { showMarkers: true, showLabels: true },
    );
    assert.equal(activeBadgePositions.length, 1, 'Only selected candidate badge is active');

    craterFeatures.updateLabelsDeclutter(makeDeclutterParams(camera, activeBadgePositions, 1.5));

    const shackletonCrater = craterFeatures.labelsGroup.children.find(
      (c) => c instanceof THREE.Sprite && (c as any).name === 'Shackleton' || c.position.distanceTo(activeBadgePositions[0]) < 0.05
    ) as THREE.Sprite;
    assert.ok(shackletonCrater, 'Shackleton crater billboard found');
    assert.equal(shackletonCrater.visible, false, 'Shackleton crater billboard suppressed when candidate site badge active');
  }

  // Test Case B: Haworth Crater Rim (-87.4°, 355°)
  {
    const { markers } = createSiteMarkers('haworth-rim');
    const activeBadgePositions = applyMarkerHorizonOcclusion(
      markers, camPos, targetPos, 'haworth-rim', scratch, { showMarkers: true, showLabels: true },
    );
    assert.equal(activeBadgePositions.length, 1);
    craterFeatures.updateLabelsDeclutter(makeDeclutterParams(camera, activeBadgePositions, 1.5));

    const haworthCrater = craterFeatures.labelsGroup.children.find(
      (c) => c instanceof THREE.Sprite && c.position.distanceTo(activeBadgePositions[0]) < 0.05
    ) as THREE.Sprite;
    assert.ok(haworthCrater, 'Haworth crater billboard found');
    assert.equal(haworthCrater.visible, false, 'Haworth crater billboard suppressed when haworth-rim candidate selected');
  }

  // Test Case C: Amundsen Crater Rim (-84.5°, 82.8°)
  {
    const { markers } = createSiteMarkers('amundsen-rim');
    const activeBadgePositions = applyMarkerHorizonOcclusion(
      markers, camPos, targetPos, 'amundsen-rim', scratch, { showMarkers: true, showLabels: true },
    );
    assert.equal(activeBadgePositions.length, 1);
    craterFeatures.updateLabelsDeclutter(makeDeclutterParams(camera, activeBadgePositions, 1.5));

    const amundsenCrater = craterFeatures.labelsGroup.children.find(
      (c) => c instanceof THREE.Sprite && c.position.distanceTo(activeBadgePositions[0]) < 0.05
    ) as THREE.Sprite;
    assert.ok(amundsenCrater, 'Amundsen crater billboard found');
    assert.equal(amundsenCrater.visible, false, 'Amundsen crater billboard suppressed when amundsen-rim candidate selected');

    // Meanwhile, a distant NON-COLLIDING crater billboard must be visible. Malapert
    // (-84.9, 12.9) is the only nomenclature whose world-size label rect clears every
    // other label at this framing — pole-hugging labels (Shackleton/de Gerlache/
    // Shoemaker) genuinely overlap each other, so declutter keeps only the winner.
    const malapertPos = latLonToVector3(-84.9, 12.9, MOON_SCENE_RADIUS + 0.018);
    const malapertCrater = craterFeatures.labelsGroup.children.find(
      (c) => c instanceof THREE.Sprite && c.position.distanceTo(malapertPos) < 0.04
    ) as THREE.Sprite;
    assert.ok(malapertCrater, 'Malapert crater billboard found');
    assert.equal(malapertCrater.visible, true, 'Distant non-colliding crater billboard remains visible');
  }

  craterFeatures.dispose();
});

test('CHALLENGE 4: Collision Suppression Is Screen-Space Overlap & Zoom Gating', () => {
  const craterFeatures = createCraterFeatures();
  const camPos = new THREE.Vector3(0, -3.2, 0);
  const targetPos = new THREE.Vector3(0, -1.45, 0);
  const camera = makeNadirCamera(camPos, targetPos);

  // Crater at Malapert (-84.9°, 12.9°): the isolated nomenclature whose world-size
  // label rect overlaps no other crater label at this framing, so suppression can
  // only come from the injected site badge.
  const craterCenter = latLonToVector3(-84.9, 12.9, MOON_SCENE_RADIUS);
  const normal = craterCenter.clone().normalize();
  const craterBillboardPos = craterCenter.clone().add(normal.clone().multiplyScalar(0.018));
  const targetCraterSprite = craterFeatures.labelsGroup.children.find(
    (c) => c instanceof THREE.Sprite && c.position.distanceTo(craterBillboardPos) < 0.001
  ) as THREE.Sprite;
  assert.ok(targetCraterSprite, 'Target crater sprite found');

  // Case 1: a site badge whose screen rect covers the crater label's screen slot -> MUST SUPPRESS
  const craterRect = projectLabelRect(craterBillboardPos, camera, 1280, 720);
  const coveringBadge = {
    screenX: craterRect.screenX + 20,
    screenY: craterRect.screenY + 4,
    halfWidth: craterRect.halfWidth,
    halfHeight: craterRect.halfHeight,
  };
  craterFeatures.updateLabelsDeclutter({
    camera, viewportWidth: 1280, viewportHeight: 720, distToTarget: 1.2, showLabels: true,
    badgeScreenRects: [coveringBadge], manager: new LabelDeclutterManager(),
  });
  assert.equal(targetCraterSprite.visible, false, 'Badge whose screen rect covers the crater label must suppress it');

  // Case 2: a site badge parked far away on screen -> MUST NOT SUPPRESS
  craterFeatures.updateLabelsDeclutter({
    camera, viewportWidth: 1280, viewportHeight: 720, distToTarget: 1.2, showLabels: true,
    badgeScreenRects: [{ ...craterRect, screenX: craterRect.screenX + 300 }],
    manager: new LabelDeclutterManager(),
  });
  assert.equal(targetCraterSprite.visible, true, 'Badge far from the crater label on screen must NOT suppress it');

  // Case 3: Deep zoom boundary: distToTarget < 0.40
  craterFeatures.updateLabelsDeclutter(makeDeclutterParams(camera, [], 0.399));
  let visibleCountClose = 0;
  craterFeatures.labelsGroup.traverse((c) => {
    if (c instanceof THREE.Sprite && c.visible) visibleCountClose++;
  });
  assert.equal(visibleCountClose, 0, 'At distToTarget = 0.399, all crater billboards must be culled');

  craterFeatures.updateLabelsDeclutter(makeDeclutterParams(camera, [], 0.401));
  let visibleCountFar = 0;
  craterFeatures.labelsGroup.traverse((c) => {
    if (c instanceof THREE.Sprite && c.visible) visibleCountFar++;
  });
  assert.ok(visibleCountFar > 0, 'At distToTarget = 0.401, crater billboards are visible');

  // Case 4: showLabels = false
  craterFeatures.updateLabelsDeclutter(makeDeclutterParams(camera, [], 1.2, false));
  let visibleCountNoLabels = 0;
  craterFeatures.labelsGroup.traverse((c) => {
    if (c instanceof THREE.Sprite && c.visible) visibleCountNoLabels++;
  });
  assert.equal(visibleCountNoLabels, 0, 'When showLabels = false, all crater billboards are hidden');

  craterFeatures.dispose();
});

test('CHALLENGE 5: Selection State Transitions & Dynamic Re-anchoring', () => {
  const { markers } = createSiteMarkers('shackleton-rim');
  const camPos = new THREE.Vector3(0, -3.2, 0);
  const targetPos = new THREE.Vector3(0, -1.45, 0);
  const scratch = new THREE.Vector3();

  // Initially Shackleton is selected
  let badges = applyMarkerHorizonOcclusion(markers, camPos, targetPos, 'shackleton-rim', scratch, { showMarkers: true, showLabels: true });
  assert.equal(badges.length, 1);
  const shackletonMarker = markers.get('shackleton-rim')!;
  assert.equal(shackletonMarker.badge.visible, true);
  const malapertMarker = markers.get('malapert-massif')!;
  assert.equal(malapertMarker.badge.visible, false);

  // Transition selection to malapert-massif
  updateSiteMarkerSelection(markers, 'malapert-massif');
  badges = applyMarkerHorizonOcclusion(markers, camPos, targetPos, 'malapert-massif', scratch, { showMarkers: true, showLabels: true });
  assert.equal(badges.length, 1);
  assert.equal(markers.get('shackleton-rim')!.badge.visible, false, 'Previous badge hidden');
  assert.equal(markers.get('malapert-massif')!.badge.visible, true, 'New badge visible');

  // Verify new badge position corresponds to Malapert elevated position (+5100m in catalog)
  const malapertExpectedR = computeElevationAwareMarkerRadius(5100);
  const malapertSurfaceR = markers.get('malapert-massif')!.surfacePos.length();
  assert.ok(Math.abs(malapertSurfaceR - malapertExpectedR) < 1e-5, 'Malapert surface position maintains elevated radius');
});
