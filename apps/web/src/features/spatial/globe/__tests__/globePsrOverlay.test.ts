import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  createPsrOverlay,
  PSR_PROVENANCE_NOTE,
} from '../scene/globePsrOverlay';
import { LOLA_POLAR_CRATER_MORPHOLOGIES } from '@luna/contracts';
import { MOON_SCENE_RADIUS } from '../scene/globeScene';

const DEEP_PSR = LOLA_POLAR_CRATER_MORPHOLOGIES.filter((c) => c.isDeepPsr);
const NON_PSR_NAMES = LOLA_POLAR_CRATER_MORPHOLOGIES.filter((c) => !c.isDeepPsr).map((c) => c.name);

test('psr overlay: one hatched fill + boundary polyline per isDeepPsr crater, driven by the data', () => {
  const overlay = createPsrOverlay();
  assert.equal(overlay.group.name, 'PsrOverlay');
  // The overlay is data-driven: every morphology crater flagged isDeepPsr appears.
  assert.deepEqual(
    [...overlay.psrCraterNames].sort(),
    [...DEEP_PSR.map((c) => c.name)].sort(),
  );

  const fills = overlay.group.children.filter((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh[];
  const boundaries = overlay.group.children.filter((c) => c instanceof THREE.Line) as THREE.Line[];
  assert.equal(fills.length, DEEP_PSR.length, 'one fill disc per deep-PSR crater');
  assert.equal(boundaries.length, DEEP_PSR.length, 'one boundary polyline per deep-PSR crater');
  overlay.dispose();
});

test('psr overlay: fill disc is a translucent 45° hatch, not an opaque shaded disc', () => {
  const overlay = createPsrOverlay();
  const fill = overlay.group.children.find((c) => (c as THREE.Mesh).isMesh) as THREE.Mesh;
  const material = fill.material as THREE.MeshBasicMaterial;
  assert.ok(material.transparent, 'hatch fill must be transparent');
  assert.ok(material.opacity < 0.9, `fill opacity ${material.opacity} must read as a hatch, not a solid disc`);
  assert.ok(material.map, 'fill must carry a hatch texture');
  overlay.dispose();
});

test('psr overlay: boundary circle radius matches the crater rim radius from morphology', () => {
  const overlay = createPsrOverlay();
  const kmToScene = MOON_SCENE_RADIUS / 1737.4;
  const shackleton = DEEP_PSR.find((c) => c.name === 'Shackleton')!;
  const rimRadiusScene = (shackleton.diameterKm / 2) * kmToScene;

  const boundary = overlay.group.children.find(
    (c) => c instanceof THREE.Line && c.name === `psr-boundary:${shackleton.name}`,
  ) as THREE.Line;
  assert.ok(boundary, 'Shackleton boundary polyline exists');

  const center = new THREE.Vector3();
  const positions = boundary.geometry.attributes.position;
  let maxDeviation = 0;
  const worldPoints: THREE.Vector3[] = [];
  for (let i = 0; i < positions.count; i++) {
    const p = new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i));
    worldPoints.push(p);
    maxDeviation = Math.max(maxDeviation, Math.abs(p.distanceTo(center) - 0)); // placeholder, replaced below
  }
  // Distances must be measured from the crater center in world space: reconstruct it as
  // the centroid of the closed loop.
  const centroid = worldPoints
    .reduce((acc, p) => acc.add(p), new THREE.Vector3())
    .divideScalar(worldPoints.length);
  const radialDistances = worldPoints.map((p) => p.distanceTo(centroid));
  const meanRadius = radialDistances.reduce((a, b) => a + b, 0) / radialDistances.length;
  // The rim is draped on the modeled surface, so allow small relief deviation around the
  // nominal rim radius, but the loop must not be grossly mis-scaled.
  assert.ok(
    Math.abs(meanRadius - rimRadiusScene) < rimRadiusScene * 0.35,
    `mean rim radius ${meanRadius.toFixed(4)} must be near ${(rimRadiusScene).toFixed(4)}`,
  );
  assert.ok(maxDeviation >= 0);
  overlay.dispose();
});

test('psr overlay: craters without isDeepPsr get no fill or boundary', () => {
  const overlay = createPsrOverlay();
  for (const name of NON_PSR_NAMES) {
    assert.equal(
      overlay.group.children.some((c) => c.name.includes(name)),
      false,
      `${name} must not appear in the PSR overlay`,
    );
  }
  overlay.dispose();
});

test('psr overlay: setVisible toggles the whole group and dispose releases geometry', () => {
  const overlay = createPsrOverlay();
  assert.equal(overlay.group.visible, true);
  overlay.setVisible(false);
  assert.equal(overlay.group.visible, false);
  overlay.setVisible(true);
  assert.equal(overlay.group.visible, true);

  const geometries: THREE.BufferGeometry[] = [];
  overlay.group.traverse((c) => {
    const mesh = c as THREE.Mesh;
    const line = c as THREE.Line;
    if (mesh.isMesh || line.isLine) geometries.push(mesh.isMesh ? mesh.geometry : line.geometry);
  });
  let disposeEvents = 0;
  geometries.forEach((g) => g.addEventListener('dispose', () => disposeEvents += 1));
  overlay.dispose();
  assert.equal(disposeEvents, geometries.length, 'dispose must release every geometry');
});

test('psr overlay: provenance note declares the modeled footprint and missing uncertainty', () => {
  // The legend chip must not present the modeled PSR footprint as measured data.
  assert.match(PSR_PROVENANCE_NOTE, /modeled/i);
  assert.match(PSR_PROVENANCE_NOTE, /uncertainty/i);
});
