import * as THREE from 'three';
import { MOON_SCENE_RADIUS } from '@/features/spatial/globe/scene/globeScene';
import { createSiteBadge } from '@/features/spatial/globe/components/globeBillboardBadge';

/**
 * Geographic south pole marker (SP-2): a small surface-tangent cross plus a "90°S" tag,
 * visually distinct from the selected-site marker so the pole, the site, and the camera
 * direction can never be confused on screen. Display-only geometry from the declared
 * reference sphere — no terrain sampling.
 */

const POLE_MARKER_LIFT = 0.004;
const POLE_CROSS_HALF_EXTENT = 0.008;

export function createPoleMarker(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SouthPoleMarker';

  // The south pole surface point: lat -90° maps to (0, -R, 0) in MOON_ME (lat +90 => +Y).
  const poleSurface = new THREE.Vector3(0, -MOON_SCENE_RADIUS, 0);
  group.position.set(0, -(MOON_SCENE_RADIUS + POLE_MARKER_LIFT), 0);

  // Cross arms lie in the tangent plane (constant y in the marker's local frame).
  const arm = POLE_CROSS_HALF_EXTENT;
  const crossGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-arm, 0, 0),
    new THREE.Vector3(arm, 0, 0),
    new THREE.Vector3(0, 0, -arm),
    new THREE.Vector3(0, 0, arm),
  ]);
  const crossMaterial = new THREE.LineBasicMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
    depthWrite: false,
  });
  const cross = new THREE.LineSegments(crossGeometry, crossMaterial);
  cross.renderOrder = 5;
  group.add(cross);

  const tag = createSiteBadge('90°S', false);
  tag.name = '90S-TAG';
  tag.scale.set(0.09, 0.0225, 1);
  tag.position.set(0, 0.02, 0);
  group.add(tag);

  return group;
}
