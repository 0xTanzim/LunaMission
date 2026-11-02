import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  createSiteMarkers,
  applyMarkerHorizonOcclusion,
  updateSiteMarkerSelection,
} from '@/features/spatial/globe/scene/globeSiteMarkers';
import { cameraPoseForPreset } from '@/features/spatial/globe/interaction/globeCameraPresets';

test('Visual Hierarchy: scale-adaptive marker behavior', () => {
  const selectedSite = CANDIDATE_SITES[0]; // Shackleton Rim
  const { markers } = createSiteMarkers(selectedSite.id);
  const scratch = new THREE.Vector3();

  // 1. Regional Scale: camera at nadir (distance 4.8)
  const nadirCam = new THREE.Vector3(0, -4.8, 0.0001);
  const nadirTarget = new THREE.Vector3(0, 0, 0);

  applyMarkerHorizonOcclusion(markers, nadirCam, nadirTarget, selectedSite.id, scratch);

  // All front-facing markers should be visible at regional scale
  let visibleCount = 0;
  markers.forEach(({ container }) => {
    if (container.visible) visibleCount += 1;
  });
  assert.ok(visibleCount >= 5, `Expected multiple candidates visible at regional scale, got ${visibleCount}`);

  // 2. Mode C: Local Inspection scale (camera distance ~0.096 to target < 0.65)
  const inspectionPose = cameraPoseForPreset('inspection', selectedSite);
  applyMarkerHorizonOcclusion(markers, inspectionPose.camPos, inspectionPose.lookTarget, selectedSite.id, scratch);

  // In Local Inspection mode, unselected candidates must be hidden to eliminate clutter
  markers.forEach(({ container, site, ring, beacon }) => {
    if (site.id === selectedSite.id) {
      assert.equal(container.visible, true, 'Selected site marker must remain visible during local inspection');
      // Scale should be scaled down (< 0.5) to remain a crisp, delicate pin rather than a giant disc
      assert.ok(ring.scale.x < 0.5, `Selected ring scale should be < 0.5 at close range, got ${ring.scale.x}`);
      assert.ok(beacon.scale.x < 0.5, `Selected beacon scale should be < 0.5 at close range, got ${beacon.scale.x}`);
    } else {
      assert.equal(container.visible, false, `Unselected candidate ${site.name} must be hidden during local inspection`);
    }
  });

  // 3. Layer Toggles: showMarkers = false hides all markers
  applyMarkerHorizonOcclusion(markers, nadirCam, nadirTarget, selectedSite.id, scratch, {
    showMarkers: false,
  });
  markers.forEach(({ container, site }) => {
    assert.equal(container.visible, false, `Marker for ${site.name} should be hidden when showMarkers is false`);
  });

  // 4. Layer Toggles: showLabels = false hides billboard badges
  applyMarkerHorizonOcclusion(markers, nadirCam, nadirTarget, selectedSite.id, scratch, {
    showMarkers: true,
    showLabels: false,
  });
  markers.forEach(({ badge, site }) => {
    assert.equal(badge.visible, false, `Badge for ${site.name} should be hidden when showLabels is false`);
  });
});

test('Exploration Scales: Distinct Camera Presets and Poses', () => {
  const site = CANDIDATE_SITES[0];

  const globalPose = cameraPoseForPreset('global', site);
  const nadirPose = cameraPoseForPreset('nadir', site);
  const overviewPose = cameraPoseForPreset('site', site);
  const inspectionPose = cameraPoseForPreset('inspection', site);

  const globalDist = globalPose.camPos.distanceTo(globalPose.lookTarget);
  const nadirDist = nadirPose.camPos.distanceTo(nadirPose.lookTarget);
  const overviewDist = overviewPose.camPos.distanceTo(overviewPose.lookTarget);
  const inspectionDist = inspectionPose.camPos.distanceTo(inspectionPose.lookTarget);

  // Strictly decreasing distance hierarchy: Global > Candidate Overview > South Pole cap
  // framing > Local Inspection (the nadir preset now frames the 80S-90S cap up close).
  assert.ok(globalDist > overviewDist, 'Global distance must exceed Candidate Overview distance');
  assert.ok(overviewDist > nadirDist, 'Candidate Overview distance must exceed South Pole cap framing');
  assert.ok(nadirDist > inspectionDist, 'South Pole cap framing must exceed Local Inspection distance');

  // Local inspection distance must be close enough for oblique crater relief (< 0.15)
  assert.ok(inspectionDist < 0.15, `Local inspection distance must be < 0.15 units, was ${inspectionDist}`);

  // Overview distance frames regional terrain (between 1.0 and 2.0 units)
  assert.ok(overviewDist > 1.0 && overviewDist < 2.0, `Candidate overview distance must be 1.0-2.0 units, was ${overviewDist}`);
});
