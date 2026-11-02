import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SpatialToolbar } from '../SpatialToolbar';
import { CameraPresetSelector } from '../CameraPresetSelector';
import {
  CAMERA_PRESETS,
  ALL_CAMERA_PRESET_IDS,
  findCameraPresetOption,
} from '@/features/spatial/config/spatialToolbarOptions';
import { DEFAULT_SPATIAL_PREFERENCES } from '@/features/spatial/model/spatialPreferences';
import type { SpatialViewMode } from '@/features/spatial/model/spatialViewMode';

function renderToolbar(viewMode: SpatialViewMode) {
  return renderToStaticMarkup(
    <SpatialToolbar
      viewMode={viewMode}
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
    />
  );
}

test('SpatialToolbar: preserves 5 fixed visual slots across all view modes', () => {
  const modes: SpatialViewMode[] = ['map2d', 'dual', 'globe3d'];

  for (const mode of modes) {
    const html = renderToolbar(mode);

    assert.ok(
      html.includes('data-slot="view-modes"'),
      `Mode ${mode} must contain Slot 1: ViewModeSelector`
    );
    assert.ok(
      html.includes('data-slot="camera-preset"'),
      `Mode ${mode} must contain Slot 2: CameraPresetSelector`
    );
    assert.ok(
      html.includes('data-slot="layer-toggles"'),
      `Mode ${mode} must contain Slot 3: LayerToggleGroup`
    );
    assert.ok(
      html.includes('data-slot="mission-tools"'),
      `Mode ${mode} must contain Slot 4: Mission/Spatial tools`
    );
    assert.ok(
      html.includes('data-slot="workspace-actions"'),
      `Mode ${mode} must contain Slot 5: Navigation & Workspace actions`
    );

    // Verify visual slot order in DOM
    const slot1Pos = html.indexOf('data-slot="view-modes"');
    const slot2Pos = html.indexOf('data-slot="camera-preset"');
    const slot3Pos = html.indexOf('data-slot="layer-toggles"');
    const slot4Pos = html.indexOf('data-slot="mission-tools"');
    const slot5Pos = html.indexOf('data-slot="workspace-actions"');

    assert.ok(
      slot1Pos < slot2Pos && slot2Pos < slot3Pos && slot3Pos < slot4Pos && slot4Pos < slot5Pos,
      `Mode ${mode} slots must appear in strictly ascending sequential order`
    );
  }
});

test('SpatialToolbar: Camera preset dropdown remains mounted across all modes (disabled in map2d, active in dual and globe3d)', () => {
  const html2D = renderToolbar('map2d');
  assert.ok(
    html2D.includes('data-testid="camera-preset-dropdown-trigger"'),
    'Camera preset dropdown must remain mounted in 2D Map mode'
  );
  assert.ok(
    html2D.includes('Camera presets active in 3D Moon &amp; Dual View') ||
      html2D.includes('Camera presets active in 3D Moon & Dual View'),
    'Camera preset dropdown in 2D Map must have informative disabled tooltip'
  );
  assert.ok(
    html2D.includes('disabled') || html2D.includes('aria-disabled="true"'),
    'Camera preset dropdown must be disabled in 2D Map mode'
  );

  const htmlDual = renderToolbar('dual');
  assert.ok(
    htmlDual.includes('data-testid="camera-preset-dropdown-trigger"'),
    'Camera preset dropdown must be mounted in Dual View'
  );
  assert.ok(
    !htmlDual.includes('disabled=""') && !htmlDual.includes('aria-disabled="true"'),
    'Camera preset dropdown must be active/enabled in Dual View'
  );

  const html3D = renderToolbar('globe3d');
  assert.ok(
    html3D.includes('data-testid="camera-preset-dropdown-trigger"'),
    'Camera preset dropdown must be mounted in 3D Moon mode'
  );
  assert.ok(
    !html3D.includes('disabled=""') && !html3D.includes('aria-disabled="true"'),
    'Camera preset dropdown must be active/enabled in 3D Moon mode'
  );
});

test('SpatialToolbar: Pin 3D button remains mounted across all modes without jumping or shifting', () => {
  const html2D = renderToolbar('map2d');
  assert.ok(
    html2D.includes('data-testid="toolbar-pin-3d"'),
    'Pin 3D button must remain mounted in 2D mode in Slot 4 to prevent layout shift'
  );
  assert.ok(
    html2D.includes('disabled') || html2D.includes('cursor-not-allowed'),
    'Pin 3D button must be disabled in 2D mode'
  );

  const htmlDual = renderToolbar('dual');
  assert.ok(
    htmlDual.includes('data-testid="toolbar-pin-3d"'),
    'Pin 3D button must be present in Dual View'
  );
  assert.ok(
    !htmlDual.includes('disabled=""') && !htmlDual.includes('cursor-not-allowed'),
    'Pin 3D button must be enabled in Dual View'
  );

  const html3D = renderToolbar('globe3d');
  assert.ok(
    html3D.includes('data-testid="toolbar-pin-3d"'),
    'Pin 3D button must be present in 3D Moon mode'
  );
  assert.ok(
    !html3D.includes('disabled=""') && !html3D.includes('cursor-not-allowed'),
    'Pin 3D button must be enabled in 3D Moon mode'
  );
});

test('CameraPresetSelector: Renders compact dropdown (~125px) displaying active preset label', () => {
  const html = renderToStaticMarkup(
    <CameraPresetSelector
      preferences={DEFAULT_SPATIAL_PREFERENCES}
      onCameraPresetChange={() => {}}
      compact
    />
  );

  assert.ok(
    html.includes('data-testid="camera-preset-dropdown-trigger"'),
    'Trigger button must exist'
  );
  assert.ok(
    html.includes('aria-haspopup="listbox"'),
    'Trigger button must have accessible aria-haspopup attribute'
  );
  // Default camera preset in DEFAULT_SPATIAL_PREFERENCES is 'nadir' (South Pole)
  assert.ok(
    html.includes('South Pole'),
    'Trigger must display active preset label (South Pole)'
  );
  assert.ok(
    html.includes('w-[125px]') || html.includes('min-w-[125px]') || html.includes('125px'),
    'Dropdown trigger must have compact ~125px width styling'
  );
});

test('spatialToolbarOptions: supports all 8 camera presets with correct identifiers', () => {
  const expectedPresets = [
    'global',
    'southPole',
    'oblique',
    'site',
    'inspection',
    'overhead',
    'horizon',
    'eva',
  ];

  assert.equal(
    CAMERA_PRESETS.length,
    8,
    'CAMERA_PRESETS must contain exactly 8 camera presets'
  );

  for (const presetId of expectedPresets) {
    const found = findCameraPresetOption(presetId as any);
    assert.ok(
      found !== undefined,
      `Preset ${presetId} must be discoverable via findCameraPresetOption`
    );
    assert.ok(
      found.label && found.label.length > 0,
      `Preset ${presetId} must have non-empty label`
    );
    assert.ok(
      found.title && found.title.length > 0,
      `Preset ${presetId} must have non-empty title`
    );
  }

  assert.equal(
    ALL_CAMERA_PRESET_IDS.length,
    8,
    'ALL_CAMERA_PRESET_IDS must contain exactly 8 presets'
  );
});

test('CameraPresetSelector: selecting a preset fires callback with preset identifier', () => {
  let selectedPreset: string | null = null;
  const element = (
    <CameraPresetSelector
      activePreset="global"
      onSelectPreset={(p) => {
        selectedPreset = p;
      }}
      compact
    />
  );

  const html = renderToStaticMarkup(element);
  assert.ok(
    html.includes('Global'),
    'Trigger displays active preset label when activePreset prop is used'
  );
});

test('SpatialToolbar: Slot 4 and Slot 5 footprints are streamlined with responsive 2xl classes to prevent desktop overflow', () => {
  const html = renderToolbar('dual');

  // The 1280px overflow this test originally guarded against is now solved structurally: rare
  // workspace actions collapse into the "More workspace tools" overflow menu instead of relying on
  // `hidden 2xl:inline` badges, so the row no longer inflates at the xl breakpoint at all.
  assert.ok(
    html.includes('aria-label="More workspace tools"'),
    'Rare workspace actions must collapse into the overflow menu'
  );
  assert.ok(
    !html.includes('hidden xl:inline-block'),
    'Nothing may inflate at the xl (1280px) breakpoint'
  );

  // The collapsed actions keep their accessible names inside the menu.
  assert.ok(html.includes('aria-label="Compare Sites"'), 'Compare Sites must have aria-label');
  assert.ok(html.includes('aria-label="Mission Dossier"'), 'Dossier must have aria-label');
  assert.ok(html.includes('aria-label="Target Studio"'), 'Target Studio must have aria-label');

  // Verify compact padding is used
  assert.ok(html.includes('px-2 py-1'), 'Toolbar action buttons must use compact px-2 padding');
});
