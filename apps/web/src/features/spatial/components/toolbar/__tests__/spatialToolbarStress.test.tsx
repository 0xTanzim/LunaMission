import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SpatialToolbar } from '../SpatialToolbar';
import { CameraPresetSelector } from '../CameraPresetSelector';
import {
  CAMERA_PRESETS,
  ALL_CAMERA_PRESET_IDS,
  CameraPresetId,
} from '@/features/spatial/config/spatialToolbarOptions';
import { DEFAULT_SPATIAL_PREFERENCES } from '@/features/spatial/model/spatialPreferences';
import type { SpatialViewMode } from '@/features/spatial/model/spatialViewMode';

function renderToolbarWithProps(props: Partial<React.ComponentProps<typeof SpatialToolbar>>) {
  return renderToStaticMarkup(
    <SpatialToolbar
      viewMode="dual"
      onViewModeChange={() => {}}
      preferences={DEFAULT_SPATIAL_PREFERENCES}
      onToggleLayer={() => {}}
      onCameraPresetChange={() => {}}
      isFullscreenActive={false}
      onToggleFullscreen={() => {}}
      onOpenComparisonModal={() => {}}
      onOpenMissionDossier={() => {}}
      onOpenCustomTargetStudio={() => {}}
      isPinpointMode={false}
      onTogglePinpointMode={() => {}}
      {...props}
    />
  );
}

test('Stress: 100 rapid viewMode transitions preserve invariant 5-slot structure and slot ordering', () => {
  const modes: SpatialViewMode[] = ['map2d', 'dual', 'globe3d'];

  for (let i = 0; i < 100; i++) {
    const currentMode = modes[i % modes.length];
    const html = renderToolbarWithProps({ viewMode: currentMode });

    // Assert all 5 slots exist
    const s1 = html.indexOf('data-slot="view-modes"');
    const s2 = html.indexOf('data-slot="camera-preset"');
    const s3 = html.indexOf('data-slot="layer-toggles"');
    const s4 = html.indexOf('data-slot="mission-tools"');
    const s5 = html.indexOf('data-slot="workspace-actions"');

    assert.ok(s1 !== -1, `Cycle ${i}: Slot 1 missing in ${currentMode}`);
    assert.ok(s2 !== -1, `Cycle ${i}: Slot 2 missing in ${currentMode}`);
    assert.ok(s3 !== -1, `Cycle ${i}: Slot 3 missing in ${currentMode}`);
    assert.ok(s4 !== -1, `Cycle ${i}: Slot 4 missing in ${currentMode}`);
    assert.ok(s5 !== -1, `Cycle ${i}: Slot 5 missing in ${currentMode}`);

    // Strictly ascending monotonic order
    assert.ok(
      s1 < s2 && s2 < s3 && s3 < s4 && s4 < s5,
      `Cycle ${i}: Slot positions violated monotonic ordering in ${currentMode}`
    );
  }
});

test('Stress: CameraPresetSelector renders faithful labels for every one of the 8 camera presets', () => {
  for (const presetId of ALL_CAMERA_PRESET_IDS) {
    const option = CAMERA_PRESETS.find((p) => p.id === presetId || p.preset === presetId);
    assert.ok(option, `Option for ${presetId} must exist in CAMERA_PRESETS`);

    const html = renderToStaticMarkup(
      <CameraPresetSelector
        activePreset={presetId as CameraPresetId}
        onSelectPreset={() => {}}
        compact
      />
    );

    assert.ok(
      html.includes(option.label),
      `Dropdown trigger must display label "${option.label}" when activePreset="${presetId}"`
    );
  }
});

test('Stress: In 2D Map mode, Camera Preset and Pin 3D controls are disabled with aerospace tooltips', () => {
  const html = renderToolbarWithProps({ viewMode: 'map2d' });

  // Camera preset disabled
  assert.ok(
    html.includes('data-testid="camera-preset-dropdown-trigger"'),
    'Camera trigger must be mounted in 2D'
  );
  assert.ok(
    html.includes('title="Camera presets active in 3D Moon &amp; Dual View"') ||
      html.includes('title="Camera presets active in 3D Moon & Dual View"'),
    'Camera trigger in 2D must display disabled tooltip'
  );

  // Pin 3D disabled
  assert.ok(html.includes('data-testid="toolbar-pin-3d"'), 'Pin 3D must be mounted in 2D');
  assert.ok(
    html.includes('title="3D pin drop active in 3D Moon &amp; Dual View"') ||
      html.includes('title="3D pin drop active in 3D Moon & Dual View"'),
    'Pin 3D in 2D must display disabled tooltip'
  );
  assert.ok(html.includes('cursor-not-allowed'), 'Pin 3D must show cursor-not-allowed in 2D');
});

test('Stress: In Dual View and 3D Moon modes, Camera Preset and Pin 3D controls are active', () => {
  for (const activeMode of ['dual', 'globe3d'] as const) {
    const html = renderToolbarWithProps({ viewMode: activeMode });

    // Camera preset enabled
    assert.ok(
      html.includes('data-testid="camera-preset-dropdown-trigger"'),
      `Camera trigger must be mounted in ${activeMode}`
    );
    assert.ok(
      !html.includes('Camera presets active in 3D Moon &amp; Dual View') &&
        !html.includes('Camera presets active in 3D Moon & Dual View'),
      `Camera trigger tooltip must not be disabled in ${activeMode}`
    );

    // Pin 3D enabled
    assert.ok(html.includes('data-testid="toolbar-pin-3d"'), `Pin 3D must be mounted in ${activeMode}`);
    assert.ok(
      html.includes('title="Click to drop a pin anywhere on the 3D Moon sphere"'),
      `Pin 3D title must indicate ready in ${activeMode}`
    );
  }
});

test('Stress: Pinpoint mode active state switches title and adds pulse styling in 3D/Dual', () => {
  const html = renderToolbarWithProps({
    viewMode: 'globe3d',
    isPinpointMode: true,
  });

  assert.ok(
    html.includes('title="Click Moon sphere to drop pin"'),
    'Pin 3D must show active pinpoint tooltip'
  );
  // Pinpoint collapsed into the overflow menu, so the armed state must be visible on the trigger
  // itself: a pulsing dot plus an accessible name that says which tool is active. A pulse hidden
  // inside a closed menu would tell the operator nothing.
  assert.ok(
    html.includes('motion-safe:animate-pulse'),
    'An armed collapsed tool must pulse on the overflow trigger'
  );
  assert.ok(
    html.includes('toolbar-overflow-active-dot'),
    'The overflow trigger must carry the active-state dot'
  );
  assert.ok(
    html.includes('Click Moon to Pin'),
    'Pin 3D must display "Click Moon to Pin" text'
  );
});

test('Stress: Fullscreen and optional action buttons remain in Slot 5 without displacement', () => {
  const htmlAllButtons = renderToolbarWithProps({
    viewMode: 'dual',
    onOpenComparisonModal: () => {},
    onOpenMissionDossier: () => {},
  });

  assert.ok(htmlAllButtons.includes('data-testid="toolbar-compare-sites"'));
  assert.ok(htmlAllButtons.includes('data-testid="toolbar-mission-dossier"'));
  assert.ok(htmlAllButtons.includes('aria-label="Enter Fullscreen"'));

  const htmlMinimal = renderToolbarWithProps({
    viewMode: 'dual',
    onOpenComparisonModal: undefined,
    onOpenMissionDossier: undefined,
  });

  assert.ok(!htmlMinimal.includes('data-testid="toolbar-compare-sites"'));
  assert.ok(!htmlMinimal.includes('data-testid="toolbar-mission-dossier"'));
  assert.ok(htmlMinimal.includes('aria-label="Enter Fullscreen"'));
  assert.ok(htmlMinimal.includes('data-slot="workspace-actions"'));
});
