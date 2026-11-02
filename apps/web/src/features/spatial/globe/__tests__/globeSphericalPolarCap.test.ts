import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { MOON_SCENE_RADIUS } from '../scene/globeScene';
import { buildSphericalPolarCapGeometry } from '../terrain/globeMultiLodTerrain';

test('globeSphericalPolarCap: generates a spherical cap geometry without perimeter dropoff skirts', () => {
  const geo = buildSphericalPolarCapGeometry(MOON_SCENE_RADIUS, -80.0, -90.0, 32);
  assert.ok(geo instanceof THREE.BufferGeometry);

  const positions = geo.attributes.position;
  assert.ok(positions !== undefined);
  assert.ok(positions.count > 0);

  const indices = geo.index;
  assert.ok(indices !== null);
  assert.ok(indices!.count > 0);
});

test('globeSphericalPolarCap: guarantees all vertices have finite values within reasonable radial bounds', () => {
  const geo = buildSphericalPolarCapGeometry(MOON_SCENE_RADIUS, -80.0, -90.0, 32);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);

    assert.ok(Number.isFinite(x));
    assert.ok(Number.isFinite(y));
    assert.ok(Number.isFinite(z));

    const r = Math.sqrt(x * x + y * y + z * z);
    assert.ok(r > MOON_SCENE_RADIUS * 0.97);
    assert.ok(r < MOON_SCENE_RADIUS * 1.03);
  }
});

test('globeSphericalPolarCap: smoothly connects boundary vertices at -80 deg to reference sphere radius', () => {
  const geo = buildSphericalPolarCapGeometry(MOON_SCENE_RADIUS, -80.0, -90.0, 32);
  const pos = geo.attributes.position;

  const ring0Count = 33;
  for (let i = 0; i < ring0Count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const r = Math.sqrt(x * x + y * y + z * z);
    assert.ok(Math.abs(r - MOON_SCENE_RADIUS) < 1e-3);
  }
});

test('globeSphericalPolarCap: deforms crater floors inward and massif peaks outward along radial normals', () => {
  const geo = buildSphericalPolarCapGeometry(MOON_SCENE_RADIUS, -80.0, -90.0, 64);
  const minElev = (geo as unknown as { minElev: number }).minElev;
  const maxElev = (geo as unknown as { maxElev: number }).maxElev;

  assert.ok(minElev < 0, 'Crater floor must deform inward');
  assert.ok(maxElev > 0, 'Massif peak must deform outward');
});
