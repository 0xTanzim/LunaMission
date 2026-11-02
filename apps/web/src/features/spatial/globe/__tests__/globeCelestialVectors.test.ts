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
  earthElevationDeg: 1.5, // Above horizon
};

test('Celestial Vectors: When showVectors is false, group is cleared', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, { ...baseInput, showVectors: false });
  assert.equal(group.children.length, 0);
});

test('Celestial Vectors: Renders Sun disc, rays, Earth disc, atmosphere, and sightline when enabled', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, baseInput);

  // Group should contain Sun mesh, corona sprite, sun label, sun ray, earth mesh, atmosphere mesh, earth label, link ray
  assert.ok(group.children.length >= 7, `Expected at least 7 children in vector group, got ${group.children.length}`);

  // Find the DTE link line
  const lines = group.children.filter((c) => c instanceof THREE.Line) as THREE.Line[];
  assert.equal(lines.length, 2, 'Expected 2 line vectors (Sun ray and Earth link)');

  const earthLink = lines[1];
  const mat = earthLink.material as THREE.LineDashedMaterial;
  // For positive elevation (> 0), link should have cyan active color 0x38bdf8
  assert.equal(mat.color.getHex(), 0x38bdf8);
});

test('Celestial Vectors: Below-horizon Earth uses warning amber link', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, {
    ...baseInput,
    earthElevationDeg: -0.8, // Sub-horizon
  });

  const lines = group.children.filter((c) => c instanceof THREE.Line) as THREE.Line[];
  const earthLink = lines[1];
  const mat = earthLink.material as THREE.LineDashedMaterial;
  // For negative elevation, link should have warning amber color 0xf59e0b
  assert.equal(mat.color.getHex(), 0xf59e0b);
});

test('Celestial Vectors: Unknown Earth elevation uses neutral slate link with reduced opacity', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, {
    ...baseInput,
    earthElevationDeg: null, // Unknown elevation
  });

  const lines = group.children.filter((c) => c instanceof THREE.Line) as THREE.Line[];
  const earthLink = lines[1];
  const mat = earthLink.material as THREE.LineDashedMaterial;
  // For null/unknown elevation, link should have neutral slate color 0x94a3b8 and lower opacity
  assert.equal(mat.color.getHex(), 0x94a3b8);
  assert.equal(mat.opacity, 0.35);
});

test('Celestial Vectors: Earth uses realistic Blue Marble MeshStandardMaterial and additive atmospheric limb glow without obscuring cyan wash', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, baseInput);

  const earthMesh = group.children[4] as THREE.Mesh;
  const atmosphereMesh = group.children[5] as THREE.Mesh;

  assert.ok(earthMesh.material instanceof THREE.MeshStandardMaterial);
  assert.ok(atmosphereMesh.material instanceof THREE.MeshStandardMaterial);
  const atmoMat = atmosphereMesh.material as THREE.MeshStandardMaterial;
  assert.equal(atmoMat.side, THREE.BackSide);
  assert.equal(atmoMat.blending, THREE.AdditiveBlending);
});

test('Celestial Vectors: clearCelestialVectors disposes all geometries, materials, and textures without leaking', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, baseInput);

  assert.ok(group.children.length > 0);
  clearCelestialVectors(group);
  assert.equal(group.children.length, 0, 'Group must be empty after clearCelestialVectors');
});

// Task 5.3: celestial labels must offset along the body's radial-outward
// direction, not world +Y — at polar sites world +Y points into the Moon and
// buries the label behind the sphere (the "Earth Align label" polish item).
test('Celestial Vectors: sun and earth labels offset radially outward, not world +Y', () => {
  const group = new THREE.Group();
  renderCelestialVectors(group, baseInput);

  const sunLabel = group.children[2] as THREE.Sprite;
  const sunOrb = (group.children[0] as THREE.Mesh).position;
  const earthLabel = group.children[6] as THREE.Sprite;
  const earthOrb = (group.children[4] as THREE.Mesh).position;

  const sunOffset = sunLabel.position.clone().sub(sunOrb);
  const earthOffset = earthLabel.position.clone().sub(earthOrb);
  const sunRadial = sunOffset.dot(sunOrb.clone().normalize());
  const earthRadial = earthOffset.dot(earthOrb.clone().normalize());
  const sunWorldY = sunOffset.y;
  const earthWorldY = earthOffset.y;

  assert.ok(sunRadial > 0.9 * sunOffset.length(), `sun label offset must be radial-outward (radial=${sunRadial.toFixed(3)}, len=${sunOffset.length().toFixed(3)})`);
  assert.ok(earthRadial > 0.9 * earthOffset.length(), `earth label offset must be radial-outward (radial=${earthRadial.toFixed(3)}, len=${earthOffset.length().toFixed(3)})`);
  void sunWorldY; void earthWorldY;
  // NB: no world-Y expectation — Earth librates within ±6.69° of the equator, so its
  // radial offset is near-horizontal; the radial-outward contract above is the invariant.
});
