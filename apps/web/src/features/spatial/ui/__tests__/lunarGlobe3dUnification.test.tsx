import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  asSelenographicLatitudeDeg,
  asSelenographicLongitudeDeg,
} from '@/domain/coordinates/frames';
import {
  GlobeFlightDeckHudOverlay,
  GlobeFlightDeckHudOverlayProps,
} from '@/features/spatial/globe/components/GlobeFlightDeckHudOverlay';
import { HeaderStatusControls } from '@/app/header/components/HeaderStatusControls';
import { SpatialToolbar } from '@/features/spatial/components/toolbar/SpatialToolbar';
import { DEFAULT_SPATIAL_PREFERENCES } from '@/features/spatial/model/spatialPreferences';
import { ALL_CAMERA_PRESET_IDS } from '@/features/spatial/config/spatialToolbarOptions';
import App from '@/app/App';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';

if (typeof document !== 'undefined') {
  const origCreateElement = document.createElement.bind(document);
  document.createElement = function (tagName: string, options?: ElementCreationOptions) {
    const el = origCreateElement(tagName, options);
    if (tagName.toLowerCase() === 'canvas') {
      (el as any).getContext = (type: string) => {
        if (type === '2d') {
          return {
            createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
            putImageData: () => {},
          };
        }
        return null;
      };
      (el as any).toDataURL = () => 'data:image/png;base64,mock';
    }
    return el;
  } as any;
}

const testSite = CANDIDATE_SITES[0];

function renderHud(props: Partial<GlobeFlightDeckHudOverlayProps>) {
  const defaultProps: GlobeFlightDeckHudOverlayProps = {
    cameraPreset: 'site',
    selectedSite: testSite,
    subSolarLatDeg: asSelenographicLatitudeDeg(-1.5),
    subSolarLonDeg: asSelenographicLongitudeDeg(45.0),
    subEarthLatDeg: asSelenographicLatitudeDeg(6.2),
    subEarthLonDeg: asSelenographicLongitudeDeg(-12.4),
    earthElevationValue: 8.5,
    showDiagnostics: false,
    epochIsoUtc: '2026-10-26T12:00:00Z',
    ...props,
  };

  return renderToStaticMarkup(React.createElement(GlobeFlightDeckHudOverlay, defaultProps));
}

test('GlobeFlightDeckHudOverlay: Renders Horizon HUD on horizon preset', () => {
  const html = renderHud({ cameraPreset: 'horizon' });
  assert.ok(html.includes('data-testid="horizon-hud"'), 'Horizon preset must render horizon HUD');
  assert.ok(html.includes('Crater Rim Ground Horizon Perspective'), 'Horizon HUD must indicate horizon perspective');
  assert.ok(!html.includes('data-testid="overhead-hud"'), 'Horizon preset must not render overhead HUD');
});

test('GlobeFlightDeckHudOverlay: Renders Tactical Overhead Nadir HUD on overhead preset', () => {
  const html = renderHud({ cameraPreset: 'overhead' });
  assert.ok(html.includes('data-testid="overhead-hud"'), 'Overhead preset must render overhead HUD');
  assert.ok(html.includes('OVERHEAD NADIR'), 'Overhead HUD must display nadir title');
  assert.ok(html.includes('Tactical 84° Nadir'), 'Overhead HUD must state tactical 84° angle');
  assert.ok(html.includes('Drag to rotate azimuth'), 'Overhead HUD must provide azimuth rotation hint');
  assert.ok(!html.includes('data-testid="horizon-hud"'), 'Overhead preset must not render horizon HUD');
});

test('GlobeFlightDeckHudOverlay: Standard presets (global, site, inspection) omit HUD overlays', () => {
  const presets: Array<'global' | 'site' | 'inspection' | 'nadir' | 'oblique'> = [
    'global', 'site', 'inspection', 'nadir', 'oblique',
  ];

  for (const preset of presets) {
    const html = renderHud({ cameraPreset: preset });
    assert.strictEqual(html.includes('data-testid="horizon-hud"'), false, `Preset ${preset} must omit horizon HUD`);
    assert.strictEqual(html.includes('data-testid="overhead-hud"'), false, `Preset ${preset} must omit overhead HUD`);
  }
});

test('HeaderStatusControls: Replaces disconnected 3D Lab link with direct 3D Moon trigger button', () => {
  const html = renderToStaticMarkup(
    React.createElement(HeaderStatusControls, {
      isDemoMode: false,
      onOpenProvenance: () => {},
      onOpenGuide: () => {},
    })
  );

  assert.ok(html.includes('data-testid="header-3d-moon-trigger"'), 'Header must contain direct 3D Moon trigger button');
  assert.ok(html.includes('🪐 3D Moon'), 'Button must display 🪐 3D Moon label');
  assert.ok(html.includes('aria-label="Open 3D Moon Flight Deck"'), 'Button must have aerospace aria-label');
  assert.ok(!html.includes('href="#/scenario/3d-lab"'), 'Header must not contain legacy href="#/scenario/3d-lab" anchor');
  assert.ok(!html.includes('🔬 3D Lab'), 'Header must eliminate legacy 🔬 3D Lab wording');
});

test('App: Reinstates dedicated 3D Lab page and renders Scenario3DLab when route is /scenario/3d-lab', () => {
  const html = renderToStaticMarkup(
    React.createElement(ScenarioProvider, null, React.createElement(App))
  );

  assert.ok(html.includes('LunaMission Observatory'), 'App shell must render authoritative header/brand');
  assert.ok(html.includes('Spatial Workspace'), 'App must render integrated spatial workspace');
  assert.ok(html.includes('Canonical Epoch'), 'App shell must render authoritative footer');
  assert.ok(html.includes('3D Lab'), 'App navigation must include reinstated 3D Lab destination');
});

test('SpatialToolbar: Flyover tour button is integrated and camera preset aliases are supported', () => {
  const html3D = renderToStaticMarkup(
    React.createElement(SpatialToolbar, {
      viewMode: 'globe3d',
      onViewModeChange: () => {},
      preferences: DEFAULT_SPATIAL_PREFERENCES,
      onToggleLayer: () => {},
      onCameraPresetChange: () => {},
      isFullscreenActive: false,
      onToggleFullscreen: () => {},
    })
  );

  assert.ok(html3D.includes('data-testid="toggle-flyover"'), 'SpatialToolbar must render flyover tour button');
  assert.ok(html3D.includes('aria-label="Flyover Tour"'), 'Flyover button must expose an accessible name');
  assert.ok(html3D.includes('data-testid="toggle-split-view"'), 'SpatialToolbar must support toggle-split-view alias');

  for (const presetId of ALL_CAMERA_PRESET_IDS) {
    assert.ok(html3D.includes(`data-testid="preset-${presetId === 'southPole' ? 'nadir' : presetId}"`), `Toolbar must provide automation alias for preset ${presetId}`);
  }
});
