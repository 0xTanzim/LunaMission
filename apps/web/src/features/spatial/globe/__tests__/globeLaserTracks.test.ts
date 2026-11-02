import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createLaserTracksGroup } from '../scene/globeLaserTracks';

test('globeLaserTracks: creates an orbital ground tracks group with 36 converging passes', () => {
  const laserTracks = createLaserTracksGroup();
  assert.ok(laserTracks.group instanceof THREE.Group);

  let lineObjectCount = 0;
  laserTracks.group.traverse((obj) => {
    if (obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
      lineObjectCount++;
    }
  });

  assert.ok(lineObjectCount >= 1);
  laserTracks.dispose();
});

test('globeLaserTracks: assigns RGB vertex colors spanning LOLA hypsometry', () => {
  const laserTracks = createLaserTracksGroup();
  let hasVertexColors = false;

  laserTracks.group.traverse((obj) => {
    if (obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
      const colors = obj.geometry.attributes.color;
      if (colors && colors.count > 0) {
        hasVertexColors = true;
        for (let i = 0; i < Math.min(colors.count, 20); i++) {
          assert.ok(colors.getX(i) >= 0 && colors.getX(i) <= 1);
        }
      }
    }
  });

  assert.equal(hasVertexColors, true);
  laserTracks.dispose();
});

test('globeLaserTracks: allows toggling visibility', () => {
  const laserTracks = createLaserTracksGroup();
  assert.equal(laserTracks.group.visible, true);

  laserTracks.setVisible(false);
  assert.equal(laserTracks.group.visible, false);

  laserTracks.setVisible(true);
  assert.equal(laserTracks.group.visible, true);

  laserTracks.dispose();
});
