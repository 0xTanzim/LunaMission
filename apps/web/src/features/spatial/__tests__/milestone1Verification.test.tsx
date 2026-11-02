import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import App from '@/app/App';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';
import { HeaderNavigation } from '@/app/header/components/HeaderNavigation';
import { NAV_TABS, NAV_TAB_TITLES } from '@/app/header/config/navTabs';
import {
  ALL_CAMERA_PRESET_IDS,
  CAMERA_PRESETS,
  CAMERA_PRESET_ALIASES,
  findCameraPresetOption,
} from '@/features/spatial/config/spatialToolbarOptions';
import { cameraPoseForPreset } from '@/features/spatial/globe/scene/globeCameraPresets';
import { CANDIDATE_SITES } from '@luna/contracts';
import { SpatialWorkspace } from '@/features/spatial/ui/SpatialWorkspace';
import { Scenario3DLab } from '@/features/spatial/lab/Scenario3DLab';
import { MapCanvas } from '@/features/spatial/map/components/MapCanvas';
import { composeMapLayers } from '@/features/spatial/model/mapLayerStack';
import { DEFAULT_SPATIAL_PREFERENCES } from '@/features/spatial/model/spatialPreferences';
import { LunarGlobe3D } from '@/features/spatial/ui/LunarGlobe3D';

const testSite = CANDIDATE_SITES[0];

test('Milestone 1: 3D Lab is configured in navTabs and HeaderNavigation with min 44x44px target', () => {
  assert.equal(NAV_TABS.lab.id, 'lab');
  assert.equal(NAV_TABS.lab.path, '/scenario/3d-lab');
  assert.equal(NAV_TAB_TITLES.lab, '3D Planetary Theater Lab');

  const navHtml = renderToStaticMarkup(
    <HeaderNavigation activeTab="lab" onSelect={() => {}} />
  );
  assert.ok(navHtml.includes('3D Lab'), 'Navigation must include 3D Lab label');
  assert.ok(navHtml.includes('min-h-[44px] min-w-[44px]'), 'Buttons must meet >= 44x44px target size');
});

test('Milestone 1: App renders Scenario3DLab when activeTab is lab', () => {
  const originalWindow = (globalThis as any).window;
  try {
    (globalThis as any).window = {
      location: {
        pathname: '/scenario/3d-lab',
        hash: '',
        search: '',
        href: 'http://localhost/scenario/3d-lab',
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };

    const html = renderToStaticMarkup(
      <ScenarioProvider>
        <App />
      </ScenarioProvider>
    );

    assert.ok(html.includes('LunaMission 3D Lab'), 'App must render Scenario3DLab header when on /scenario/3d-lab');
    assert.ok(html.includes('STANDALONE 3D HARNESS'), 'App must render 3D Lab standalone harness badge');
  } finally {
    (globalThis as any).window = originalWindow;
  }
});

test('Milestone 1: 8 Authoritative Camera Presets are defined and produce valid poses', () => {
  const authoritativePresets = [
    'nadir',
    'site',
    'horizon',
    'eva',
    'earth_align',
    'orbit360',
    'north_look',
    'sunward_terminator',
  ] as const;

  assert.equal(ALL_CAMERA_PRESET_IDS.length, 8);

  for (const preset of authoritativePresets) {
    const opt = findCameraPresetOption(preset);
    assert.ok(opt, `Must find camera preset option for ${preset}`);
    const pose = cameraPoseForPreset(preset, testSite);
    assert.ok(pose.camPos && !Number.isNaN(pose.camPos.x), `${preset} camPos must be finite`);
    assert.ok(pose.lookTarget && !Number.isNaN(pose.lookTarget.x), `${preset} lookTarget must be finite`);
    assert.ok(pose.upVector && !Number.isNaN(pose.upVector.x), `${preset} upVector must be finite`);
  }

  // Backward compatible aliases
  const aliases = ['global', 'oblique', 'overhead', 'inspection', 'southPole'] as const;
  for (const alias of aliases) {
    const opt = findCameraPresetOption(alias);
    assert.ok(opt, `Alias ${alias} must resolve cleanly`);
  }
});

test('Milestone 1: SpatialWorkspace fullscreen retains docked TimeExplorer', () => {
  const html = renderToStaticMarkup(
    <ScenarioProvider>
      <SpatialWorkspace
        initialViewMode="globe3d"
        onViewModeChange={() => {}}
        onOpenMethodDetails={() => {}}
        onNavigateHorizon={() => {}}
      />
    </ScenarioProvider>
  );

  assert.ok(html.includes('Time Explorer') || html.includes('Time Control') || html.includes('Epoch'), 'TimeExplorer must be rendered');
});

test('Milestone 1: MapCanvas and LunarGlobe3D containers enforce touch-none isolation', () => {
  const mapHtml = renderToStaticMarkup(
    <MapCanvas
      svgRef={{ current: null }}
      zoom={1}
      viewportStyle={{}}
      composition={composeMapLayers(DEFAULT_SPATIAL_PREFERENCES.base, DEFAULT_SPATIAL_PREFERENCES.overlays)}
      baseRasterUrl={null}
      selectedSite={testSite}
      sitePos={{ x: 300, y: 300 }}
      siteVectors={{
        sunAzimuthDeg: { kind: 'available', value: 50 as any, unit: 'deg' },
        sunElevationDeg: { kind: 'available', value: 1.5 as any, unit: 'deg' },
        earthAzimuthDeg: { kind: 'available', value: 10 as any, unit: 'deg' },
        earthElevationDeg: { kind: 'available', value: 6.5 as any, unit: 'deg' },
      }}
      hoveredSite={null}
      hoverPreview={null}
      customPoint={null}
      onSelectSite={() => {}}
      onHoverSite={() => {}}
      onOpenVectorPopover={() => {}}
      gestures={{
        onMouseDown: () => {},
        onMouseMove: () => {},
        onMouseUp: () => {},
        onMouseLeave: () => {},
        onWheel: () => {},
        onClick: () => {},
      }}
    />
  );
  assert.ok(mapHtml.includes('touch-none'), 'MapCanvas must include touch-none class');
  assert.ok(mapHtml.includes('touch-action:none'), 'MapCanvas must include touch-action:none style');

  const globeHtml = renderToStaticMarkup(
    <LunarGlobe3D
      selectedSite={testSite}
      onSelectSite={() => {}}
      subSolarLatDeg={-1.5 as any}
      subSolarLonDeg={45 as any}
      subEarthLatDeg={6.5 as any}
      subEarthLonDeg={-12 as any}
      showGrid
      showShadowRegions
      showVectors
      showLaserTracks
      showTerrain
      showMarkers
      showLabels
      onToggleGrid={() => {}}
      onToggleShadowRegions={() => {}}
      onToggleVectors={() => {}}
      cameraPreset="nadir"
      onCameraPresetChange={() => {}}
    />
  );
  assert.ok(globeHtml.includes('touch-none'), 'LunarGlobe3D must include touch-none class');
  assert.ok(globeHtml.includes('touch-action:none'), 'LunarGlobe3D must include touch-action:none style');
});
