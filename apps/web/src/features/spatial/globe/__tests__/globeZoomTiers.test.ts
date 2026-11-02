import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getZoomTier,
  getTierLabelDensity,
  ZOOM_TIER_LOCAL_MAX_UNITS,
  ZOOM_TIER_REGIONAL_MIN_UNITS,
} from '../scene/globeZoomTiers';
import { DEEP_ZOOM_DISTANCE_UNITS } from '../scene/globeScene';
import { NADIR_CAP_CAMERA_DISTANCE, INSPECTION_CAMERA_ALTITUDE } from '../interaction/globeCameraPresets';

test('zoom tiers: the camera distance ladder maps onto three named tiers', () => {
  assert.equal(getZoomTier(5.6), 'regional', 'Global context view is Regional');
  assert.equal(getZoomTier(1.35), 'regional', 'Site-focus overview is Regional');
  assert.equal(getZoomTier(NADIR_CAP_CAMERA_DISTANCE), 'regional', 'opening cap framing is Regional');
  assert.equal(getZoomTier(0.2), 'site', 'close study view is Site');
  assert.equal(getZoomTier(INSPECTION_CAMERA_ALTITUDE), 'local', 'inspection depth is Local');
});

test('zoom tiers: boundaries are [regional ≥ 0.35) [site 0.15–0.35) [local < 0.15]', () => {
  assert.equal(getZoomTier(ZOOM_TIER_REGIONAL_MIN_UNITS), 'regional', 'exactly 0.35 is Regional');
  assert.equal(getZoomTier(ZOOM_TIER_REGIONAL_MIN_UNITS - 0.001), 'site');
  assert.equal(getZoomTier(ZOOM_TIER_LOCAL_MAX_UNITS), 'site', 'exactly 0.15 is Site');
  assert.equal(getZoomTier(ZOOM_TIER_LOCAL_MAX_UNITS - 0.001), 'local');
});

test('zoom tiers: the Local boundary IS the deep-zoom overlay gate (one threshold, one truth)', () => {
  assert.equal(ZOOM_TIER_LOCAL_MAX_UNITS, DEEP_ZOOM_DISTANCE_UNITS);
});

test('zoom tiers: label density caps tighten from Regional to Local', () => {
  const regional = getTierLabelDensity('regional');
  const site = getTierLabelDensity('site');
  const local = getTierLabelDensity('local');
  assert.ok(regional.maxCraterLabels > site.maxCraterLabels, 'Site tier caps crater labels below Regional');
  assert.ok(site.maxCraterLabels > local.maxCraterLabels, 'Local tier caps crater labels below Site');
  assert.ok(regional.maxCraterLabels >= 8, 'Regional shows the full nomenclature');
});
