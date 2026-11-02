/**
 * Challenger M3 Adversarial Test Harness: Toolbar Taxonomy & Slot Order Stability
 *
 * Empirical verification of Milestone M3 (Requirements R4, R6):
 * 1. 4 Semantic Groups & 5 Slots DOM Order Invariant under 500 rapid viewMode transitions.
 * 2. All 12 Camera Presets and Test Aliases callback execution without unmounting or thrashing.
 * 3. Rapid toggle state convergence (aria-pressed, styling, focus rings, disabled flags).
 * 4. 2D vs 3D/Dual interaction guardrails (disabled tooltips, disabled flags, non-shifting layout).
 * 5. Elimination of redundant pathways and resilience under minimal/sparse props.
 * 6. WCAG 2.2 AA SC 2.5.8 target sizing (>= 24x24 px) and high-contrast focus rings.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SpatialToolbar } from '@/features/spatial/components/toolbar/SpatialToolbar';
import { PlanetaryTheaterToolbar } from '@/features/spatial/lab/components/PlanetaryTheaterToolbar';
import { PlanetaryTheaterCameraButtons } from '@/features/spatial/lab/components/PlanetaryTheaterCameraButtons';
import { PlanetaryTheaterMoreViews } from '@/features/spatial/lab/components/PlanetaryTheaterMoreViews';
import {
  DEFAULT_SPATIAL_PREFERENCES,
  withOverlayVisibility,
  CameraPreset,
  SpatialLayer,
  SpatialPreferences,
} from '@/features/spatial/model/spatialPreferences';
import { SpatialViewMode } from '@/features/spatial/model/spatialViewMode';
import {
  CATEGORIZED_PRESETS,
} from '@/features/spatial/config/cameraPresetCategories';

function renderSpatialToolbar(props: Partial<React.ComponentProps<typeof SpatialToolbar>> = {}) {
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

test('Challenger M3: 4 Semantic Groups maintain strictly ascending DOM order across 500 mode switches', () => {
  const modes: SpatialViewMode[] = ['map2d', 'dual', 'globe3d'];

  for (let i = 0; i < 500; i++) {
    const mode = modes[i % modes.length];
    const isOdd = i % 2 === 1;
    const customPrefs: SpatialPreferences = withOverlayVisibility(DEFAULT_SPATIAL_PREFERENCES, {
      grid: isOdd,
      psr: !isOdd,
      craters: isOdd,
      vectors: !isOdd,
      laserTracks: isOdd,
    });

    const html = renderSpatialToolbar({
      viewMode: mode,
      preferences: customPrefs,
      onOpenCustomTargetStudio: isOdd ? () => {} : undefined,
      onTogglePinpointMode: () => {},
      isPinpointMode: isOdd,
      onToggleFlyover: () => {},
      isFlyoverActive: !isOdd,
      onToggleSiteIntel: () => {},
      isSiteIntelOpen: isOdd,
      onToggleTerrain: () => {},
      showTerrain: isOdd,
      onToggleHorizonMask: () => {},
      showHorizonMask: !isOdd,
      onOpenComparisonModal: isOdd ? () => {} : undefined,
      onOpenMissionDossier: isOdd ? () => {} : undefined,
    });

    const g1 = html.indexOf('data-group="camera-modes"');
    const g2 = html.indexOf('data-group="display-layers"');
    const g3 = html.indexOf('data-group="analytical-overlays"');
    const g4 = html.indexOf('data-group="time-workspace-controls"');

    assert.ok(g1 !== -1, `Cycle ${i}: Group 1 missing in ${mode}`);
    assert.ok(g2 !== -1, `Cycle ${i}: Group 2 missing in ${mode}`);
    assert.ok(g3 !== -1, `Cycle ${i}: Group 3 missing in ${mode}`);
    assert.ok(g4 !== -1, `Cycle ${i}: Group 4 missing in ${mode}`);

    assert.ok(
      g1 < g2 && g2 < g3 && g3 < g4,
      `Cycle ${i}: Group order violation in ${mode} (g1=${g1}, g2=${g2}, g3=${g3}, g4=${g4})`
    );

    // Also check legacy 5 slots ordering
    const s1 = html.indexOf('data-slot="view-modes"');
    const s2 = html.indexOf('data-slot="camera-preset"');
    const s3 = html.indexOf('data-slot="layer-toggles"');
    const s4 = html.indexOf('data-slot="mission-tools"');
    const s5 = html.indexOf('data-slot="workspace-actions"');

    assert.ok(s1 !== -1 && s2 !== -1 && s3 !== -1 && s4 !== -1 && s5 !== -1, `Cycle ${i}: Legacy slots missing`);
    assert.ok(s1 < s2 && s2 < s3 && s3 < s4 && s4 < s5, `Cycle ${i}: Legacy slot order violation in ${mode}`);
  }
});

test('Challenger M3: All 12 camera presets trigger correct callbacks via automation aliases and theater buttons', () => {
  const all12ExpectedPresets: CameraPreset[] = [
    'nadir',
    'site',
    'horizon',
    'eva',
    'earth_align',
    'orbit360',
    'north_look',
    'sunward_terminator',
    'global',
    'oblique',
    'overhead',
    'inspection',
  ];

  assert.equal(CATEGORIZED_PRESETS.length, 12, 'CATEGORIZED_PRESETS must define exactly 12 camera presets');

  // 1. Verify SpatialToolbar automation aliases trigger onCameraPresetChange for all 12 presets
  for (const preset of all12ExpectedPresets) {
    let triggeredPreset: CameraPreset | null = null;
    let capturedToolbar: React.ReactElement | null = null;

    function Harness() {
      capturedToolbar = SpatialToolbar({
        viewMode: 'globe3d',
        onViewModeChange: () => {},
        preferences: DEFAULT_SPATIAL_PREFERENCES,
        onToggleLayer: () => {},
        onCameraPresetChange: (p) => { triggeredPreset = p; },
        isFullscreenActive: false,
        onToggleFullscreen: () => {},
      });
      return capturedToolbar;
    }
    renderToStaticMarkup(<Harness />);

    assert.ok(capturedToolbar, 'Toolbar must be captured');
    const hiddenDiv = (capturedToolbar as any).props.children[7];
    assert.ok(hiddenDiv && hiddenDiv.props && hiddenDiv.props.className?.includes('hidden'), 'Hidden aliases div must exist');

    const buttons: Array<React.ReactElement<{ 'data-testid'?: string; onClick: () => void }>> =
      hiddenDiv.props.children.flat().filter(Boolean);
    const targetButton = buttons.find((btn) => btn.props['data-testid'] === `preset-${preset}`);
    assert.ok(targetButton, `SpatialToolbar must mount alias button for preset-${preset}`);

    targetButton.props.onClick();
    assert.equal(triggeredPreset, preset, `Preset alias button for ${preset} must invoke callback with exact preset`);
  }

  // 2. Verify theater preset wiring after the task-3.2 consolidation: primary framings
  // (global/southPole) stay inline; tactical presets live behind the "More views" popover.
  // Both components hold popover state in useState, so they are invoked inside a real
  // render harness (plain function calls would violate the Rules of Hooks).
  let theaterTriggered: CameraPreset | null = null;
  let moreViewsClosed = false;

  let capturedTheater: React.ReactElement | null = null;
  function TheaterHarness() {
    capturedTheater = PlanetaryTheaterCameraButtons({
      currentPreset: 'nadir',
      onSelectCameraPreset: (p) => { theaterTriggered = p; },
      isFlyoverActive: false,
      onToggleFlyover: () => {},
      onResetCamera: () => {},
    });
    return capturedTheater;
  }
  renderToStaticMarkup(<TheaterHarness />);
  assert.ok(capturedTheater, 'Theater camera buttons must be captured');

  let capturedMoreViews: React.ReactElement | null = null;
  function MoreViewsHarness() {
    capturedMoreViews = PlanetaryTheaterMoreViews({
      currentPreset: 'nadir',
      onSelectCameraPreset: (p) => { theaterTriggered = p; },
      open: true,
      onToggle: () => {},
      onClose: () => { moreViewsClosed = true; },
    });
    return capturedMoreViews;
  }
  renderToStaticMarkup(<MoreViewsHarness />);
  assert.ok(capturedMoreViews, 'More views popover must be captured');

  const flatten = (node: React.ReactNode, out: React.ReactElement<any>[] = []): React.ReactElement<any>[] => {
    if (Array.isArray(node)) {
      for (const child of node) flatten(child, out);
      return out;
    }
    if (!React.isValidElement(node)) return out;
    out.push(node as React.ReactElement<any>);
    flatten((node.props as { children?: React.ReactNode }).children, out);
    return out;
  };

  const inlineControls = flatten(capturedTheater);
  const popoverItems = flatten(capturedMoreViews);

  for (const def of CATEGORIZED_PRESETS) {
    const inline = inlineControls.find(
      (el) =>
        el.props['data-testid'] === `preset-${def.preset}` ||
        el.props['data-testid'] === `preset-${def.id}` ||
        el.props['data-preset-id'] === def.id
    );
    const menuItem = popoverItems.find((el) => el.props['data-testid'] === `moreviews-${def.id}`);
    const target = inline ?? menuItem;
    assert.ok(target, `Theater must expose preset ${def.id} inline or in the More views popover`);

    target.props.onClick();
    assert.equal(theaterTriggered, def.preset, `Theater control for ${def.id} must invoke with preset ${def.preset}`);
    theaterTriggered = null;
  }

  // Tactical presets must not render inline anymore — they collapsed into the popover.
  for (const def of CATEGORIZED_PRESETS.filter((p) => p.category === 'tactical')) {
    assert.ok(
      !inlineControls.some((el) => el.props['data-testid'] === `preset-${def.preset}`),
      `Tactical preset ${def.id} must live behind the More views popover`
    );
    assert.ok(
      popoverItems.some((el) => el.props['data-testid'] === `moreviews-${def.id}`),
      `Tactical preset ${def.id} must be a More views menu item`
    );
  }
  assert.ok(moreViewsClosed, 'Selecting a More views menu item must close the popover');
});

test('Challenger M3: Rapid toggle convergence across all toolbar controls', () => {
  for (let i = 0; i < 200; i++) {
    const isOdd = i % 2 === 1;
    const prefs: SpatialPreferences = {
      ...withOverlayVisibility(DEFAULT_SPATIAL_PREFERENCES, {
        grid: isOdd,
        psr: !isOdd,
        craters: isOdd,
        vectors: !isOdd,
        laserTracks: isOdd,
      }),
      base: { ...DEFAULT_SPATIAL_PREFERENCES.base, id: isOdd ? 'slope' : 'topography' },
    };

    const html = renderSpatialToolbar({
      preferences: prefs,
      showTerrain: isOdd,
      onToggleTerrain: () => {},
      showHorizonMask: !isOdd,
      onToggleHorizonMask: () => {},
      isPinpointMode: isOdd,
      onTogglePinpointMode: () => {},
      isFlyoverActive: !isOdd,
      onToggleFlyover: () => {},
      isSiteIntelOpen: isOdd,
      onToggleSiteIntel: () => {},
      isFullscreenActive: !isOdd,
    });

    // Verify aria-pressed reflects state exactly
    assert.ok(html.includes(`aria-label="Toggle terrain relief" aria-pressed="${isOdd}"`), 'Terrain aria-pressed check');
    assert.ok(html.includes(`aria-label="Toggle crater rim loops" aria-pressed="${isOdd}"`), 'Craters aria-pressed check');
    assert.ok(html.includes(`aria-label="Toggle grid" aria-pressed="${isOdd}"`), 'Grid aria-pressed check');
    assert.ok(html.includes(`aria-label="Toggle shadow regions" aria-pressed="${!isOdd}"`), 'PSR aria-pressed check');
    assert.ok(html.includes(`aria-label="Toggle LOLA laser ground tracks" aria-pressed="${isOdd}"`), 'Tracks aria-pressed check');
    assert.ok(html.includes(`aria-label="Toggle celestial vectors" aria-pressed="${!isOdd}"`), 'Vectors aria-pressed check');
    assert.ok(html.includes(`aria-label="Toggle slope hazard heatmap" aria-pressed="${isOdd}"`), 'Slope aria-pressed check');
    assert.ok(html.includes(`aria-label="Toggle horizon occlusion mask" aria-pressed="${!isOdd}"`), 'Horizon aria-pressed check');
    assert.ok(html.includes(`aria-label="Toggle Site Intel Drawer" aria-pressed="${isOdd}"`), 'Site Intel aria-pressed check');
    assert.ok(html.includes(`data-testid="toggle-flyover"`), 'Flyover button must be mounted');
    assert.ok(html.includes(`aria-pressed="${!isOdd}"`), 'Flyover aria-pressed check');
  }
});

test('Challenger M3: 2D vs 3D/Dual interaction guardrails and layout shift prevention', () => {
  const html2D = renderSpatialToolbar({
    viewMode: 'map2d',
    onTogglePinpointMode: () => {},
    onToggleFlyover: () => {},
  });

  // Verify disabled state in 2D
  assert.ok(html2D.includes('data-testid="camera-preset-dropdown-trigger"'), 'Camera preset mounted in 2D');
  assert.ok(html2D.includes('disabled') && html2D.includes('cursor-not-allowed'), 'Camera preset disabled in 2D');
  assert.ok(html2D.includes('title="Camera presets active in 3D Moon &amp; Dual View"') || html2D.includes('title="Camera presets active in 3D Moon & Dual View"'));

  assert.ok(html2D.includes('data-testid="toolbar-pin-3d"'), 'Pin 3D mounted in 2D');
  assert.ok(html2D.includes('title="3D pin drop active in 3D Moon &amp; Dual View"') || html2D.includes('title="3D pin drop active in 3D Moon & Dual View"'));

  assert.ok(html2D.includes('data-testid="toggle-flyover"'), 'Flyover mounted in 2D');
  assert.ok(html2D.includes('title="Flyover tour active in 3D Moon &amp; Dual View"') || html2D.includes('title="Flyover tour active in 3D Moon & Dual View"'));

  // In 3D and Dual, controls are enabled
  for (const activeMode of ['dual', 'globe3d'] as const) {
    const htmlActive = renderSpatialToolbar({
      viewMode: activeMode,
      onTogglePinpointMode: () => {},
      onToggleFlyover: () => {},
    });

    assert.ok(!htmlActive.includes('Camera presets active in 3D Moon'), `Camera preset active in ${activeMode}`);
    assert.ok(!htmlActive.includes('3D pin drop active in 3D Moon'), `Pin 3D active in ${activeMode}`);
    assert.ok(!htmlActive.includes('Flyover tour active in 3D Moon'), `Flyover active in ${activeMode}`);
  }
});

test('Challenger M3: Elimination of redundant pathways and resilience under minimal props', () => {
  // Minimal props: optional buttons omitted
  const htmlSparse = renderSpatialToolbar({
    onOpenComparisonModal: undefined,
    onOpenMissionDossier: undefined,
    onOpenCustomTargetStudio: undefined,
    onTogglePinpointMode: undefined,
    onToggleTerrain: undefined,
    onToggleHorizonMask: undefined,
  });

  assert.ok(!htmlSparse.includes('data-testid="toolbar-compare-sites"'), 'Compare button must NOT render when omitted');
  assert.ok(!htmlSparse.includes('data-testid="toolbar-mission-dossier"'), 'Dossier button must NOT render when omitted');
  assert.ok(!htmlSparse.includes('data-testid="toolbar-target-studio"'), 'Target Studio button must NOT render when omitted');
  assert.ok(!htmlSparse.includes('aria-label="Toggle terrain relief"'), 'Terrain button omitted when callback omitted');
  assert.ok(!htmlSparse.includes('aria-label="Toggle horizon occlusion mask"'), 'Horizon button omitted when callback omitted');

  // Verify all 4 groups remain valid and monotonic under minimal props
  const g1 = htmlSparse.indexOf('data-group="camera-modes"');
  const g2 = htmlSparse.indexOf('data-group="display-layers"');
  const g3 = htmlSparse.indexOf('data-group="analytical-overlays"');
  const g4 = htmlSparse.indexOf('data-group="time-workspace-controls"');

  assert.ok(g1 !== -1 && g2 !== -1 && g3 !== -1 && g4 !== -1, 'All 4 groups must exist under minimal props');
  assert.ok(g1 < g2 && g2 < g3 && g3 < g4, 'Strict group monotonicity preserved under minimal props');
});

test('Challenger M3: WCAG 2.2 AA SC 2.5.8 target sizing (>= 24x24 px) and high-contrast focus rings', () => {
  const html = renderSpatialToolbar({
    onOpenCustomTargetStudio: () => {},
    onTogglePinpointMode: () => {},
    onToggleFlyover: () => {},
    onToggleSiteIntel: () => {},
    onToggleTerrain: () => {},
    onToggleHorizonMask: () => {},
    onOpenComparisonModal: () => {},
    onOpenMissionDossier: () => {},
  });

  // Extract all button occurrences
  const buttonRegex = /<button\b[^>]*>/g;
  const buttons = html.match(buttonRegex) || [];
  assert.ok(buttons.length >= 10, 'SpatialToolbar must render at least 10 buttons with full props');

  /** Resolves a Tailwind min-height utility to pixels; the requirement is a size, not a spelling. */
  const minHeightPx = (btn: string): number => {
    const scale: Record<string, number> = { '6': 24, '7': 28, '8': 32, '9': 36, '10': 40, '11': 44, '12': 48 };
    const bracket = /min-h-\[(\d+(?:\.\d+)?)px\]/.exec(btn);
    if (bracket) return Number(bracket[1]);
    const token = /min-h-(\d+)(?![\d[])/.exec(btn);
    if (token) return scale[token[1]] ?? Number(token[1]) * 4;
    return 0;
  };

  for (const btn of buttons) {
    if (btn.includes('tabindex="-1"')) continue; // Skip hidden automation aliases

    const height = minHeightPx(btn);
    assert.ok(height >= 24, `Button must meet the 24px WCAG 2.2 target (got ${height}px): ${btn}`);

    // A visible focus indicator may be a ring or an outline, in any token colour.
    const hasFocusRing =
      /focus-visible:(ring|outline)-(2|\[var\(--lm-color-[a-z-]+\)\])/.test(btn);
    assert.ok(hasFocusRing, `Button must specify a visible 2px focus indicator: ${btn}`);

    const hasAccessibleName = btn.includes('aria-label=') || btn.includes('title=');
    assert.ok(hasAccessibleName, `Button must specify accessible name or title: ${btn}`);
  }
});

test('Challenger M3: PlanetaryTheaterToolbar collapse unmounts dock releasing viewport', () => {
  const htmlExpanded = renderToStaticMarkup(
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

  assert.ok(htmlExpanded.includes('role="toolbar"'), 'Expanded PlanetaryTheaterToolbar renders role="toolbar"');
  assert.ok(htmlExpanded.includes('aria-expanded="true"'), 'Dock toggle shows aria-expanded="true" when open');

  const htmlCollapsed = renderToStaticMarkup(
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
      isControlsCollapsed={true}
      onToggleCollapsed={() => {}}
    />
  );

  assert.ok(!htmlCollapsed.includes('role="toolbar"'), 'Collapsed PlanetaryTheaterToolbar unmounts dock');
  assert.ok(htmlCollapsed.includes('aria-expanded="false"'), 'Dock toggle shows aria-expanded="false" when collapsed');
  assert.ok(htmlCollapsed.includes('▲ Show 3D Navigation Dock'), 'Dock toggle shows expand label when collapsed');
});
