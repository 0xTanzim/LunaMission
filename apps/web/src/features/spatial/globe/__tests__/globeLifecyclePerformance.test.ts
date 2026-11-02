import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  clearCelestialVectors,
  renderCelestialVectors,
  CelestialVectorInput,
} from '../scene/globeCelestialVectors';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  asSelenographicLatitudeDeg,
  asSelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';

// Minimal canvas mock for node test runner
if (typeof (globalThis as any).document === 'undefined') {
  (globalThis as any).document = {
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({
        createLinearGradient: () => ({ addColorStop: () => {} }),
        createRadialGradient: () => ({ addColorStop: () => {} }),
        fillRect: () => {},
        beginPath: () => {},
        ellipse: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {},
        quadraticCurveTo: () => {},
        closePath: () => {},
        fillText: () => {},
      }),
    }),
  };
}

const baseInput: CelestialVectorInput = {
  showVectors: true,
  site: CANDIDATE_SITES[0],
  subSolarLatDeg: asSelenographicLatitudeDeg(-1.2),
  subSolarLonDeg: asSelenographicLongitudeDeg(45.0),
  subEarthLatDeg: asSelenographicLatitudeDeg(3.5),
  subEarthLonDeg: asSelenographicLongitudeDeg(-2.1),
  earthElevationDeg: 1.5,
};

test('Lifecycle & Performance: In-place celestial vector update reuses meshes across epochs', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, baseInput);
  assert.equal(group.children.length, 8);

  const initialSunMesh = group.children[0];
  const initialEarthMesh = group.children[4];
  const initialSunRay = group.children[3];

  // Call renderCelestialVectors with a new time epoch (different subSolar/subEarth coords)
  renderCelestialVectors(group, {
    ...baseInput,
    subSolarLonDeg: asSelenographicLongitudeDeg(90.0),
    subEarthLonDeg: asSelenographicLongitudeDeg(10.0),
  });

  // Group should still have exactly 8 children
  assert.equal(group.children.length, 8);

  // The mesh instances must be strictly identical (in-place reused, not re-allocated)
  assert.equal(group.children[0], initialSunMesh, 'Sun mesh was reused in-place');
  assert.equal(group.children[4], initialEarthMesh, 'Earth mesh was reused in-place');
  assert.equal(group.children[3], initialSunRay, 'Sun ray was reused in-place');
});

test('Lifecycle & Performance: Complete cleanup disposes all resources on vector removal', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, baseInput);
  assert.equal(group.children.length, 8);

  clearCelestialVectors(group);
  assert.equal(group.children.length, 0, 'Group must be empty after disposal');
});
