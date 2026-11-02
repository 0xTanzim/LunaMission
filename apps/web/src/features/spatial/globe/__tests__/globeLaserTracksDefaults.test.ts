import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLaserTracksGroup } from '../scene/globeLaserTracks';
import { DEFAULT_OVERLAY_LAYERS } from '../../model/mapLayerStack';
import { sampleLolaElevationAtLatLon } from '@/features/spatial/globe/terrain/lolaSouthPoleDemSampler';
import {
  getPolarElevationRgb,
  getNasaSvsElevationRgb,
} from '@/domain/terrain/nasaSvsColorRamp';

test('globeLaserTracks defaults: laser ground tracks ship disabled', () => {
  // Spec (spatial-visualization): the toggle defaults to disabled — the converging
  // polar fan must never be part of the opening view.
  assert.equal(
    DEFAULT_OVERLAY_LAYERS.laserTracks.visible,
    false,
    'laser tracks must default to hidden',
  );
});

test('globeLaserTracks coloring: vertex colors use the polar-domain elevation ramp', () => {
  const laserTracks = createLaserTracksGroup();
  const line = laserTracks.group.children.find(
    (obj) => obj instanceof THREE.LineSegments,
  ) as THREE.LineSegments;
  const colors = line.geometry.attributes.color;

  // First track point is the start of pass 0: lat -80, lon 0 (samplePassCoord t=0).
  const firstElev = sampleLolaElevationAtLatLon(-80, 0);
  const expectedPolar = getPolarElevationRgb(firstElev).map((c) => c / 255);
  const globalRamp = getNasaSvsElevationRgb(firstElev).map((c) => c / 255);

  const actual = [colors.getX(0), colors.getY(0), colors.getZ(0)];
  const closeTo = (a: number[], b: number[]) =>
    a.every((v, i) => Math.abs(v - b[i]) < 0.01);

  assert.ok(
    closeTo(actual, expectedPolar),
    `first vertex color ${actual} must match the polar ramp ${expectedPolar}`,
  );
  assert.ok(
    !closeTo(actual, globalRamp),
    'first vertex color must NOT come from the global ±9 km ramp (yellow-fan regression)',
  );
  laserTracks.dispose();
});
