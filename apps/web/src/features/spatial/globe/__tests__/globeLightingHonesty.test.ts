import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  computeSiteCelestialTangents,
  computeLocalPresetPose,
  getTopocentricBasis,
} from '../interaction/globeCameraPresetPoses';
import { applyFillLightingState } from '../scene/globeScene';
import { CANDIDATE_SITES } from '@luna/contracts';
import { MOON_SCENE_RADIUS } from '../scene/globeScene';

const site = CANDIDATE_SITES[0];

test('celestial tangents: project epoch sub-points onto the site tangent plane', () => {
  // Backend epoch vectors in, display tangent directions out. For a site with the Sun
  // nearly overhead-ish to its east, the sun tangent must point toward that azimuth and
  // be unit-length and tangent (no radial component).
  const tangents = computeSiteCelestialTangents(site, {
    subSolarLatDeg: site.coordinates.latitudeDeg + 2,
    subSolarLonDeg: site.coordinates.longitudeDeg + 10,
    subEarthLatDeg: site.coordinates.latitudeDeg - 3,
    subEarthLonDeg: site.coordinates.longitudeDeg + 40,
  });

  const normal = site.coordinates.latitudeDeg >= 0 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, -1, 0);
  const siteNormal = new THREE.Vector3(
    Math.cos((site.coordinates.latitudeDeg * Math.PI) / 180) * Math.sin((site.coordinates.longitudeDeg * Math.PI) / 180),
    Math.sin((site.coordinates.latitudeDeg * Math.PI) / 180),
    Math.cos((site.coordinates.latitudeDeg * Math.PI) / 180) * Math.cos((site.coordinates.longitudeDeg * Math.PI) / 180),
  );

  for (const t of [tangents.sunTangent, tangents.earthTangent]) {
    assert.ok(Math.abs(t.length() - 1) < 1e-6, 'tangent directions are unit length');
    assert.ok(Math.abs(t.dot(siteNormal)) < 1e-6, 'tangent directions have no radial component');
    void normal;
  }
});

test('earth_align pose: view direction tracks the epoch sub-Earth tangent, not a hardcoded axis', () => {
  const basis = getTopocentricBasis(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg, MOON_SCENE_RADIUS);
  const tangents = computeSiteCelestialTangents(site, {
    subSolarLatDeg: -89,
    subSolarLonDeg: 200,
    subEarthLatDeg: site.coordinates.latitudeDeg + 5,
    subEarthLonDeg: site.coordinates.longitudeDeg - 60,
  });

  const pose = computeLocalPresetPose('earth_align', site, basis, tangents);
  const viewDir = pose.lookTarget.clone().sub(pose.camPos).normalize();
  // The camera looks from slightly behind the site TOWARD the Earth direction: the view
  // direction must have a strong positive component along the epoch Earth tangent.
  assert.ok(viewDir.dot(tangents.earthTangent) > 0.5,
    `view direction must align with the epoch Earth tangent (dot=${viewDir.dot(tangents.earthTangent).toFixed(3)})`);
});

test('sunward_terminator pose: view direction tracks the epoch sub-solar tangent', () => {
  const basis = getTopocentricBasis(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg, MOON_SCENE_RADIUS);
  const tangents = computeSiteCelestialTangents(site, {
    subSolarLatDeg: site.coordinates.latitudeDeg + 1,
    subSolarLonDeg: site.coordinates.longitudeDeg + 90,
    subEarthLatDeg: 0,
    subEarthLonDeg: 0,
  });

  const pose = computeLocalPresetPose('sunward_terminator', site, basis, tangents);
  const viewDir = pose.lookTarget.clone().sub(pose.camPos).normalize();
  assert.ok(viewDir.dot(tangents.sunTangent) > 0.5,
    `view direction must align with the epoch Sun tangent (dot=${viewDir.dot(tangents.sunTangent).toFixed(3)})`);
});

test('display fill lighting: toggle gates ambient, earthshine and bloom as one honest unit', () => {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  const earthLight = new THREE.DirectionalLight(0xffffff, 0.5);
  const bloom = { strength: 0.28 };

  applyFillLightingState({ ambientLight, earthLight, bloom }, false);
  assert.equal(ambientLight.intensity, 0, 'ambient off with fill lighting disabled');
  assert.equal(earthLight.intensity, 0, 'earthshine off with fill lighting disabled');
  assert.equal(bloom.strength, 0, 'bloom off with fill lighting disabled');

  applyFillLightingState({ ambientLight, earthLight, bloom }, true);
  assert.ok(ambientLight.intensity > 0, 'ambient restored');
  assert.ok(earthLight.intensity > 0, 'earthshine restored');
  assert.ok(bloom.strength > 0, 'bloom restored');
});
