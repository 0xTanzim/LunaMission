import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPoleMarker } from '../scene/globePoleMarker';
import { MOON_SCENE_RADIUS } from '../scene/globeScene';

test('pole marker: sits at the geographic south pole, lifted off the reference sphere', () => {
  const marker = createPoleMarker();
  assert.equal(marker.name, 'SouthPoleMarker');
  // South pole surface point is (0, -R, 0) in MOON_ME (lat +90 => +Y); the marker lifts
  // slightly along the surface normal so the cross never z-fights with terrain.
  const expectedY = -(MOON_SCENE_RADIUS + 0.004);
  assert.ok(Math.abs(marker.position.y - expectedY) < 1e-6, `marker y ${marker.position.y} must be ${expectedY}`);
  assert.equal(marker.position.x, 0);
  assert.equal(marker.position.z, 0);
});

test('pole marker: small cross lies tangent to the surface, plus a distinct 90°S tag', () => {
  const marker = createPoleMarker();

  const lines = marker.children.filter((c) => c instanceof THREE.LineSegments) as THREE.LineSegments[];
  assert.equal(lines.length, 1, 'exactly one cross LineSegments object');
  const pos = lines[0]!.geometry.attributes.position;
  assert.equal(pos.count, 4, 'cross has two segments (4 vertices)');

  // Cross vertices are local to the marker group; the tangent plane passes through the
  // group origin, so every vertex must have local y = 0 (no dip toward the sphere).
  for (let i = 0; i < pos.count; i++) {
    const vy = pos.getY(i);
    assert.ok(Math.abs(vy) < 1e-6, `cross vertex ${i} y=${vy} must stay in the tangent plane`);
  }
  // The cross is small relative to the cap: full extent well under 1% of scene radius.
  let maxExtent = 0;
  for (let i = 0; i < pos.count; i++) {
    maxExtent = Math.max(maxExtent, Math.hypot(pos.getX(i) - marker.position.x, pos.getZ(i) - marker.position.z));
  }
  assert.ok(maxExtent < 0.02, `cross extent ${maxExtent} must be small`);
  assert.ok(maxExtent > 0.002, `cross extent ${maxExtent} must still be visible`);

  const sprites = marker.children.filter((c) => c instanceof THREE.Sprite) as THREE.Sprite[];
  assert.equal(sprites.length, 1, 'exactly one 90°S tag sprite');
  assert.equal(sprites[0]!.name, '90S-TAG', 'tag sprite must be nameable as the pole tag');
  // Distinct from site badges: half the badge size, so it never competes visually.
  assert.ok(sprites[0]!.scale.x <= 0.12, `tag scale ${sprites[0]!.scale.x} must be smaller than a site badge`);
});
