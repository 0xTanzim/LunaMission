import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSkylineOverlay, type SkylineOverlay } from '../scene/globeSkyline';
import type { HorizonProfileResponse } from '@luna/contracts';
import { CANDIDATE_SITES } from '@luna/contracts';
import { MOON_SCENE_RADIUS } from '../scene/globeScene';

function silhouetteOf(overlay: SkylineOverlay): THREE.Line {
  return overlay.group.children.find((c) => c.name === 'horizon-skyline-silhouette') as THREE.Line;
}

function fixtureProfile(overrides: Partial<HorizonProfileResponse> = {}): HorizonProfileResponse {
  const bins = Array.from({ length: 360 }, (_, i) => ({
    azimuthDeg: i,
    azimuthSectorDeg: [i, i + 1] as [number, number],
    // One blocking ridge toward azimuth 45°, open sky elsewhere.
    maskElevationDeg: i === 45 ? 8 : -2.2,
    ridgeDistanceKm: i === 45 ? 12 : 41,
    blockerElevationMeters: i === 45 ? 900 : 300,
    binStatus: 'valid' as const,
  }));
  return {
    siteId: 'shackleton-rim',
    mastHeightMeters: 2,
    azimuthBinsCount: 360,
    stepDeg: 1,
    bins,
    provenance: { dataset: 'NASA_LOLA_PGDA', z0ObserverMeters: 639, rMaxMeters: 1744600 },
    status: 'valid',
    ...overrides,
  };
}

test('skyline: builds a draped silhouette from the backend bins, one vertex per bin', () => {
  const site = CANDIDATE_SITES[0]!;
  const overlay: SkylineOverlay = createSkylineOverlay(site, fixtureProfile());
  const silhouette = overlay.group.children.find((c) => c.name === 'horizon-skyline-silhouette');
  assert.ok(silhouette, 'silhouette line present');
  const geometry = (silhouette as THREE.Line).geometry;
  const positions = geometry.getAttribute('position');
  assert.equal(positions.count, 360 + 1, 'one vertex per bin plus closure');
  void MOON_SCENE_RADIUS;
  overlay.dispose(new THREE.Scene());
});

test('skyline: blocking bins project above the tangent plane, open bins sit at the floor', () => {
  const site = CANDIDATE_SITES[0]!;
  const overlay = createSkylineOverlay(site, fixtureProfile());
  const silhouette = overlay.group.children.find((c) => c.name === 'horizon-skyline-silhouette') as THREE.Line;
  const positions = silhouette.geometry.getAttribute('position');

  // Height is measured along the site's outward normal (at the south pole, world -Y).
  const sitePos = new THREE.Vector3(
    Math.cos((site.coordinates.latitudeDeg * Math.PI) / 180) * Math.sin((site.coordinates.longitudeDeg * Math.PI) / 180),
    Math.sin((site.coordinates.latitudeDeg * Math.PI) / 180),
    Math.cos((site.coordinates.latitudeDeg * Math.PI) / 180) * Math.cos((site.coordinates.longitudeDeg * Math.PI) / 180),
  ).multiplyScalar(MOON_SCENE_RADIUS);
  const normal = sitePos.clone().normalize();
  const heightAlongNormal = (i: number) =>
    new THREE.Vector3(positions.getX(i), positions.getY(i), positions.getZ(i)).sub(sitePos).dot(normal);

  const ridge = heightAlongNormal(45);
  const open = heightAlongNormal(0);
  assert.ok(ridge > open, `ridge vertex above open-sky vertex (${ridge} vs ${open})`);
  assert.ok(ridge > 0, 'ridge projects above the tangent floor');
  overlay.dispose(new THREE.Scene());
});

test('skyline: sun and earth sprites ride the backend epoch tangent directions', () => {
  const site = CANDIDATE_SITES[0]!;
  const sunDir = new THREE.Vector3(1, 0, 0);
  const earthDir = new THREE.Vector3(0, 0, 1);
  const overlay = createSkylineOverlay(site, fixtureProfile(), { sunTangent: sunDir, earthTangent: earthDir });
  const sun = overlay.group.getObjectByName('skyline-sun-sprite');
  const earth = overlay.group.getObjectByName('skyline-earth-sprite');
  assert.ok(sun && earth, 'both celestial sprites present');
  // Sun sprite rides the provided tangent, measured as the offset from the site anchor.
  const sitePos = (silhouetteOf(overlay)).position; // group is at origin; anchor via silhouette start
  void sitePos;
  const anchor = new THREE.Vector3(
    Math.cos((site.coordinates.latitudeDeg * Math.PI) / 180) * Math.sin((site.coordinates.longitudeDeg * Math.PI) / 180),
    Math.sin((site.coordinates.latitudeDeg * Math.PI) / 180),
    Math.cos((site.coordinates.latitudeDeg * Math.PI) / 180) * Math.cos((site.coordinates.longitudeDeg * Math.PI) / 180),
  ).multiplyScalar(MOON_SCENE_RADIUS);
  const sunOffset = (sun as THREE.Sprite).position.clone().sub(anchor).normalize();
  const earthOffset = (earth as THREE.Sprite).position.clone().sub(anchor).normalize();
  assert.ok(sunOffset.dot(sunDir) > 0.99, `sun sprite along the sun tangent (dot=${sunOffset.dot(sunDir).toFixed(3)})`);
  assert.ok(earthOffset.dot(earthDir) > 0.99, `earth sprite along the earth tangent (dot=${earthOffset.dot(earthDir).toFixed(3)})`);
  overlay.dispose(new THREE.Scene());
});

test('skyline: updating with null disposes and detaches the group', () => {
  const scene = new THREE.Scene();
  const site = CANDIDATE_SITES[0]!;
  const overlay = createSkylineOverlay(site, fixtureProfile());
  scene.add(overlay.group);
  overlay.dispose(scene);
  assert.equal(overlay.group.parent, null, 'group removed from the scene');
  assert.equal(scene.children.length, 0, 'scene left clean');
});
