import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SPATIAL_PREFERENCES,
  SpatialPreferences,
  isLayerVisible,
  spatialPreferencesReducer,
} from '@/features/spatial/model/spatialPreferences';
import { MAP_OVERLAYS } from '@/features/spatial/model/mapLayerStack';

test('spatialPreferences: defaults match the opening workspace', () => {
  assert.equal(DEFAULT_SPATIAL_PREFERENCES.cameraPreset, 'nadir');
  // Exactly one base layer, always present — and it is the NATURAL LROC appearance: the
  // Moon opens looking like the Moon. False-color ramps are explicit analytical modes
  // (task 2.8), never the resting state.
  assert.equal(DEFAULT_SPATIAL_PREFERENCES.base.id, 'none');
  assert.equal(DEFAULT_SPATIAL_PREFERENCES.base.opacity, 1);
  assert.equal(DEFAULT_SPATIAL_PREFERENCES.base.blendMode, 'normal');
  // Every declared overlay opens visible at full strength, except the graticule at 0.9 (it
  // reads as reference geometry rather than competing with the terrain it annotates) and the
  // laser-track fan, which ships disabled as an explicit analytical mode (spec:
  // spatial-visualization, laser tracks default to disabled).
  for (const overlay of MAP_OVERLAYS) {
    const expected = overlay.id === 'laserTracks' ? false : true;
    assert.equal(DEFAULT_SPATIAL_PREFERENCES.overlays[overlay.id].visible, expected, overlay.id);
  }
  assert.equal(DEFAULT_SPATIAL_PREFERENCES.overlays.grid.opacity, 0.9);
});

test('spatialPreferences: each layer toggles independently', () => {
  let state = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, { type: 'layer/toggled', layer: 'grid' });
  assert.equal(isLayerVisible(state, 'grid'), false);
  assert.equal(isLayerVisible(state, 'craters'), true);
  assert.equal(isLayerVisible(state, 'vectors'), true);
  // laserTracks ships hidden; its first toggle turns it on.
  assert.equal(isLayerVisible(state, 'laserTracks'), false);

  state = spatialPreferencesReducer(state, { type: 'layer/toggled', layer: 'laserTracks' });
  assert.equal(isLayerVisible(state, 'laserTracks'), true);
  assert.equal(isLayerVisible(state, 'grid'), false);

  state = spatialPreferencesReducer(state, { type: 'layer/toggled', layer: 'psr' });
  assert.equal(isLayerVisible(state, 'psr'), false);
  assert.equal(isLayerVisible(state, 'grid'), false);

  state = spatialPreferencesReducer(state, { type: 'layer/toggled', layer: 'craters' });
  assert.equal(isLayerVisible(state, 'craters'), false);

  state = spatialPreferencesReducer(state, { type: 'layer/toggled', layer: 'vectors' });
  assert.equal(isLayerVisible(state, 'vectors'), false);

  // Toggling twice returns to the original state and never mutates it.
  const before = state;
  const backOn = spatialPreferencesReducer(state, { type: 'layer/toggled', layer: 'vectors' });
  assert.equal(isLayerVisible(backOn, 'vectors'), true);
  assert.equal(isLayerVisible(before, 'vectors'), false);
});

test('spatialPreferences: the base layer cannot be toggled away', () => {
  // There is no action that hides the base: the disc is never blank.
  const state = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'layer/toggled',
    layer: 'topography' as never,
  });
  assert.equal(state.base.id, DEFAULT_SPATIAL_PREFERENCES.base.id);
});

test('spatialPreferences: overlay opacity is clamped and non-finite input falls back to opaque', () => {
  const half = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'layer/opacity-changed',
    layer: 'grid',
    opacity: 0.4,
  });
  assert.equal(half.overlays.grid.opacity, 0.4);

  const over = spatialPreferencesReducer(half, { type: 'layer/opacity-changed', layer: 'grid', opacity: 4 });
  assert.equal(over.overlays.grid.opacity, 1);

  const under = spatialPreferencesReducer(over, { type: 'layer/opacity-changed', layer: 'grid', opacity: -2 });
  assert.equal(under.overlays.grid.opacity, 0);

  const nan = spatialPreferencesReducer(under, {
    type: 'layer/opacity-changed',
    layer: 'grid',
    opacity: Number.NaN,
  });
  assert.equal(nan.overlays.grid.opacity, 1);

  // An unchanged value keeps state identity so consumers do not re-render.
  assert.equal(
    spatialPreferencesReducer(half, { type: 'layer/opacity-changed', layer: 'grid', opacity: 0.4 }),
    half,
  );
});

test('spatialPreferences: blend mode is per overlay and independent of its neighbours', () => {
  const multiplied = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'layer/blend-changed',
    layer: 'psr',
    blendMode: 'multiply',
  });
  assert.equal(multiplied.overlays.psr.blendMode, 'multiply');
  assert.equal(multiplied.overlays.grid.blendMode, 'normal');

  assert.equal(
    spatialPreferencesReducer(multiplied, { type: 'layer/blend-changed', layer: 'psr', blendMode: 'multiply' }),
    multiplied,
  );
});

test('spatialPreferences: camera preset selection replaces the previous preset', () => {
  const oblique = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'cameraPreset/selected',
    preset: 'oblique',
  });
  assert.equal(oblique.cameraPreset, 'oblique');

  const site = spatialPreferencesReducer(oblique, { type: 'cameraPreset/selected', preset: 'site' });
  assert.equal(site.cameraPreset, 'site');
  assert.equal(oblique.cameraPreset, 'oblique');

  // Re-selecting the active preset keeps state identity so consumers do not re-render.
  assert.equal(spatialPreferencesReducer(site, { type: 'cameraPreset/selected', preset: 'site' }), site);
});

test('spatialPreferences: scientific map mode selection switches the base layer cleanly', () => {
  const hillshade = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'scientificMapMode/selected',
    mode: 'hillshade',
  });
  assert.equal(hillshade.base.id, 'hillshade');
  // Switching the base must not disturb the overlays already composited over it.
  assert.deepEqual(hillshade.overlays, DEFAULT_SPATIAL_PREFERENCES.overlays);

  const slope = spatialPreferencesReducer(hillshade, {
    type: 'scientificMapMode/selected',
    mode: 'slope',
  });
  assert.equal(slope.base.id, 'slope');

  // Re-selecting identical mode preserves state identity
  assert.equal(spatialPreferencesReducer(slope, { type: 'scientificMapMode/selected', mode: 'slope' }), slope);
});

test('spatialPreferences: slope selection records the prior base as the restore target', () => {
  // Slope from the Natural opening state remembers Natural, not Topography.
  const fromNatural = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'scientificMapMode/selected',
    mode: 'slope',
  });
  assert.equal(fromNatural.base.id, 'slope');
  assert.equal(fromNatural.previousBaseId, 'none');

  // Slope from Topography remembers Topography.
  const onTopography = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'scientificMapMode/selected',
    mode: 'topography',
  });
  const fromTopography = spatialPreferencesReducer(onTopography, {
    type: 'scientificMapMode/selected',
    mode: 'slope',
  });
  assert.equal(fromTopography.base.id, 'slope');
  assert.equal(fromTopography.previousBaseId, 'topography');
});

test('spatialPreferences: leaving slope for a non-slope base clears the restore target', () => {
  const onSlope = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'scientificMapMode/selected',
    mode: 'slope',
  });
  const toGeology = spatialPreferencesReducer(onSlope, {
    type: 'scientificMapMode/selected',
    mode: 'geology',
  });
  assert.equal(toGeology.base.id, 'geology');
  assert.equal(toGeology.previousBaseId, null);

  // A stale recorded slope target (e.g. restored/shared state) is treated as no record.
  const stale = { ...onSlope, previousBaseId: 'slope' as const };
  const recovered = spatialPreferencesReducer(stale, {
    type: 'scientificMapMode/selected',
    mode: 'geology',
  });
  assert.equal(recovered.previousBaseId, null);
});

test('spatialPreferences: selecting slope while already on slope keeps state identity', () => {
  const onSlope = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'scientificMapMode/selected',
    mode: 'slope',
  });
  assert.equal(spatialPreferencesReducer(onSlope, { type: 'scientificMapMode/selected', mode: 'slope' }), onSlope);
});

test('spatialPreferences: base opacity and blend are adjustable without hiding the base', () => {
  const dimmed = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'base/opacity-changed',
    opacity: 0.5,
  });
  assert.equal(dimmed.base.opacity, 0.5);
  assert.equal(dimmed.base.id, DEFAULT_SPATIAL_PREFERENCES.base.id);

  const blended = spatialPreferencesReducer(dimmed, { type: 'base/blend-changed', blendMode: 'screen' });
  assert.equal(blended.base.blendMode, 'screen');
});

test('spatialPreferences: unknown action leaves preferences unchanged', () => {
  const state: SpatialPreferences = DEFAULT_SPATIAL_PREFERENCES;
  // Cast stands in for an action produced elsewhere; the reducer must not guess.
  const unchanged = spatialPreferencesReducer(state, { type: 'unknown/nothing' } as never);
  assert.equal(unchanged, state);
});

test('spatialPreferences: intel drawer width defaults to 440 and clamps to 320–560', () => {
  // Task 3.1: the intelligence drawer is resizable 320–560 px; the width is the single
  // persisted drawer preference so a reload restores the operator's layout.
  assert.equal(DEFAULT_SPATIAL_PREFERENCES.intelDrawerWidthPx, 440);

  const wider = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'intelDrawer/width-changed',
    widthPx: 560,
  });
  assert.equal(wider.intelDrawerWidthPx, 560);

  const over = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'intelDrawer/width-changed',
    widthPx: 900,
  });
  assert.equal(over.intelDrawerWidthPx, 560, 'above the max the width clamps to 560');

  const under = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'intelDrawer/width-changed',
    widthPx: 120,
  });
  assert.equal(under.intelDrawerWidthPx, 320, 'below the min the width clamps to 320');

  const nonFinite = spatialPreferencesReducer(DEFAULT_SPATIAL_PREFERENCES, {
    type: 'intelDrawer/width-changed',
    widthPx: Number.NaN,
  });
  assert.equal(nonFinite.intelDrawerWidthPx, 440, 'non-finite input falls back to the default');
});
