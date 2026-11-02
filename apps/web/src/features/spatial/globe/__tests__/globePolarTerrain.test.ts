import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPolarTerrainFeatures } from '../scene/globePolarTerrain';

test('globePolarTerrain: initializes polar terrain group with continuous spherical cap and nomenclature billboards', () => {
  const features = createPolarTerrainFeatures('shackleton-connecting-ridge');
  assert.ok(features.group instanceof THREE.Group);
  assert.ok(features.craterOutlinesGroup instanceof THREE.Group);
  assert.ok(features.multiLodTerrain !== undefined);

  const sprites: THREE.Sprite[] = [];
  features.craterOutlinesGroup.traverse((obj) => {
    if (obj instanceof THREE.Sprite) {
      sprites.push(obj);
    }
  });

  assert.ok(sprites.length >= 4, `Expected at least 4 crater billboards, got ${sprites.length}`);
  features.dispose();
});

test('globePolarTerrain: toggles visibility of crater outlines and billboards correctly', () => {
  const features = createPolarTerrainFeatures('shackleton-connecting-ridge');

  features.setCraterOutlinesVisible(false);
  assert.equal(features.craterOutlinesGroup.visible, false);

  features.setCraterOutlinesVisible(true);
  assert.equal(features.craterOutlinesGroup.visible, true);

  features.dispose();
});
