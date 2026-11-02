import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanetaryTheaterToolbar } from '../components/PlanetaryTheaterToolbar';
import { PlanetaryTheaterMoreViews } from '../components/PlanetaryTheaterMoreViews';
import { DEFAULT_SPATIAL_PREFERENCES } from '@/features/spatial/model/spatialPreferences';
import { CATEGORIZED_PRESETS } from '@/features/spatial/config/cameraPresetCategories';
import { CameraPreset } from '@/features/spatial/model/spatialPreferences';

function renderToolbar() {
  return renderToStaticMarkup(
    React.createElement(PlanetaryTheaterToolbar, {
      preferences: DEFAULT_SPATIAL_PREFERENCES,
      onSelectCameraPreset: () => {},
      onSelectScientificMapMode: () => {},
      onToggleLayer: () => {},
      showTerrain: true,
      onToggleTerrain: () => {},
      showMarkers: true,
      onToggleMarkers: () => {},
      showLabels: true,
      onToggleLabels: () => {},
      displayFillLighting: true,
      onToggleFillLighting: () => {},
      isFlyoverActive: false,
      onToggleFlyover: () => {},
      onResetCamera: () => {},
      onResetSelection: () => {},
      isPlaying: false,
      onTogglePlayback: () => {},
      onStepTimeHours: () => {},
      isControlsCollapsed: false,
      onToggleCollapsed: () => {},
    }),
  );
}

test('theater toolbar: exposes the four contextual groups with accessible labels', () => {
  const html = renderToolbar();
  assert.ok(html.includes('data-group="camera-modes"'), 'Camera group');
  assert.ok(html.includes('data-group="visualization"'), 'Visualization group');
  assert.ok(html.includes('data-group="scientific-layers"'), 'Scientific layers group');
  assert.ok(html.includes('data-group="time-workspace-controls"'), 'Timeline group');
  for (const label of [
    'Camera Views',
    'Visualization Controls',
    'Scientific Surface Layers',
    'Ephemeris Time Stepper Controls',
  ]) {
    assert.ok(html.includes(label), `group aria-label must include "${label}"`);
  }
});

test('theater toolbar: groups are atomic at lg — nowrap+shrink so wrapping happens BETWEEN groups', () => {
  const html = renderToolbar();
  const groupMatches = html.match(/data-group="[a-z-]+"/g) ?? [];
  assert.equal(groupMatches.length, 4, 'exactly four groups');
  for (const group of ['camera-modes', 'visualization', 'scientific-layers', 'time-workspace-controls']) {
    const idx = html.indexOf(`data-group="${group}"`);
    const tagStart = html.lastIndexOf('<div', idx);
    const tagEnd = html.indexOf('>', idx);
    const groupTag = html.slice(tagStart, tagEnd);
    assert.ok(groupTag.includes('lg:flex-nowrap'), `${group} must be lg:flex-nowrap (atomic)`);
    assert.ok(groupTag.includes('lg:shrink-0'), `${group} must not shrink at lg`);
  }
});

test('theater toolbar: scientific layer select lives in its own group, not the visualization toggles', () => {
  const html = renderToolbar();
  const sciIdx = html.indexOf('data-group="scientific-layers"');
  const vizIdx = html.indexOf('data-group="visualization"');
  assert.ok(sciIdx >= 0 && vizIdx >= 0 && sciIdx !== vizIdx, 'both groups exist');
  const sciTagEnd = html.indexOf('data-group="time-workspace-controls"');
  assert.ok(html.slice(sciIdx, sciTagEnd).includes('select-3d-scientific-layer'),
    'the base-layer select is inside the scientific group');
  assert.ok(!html.slice(vizIdx, sciIdx).includes('select-3d-scientific-layer'),
    'visualization group holds no base-layer select');
});

test('theater toolbar: advanced camera modes collapse into a "More views" popover', () => {
  const html = renderToolbar();
  assert.ok(html.includes('More views'), 'a More views trigger exists');
  assert.ok(html.includes('aria-haspopup="menu"'), 'trigger announces a menu');

  // Inline tactical buttons are gone from the bar — they live behind the popover.
  assert.ok(!html.includes('data-testid="preset-overhead"'), 'Overhead must not be inline');
  assert.ok(!html.includes('data-testid="preset-horizon"'), 'Horizon must not be inline');
  assert.ok(!html.includes('data-testid="preset-eva"'), 'EVA must not be inline');

  // Primary framings stay inline.
  assert.ok(html.includes('data-testid="preset-global"'), 'Global stays inline');
  assert.ok(html.includes('data-testid="preset-nadir"'), 'South Pole stays inline');
});

test('More views popover: open state lists every tactical preset as menu items', () => {
  const html = renderToStaticMarkup(
    React.createElement(PlanetaryTheaterMoreViews, {
      currentPreset: 'nadir' as CameraPreset,
      onSelectCameraPreset: () => {},
      open: true,
      onToggle: () => {},
      onClose: () => {},
    }),
  );
  for (const def of CATEGORIZED_PRESETS.filter((p) => p.category === 'tactical')) {
    assert.ok(html.includes(`data-testid="moreviews-${def.id}"`), `menu item for ${def.id}`);
  }
  assert.ok(html.includes('role="menu"'), 'menu role present');
});

test('More views popover: closed state hides the menu from the accessibility tree', () => {
  const html = renderToStaticMarkup(
    React.createElement(PlanetaryTheaterMoreViews, {
      currentPreset: 'nadir' as CameraPreset,
      onSelectCameraPreset: () => {},
      open: false,
      onToggle: () => {},
      onClose: () => {},
    }),
  );
  const menuIdx = html.indexOf('role="menu"');
  assert.ok(menuIdx >= 0, 'menu panel exists');
  const panelTag = html.slice(html.lastIndexOf('<div', menuIdx), html.indexOf('>', menuIdx));
  assert.ok(panelTag.includes('hidden'), 'closed menu must carry the hidden attribute');
});

test('More views popover: open state exposes the menu', () => {
  const html = renderToStaticMarkup(
    React.createElement(PlanetaryTheaterMoreViews, {
      currentPreset: 'nadir' as CameraPreset,
      onSelectCameraPreset: () => {},
      open: true,
      onToggle: () => {},
      onClose: () => {},
    }),
  );
  const menuIdx = html.indexOf('role="menu"');
  const panelTag = html.slice(html.lastIndexOf('<div', menuIdx), html.indexOf('>', menuIdx));
  assert.ok(!panelTag.includes('hidden'), 'open menu must not be hidden');
});
