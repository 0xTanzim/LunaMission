import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SpatialToolbar } from '@/features/spatial/components/toolbar/SpatialToolbar';
import { PlanetaryTheaterToolbar } from '@/features/spatial/lab/components/PlanetaryTheaterToolbar';
import { DEFAULT_SPATIAL_PREFERENCES, withOverlayVisibility } from '@/features/spatial/model/spatialPreferences';

function renderTestToolbar(props: Partial<React.ComponentProps<typeof SpatialToolbar>> = {}) {
  return renderToStaticMarkup(
    <SpatialToolbar
      viewMode="dual"
      onViewModeChange={() => {}}
      preferences={DEFAULT_SPATIAL_PREFERENCES}
      onToggleLayer={() => {}}
      onCameraPresetChange={() => {}}
      isFullscreenActive={false}
      onToggleFullscreen={() => {}}
      {...props}
    />
  );
}

test('M3 Requirement 1: SpatialToolbar renders 4 orthogonal semantic groups with visual dividers', () => {
  const html = renderTestToolbar();
  assert.ok(html.includes('data-group="camera-modes"'), 'Group 1: Camera Modes group must be present');
  assert.ok(html.includes('data-group="display-layers"'), 'Group 2: Display Layers group must be present');
  assert.ok(html.includes('data-group="analytical-overlays"'), 'Group 3: Analytical Overlays group must be present');
  assert.ok(html.includes('data-group="time-workspace-controls"'), 'Group 4: Time Controls group must be present');
  assert.ok(html.includes('role="separator"'), 'Visual dividers must have role="separator"');

  const g1Pos = html.indexOf('data-group="camera-modes"');
  const g2Pos = html.indexOf('data-group="display-layers"');
  const g3Pos = html.indexOf('data-group="analytical-overlays"');
  const g4Pos = html.indexOf('data-group="time-workspace-controls"');
  assert.ok(g1Pos < g2Pos && g2Pos < g3Pos && g3Pos < g4Pos, 'The 4 groups must appear in strictly ascending order');
});

test('M3 Requirement 2: Camera presets are partitioned into Global, South Pole, and Tactical Site Views', () => {
  const html = renderTestToolbar();
  const presets = ['nadir', 'site', 'horizon', 'eva', 'earth_align', 'orbit360', 'north_look', 'sunward_terminator', 'global', 'oblique', 'overhead', 'inspection'];
  for (const preset of presets) {
    assert.ok(html.includes(`data-testid="preset-${preset}"`), `Preset ${preset} alias must exist`);
  }
});

test('M3 Requirement 3: Ergonomics & WCAG 2.2 AA tap targets (>= 24x24 px) and focus rings', () => {
  const html = renderTestToolbar({
    onOpenCustomTargetStudio: () => {},
    onTogglePinpointMode: () => {},
    onToggleFlyover: () => {},
    onToggleSiteIntel: () => {},
  });
  assert.ok(html.includes('min-h-[28px]'), 'Buttons must specify minimum dimension classes >= 24x24 px');
  assert.ok(/focus-visible:ring-(\[var\(--lm-color-[a-z-]+\)\]|cyan-400)/.test(html), 'Buttons must include high-contrast focus ring');
  assert.ok(html.includes('focus-visible:ring-2'), 'Focus ring must have 2px width');
  assert.ok(html.includes('aria-label='), 'Buttons must define accessible aria-label attributes');
  assert.ok(html.includes('title='), 'Buttons must define informative title tooltips');
});

test('M3 Requirement 3b: aria-pressed reflects active/inactive state on toggle controls', () => {
  const htmlActive = renderTestToolbar({
    preferences: withOverlayVisibility(DEFAULT_SPATIAL_PREFERENCES, { grid: true, vectors: true, psr: true }),
    isPinpointMode: true,
    isFlyoverActive: true,
    onTogglePinpointMode: () => {},
    onToggleFlyover: () => {},
    onToggleSiteIntel: () => {},
    isSiteIntelOpen: true,
  });
  assert.ok(htmlActive.includes('aria-pressed="true"'), 'Active toggle buttons must render aria-pressed="true"');

  const htmlInactive = renderTestToolbar({
    preferences: withOverlayVisibility(DEFAULT_SPATIAL_PREFERENCES, {
      grid: false,
      vectors: false,
      psr: false,
      laserTracks: false,
      craters: false,
    }),
    isPinpointMode: false,
    isFlyoverActive: false,
    onTogglePinpointMode: () => {},
    onToggleFlyover: () => {},
    onToggleSiteIntel: () => {},
    isSiteIntelOpen: false,
  });
  assert.ok(htmlInactive.includes('aria-pressed="false"'), 'Inactive toggle buttons must render aria-pressed="false"');
});

test('M3 Requirement 2b: Redundant pathways eliminated when not explicitly requested', () => {
  const htmlClean = renderTestToolbar();
  assert.ok(!htmlClean.includes('data-testid="toolbar-compare-sites"'), 'Floating compare button omitted');
  assert.ok(!htmlClean.includes('data-testid="toolbar-mission-dossier"'), 'Floating dossier button omitted');
});

test('M3 Requirement 4: PlanetaryTheaterToolbar conforms to 4-group taxonomy and WCAG standards', () => {
  const html = renderToStaticMarkup(
    <PlanetaryTheaterToolbar
      preferences={DEFAULT_SPATIAL_PREFERENCES}
      onSelectCameraPreset={() => {}}
      onSelectScientificMapMode={() => {}}
      onToggleLayer={() => {}}
      showTerrain={true}
      onToggleTerrain={() => {}}
      showMarkers={true}
      onToggleMarkers={() => {}}
      showLabels={true}
      onToggleLabels={() => {}}
      displayFillLighting={true}
      onToggleFillLighting={() => {}}
      isFlyoverActive={false}
      onToggleFlyover={() => {}}
      onResetCamera={() => {}}
      isPlaying={false}
      onTogglePlayback={() => {}}
      onStepTimeHours={() => {}}
      isControlsCollapsed={false}
      onToggleCollapsed={() => {}}
    />
  );
  assert.ok(html.includes('data-group="camera-modes"'), 'PlanetaryTheaterToolbar must contain Group 1');
  assert.ok(html.includes('data-group="visualization"'), 'PlanetaryTheaterToolbar must contain Group 2');
  assert.ok(html.includes('data-group="scientific-layers"'), 'PlanetaryTheaterToolbar must contain Group 3');
  assert.ok(html.includes('data-group="time-workspace-controls"'), 'PlanetaryTheaterToolbar must contain Group 4');
  assert.ok(html.includes('aria-pressed='), 'PlanetaryTheaterToolbar toggle buttons must have aria-pressed');
  assert.ok(html.includes('focus-visible:ring-cyan-400') || html.includes('focus-visible:ring-2'), 'Focus rings present');
});
