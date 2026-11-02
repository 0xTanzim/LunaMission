import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SpatialWorkspace } from '../ui/SpatialWorkspace';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';
import { SpatialViewport } from '../ui/SpatialViewport';
import { DEFAULT_SPATIAL_PREFERENCES } from '../model/spatialPreferences';

function renderWorkspace(
  initialViewMode: 'map2d' | 'dual' | 'globe3d',
  initialPassportOpen?: boolean
) {
  return renderToStaticMarkup(
    React.createElement(
      ScenarioProvider,
      null,
      React.createElement(SpatialWorkspace, {
        initialViewMode,
        initialPassportOpen,
        onOpenMethodDetails: () => {},
        onNavigateHorizon: () => {},
      })
    )
  );
}

test('Stress: Dual View grid guarantees 100% full-width expansion (lg:col-span-12) with zero column cramping', () => {
  const html = renderWorkspace('dual');

  // Must have lg:col-span-12
  assert.ok(html.includes('lg:col-span-12'), 'Dual view must allocate all 12 columns to viewport');
  assert.ok(!html.includes('lg:col-span-8'), 'Dual view must not contain legacy 8-column constraint');
  assert.ok(!html.includes('lg:col-span-4'), 'Dual view must not contain legacy 4-column passport');
  assert.ok(!html.includes('data-testid="spatial-static-passport-column"'), 'Static passport must be absent');
  assert.ok(html.includes('data-testid="dual-passport-toggle"'), 'Pill toggle must be present');
});

test('Stress: 2D Map and 3D Moon modes strictly maintain 7/5 split and omit dual pill button', () => {
  for (const mode of ['map2d', 'globe3d'] as const) {
    const html = renderWorkspace(mode);

    assert.ok(html.includes('lg:col-span-7'), `${mode} must allocate 7 columns to viewport`);
    assert.ok(html.includes('lg:col-span-5'), `${mode} must allocate 5 columns to static passport`);
    assert.ok(html.includes('data-testid="spatial-static-passport-column"'), `${mode} must render static passport`);
    assert.ok(!html.includes('data-testid="dual-passport-toggle"'), `${mode} must not render dual toggle pill`);
    assert.ok(!html.includes('Selected Site Passport'), `${mode} must not render slide-over drawer`);
  }
});

test('Stress: initialPassportOpen=true in single view modes (2D/3D) does not leak drawer overlay', () => {
  for (const mode of ['map2d', 'globe3d'] as const) {
    const html = renderWorkspace(mode, true);

    // Even if initialPassportOpen is true, drawer overlay must only mount in dual mode
    assert.ok(!html.includes('Selected Site Passport'), `${mode} must ignore drawer open state`);
    assert.ok(html.includes('data-testid="spatial-static-passport-column"'), `${mode} must retain static passport`);
  }
});

test('Stress: PassportDrawer mounts cleanly in dual view when initialPassportOpen=true', () => {
  const html = renderWorkspace('dual', true);

  assert.ok(html.includes('Selected Site Passport'), 'Drawer title must render');
  assert.ok(html.includes('Close Point Passport overlay'), 'Close button must render');
  assert.ok(html.includes('JPL Horizons Benchmark Verified'), 'Provenance badge must render');
  assert.ok(html.includes('w-full sm:w-[500px] z-30'), 'Drawer must have fixed slide-over geometry');
});

test('Stress: SpatialViewport renders distinct visualizations for single and dual modes', () => {
  // 2D Map mode renders SouthPoleMap and suppresses 3D globe
  const mapHtml = renderToStaticMarkup(
    React.createElement(
      ScenarioProvider,
      null,
      React.createElement(SpatialViewport, {
        viewMode: 'map2d',
        preferences: DEFAULT_SPATIAL_PREFERENCES,
        onToggleLayer: () => {},
        onCameraPresetChange: () => {},
        onGlobeFallbackTo2D: () => {},
      })
    )
  );
  assert.ok(mapHtml.includes('South Pole Stereographic Map') || mapHtml.includes('svg'), '2D mode contains map');
  assert.ok(!mapHtml.includes('spatial-dual-viewport'), '2D mode does not render dual grid');

  // 3D Globe mode renders LunarGlobe3D
  const globeHtml = renderToStaticMarkup(
    React.createElement(
      ScenarioProvider,
      null,
      React.createElement(SpatialViewport, {
        viewMode: 'globe3d',
        preferences: DEFAULT_SPATIAL_PREFERENCES,
        onToggleLayer: () => {},
        onCameraPresetChange: () => {},
        onGlobeFallbackTo2D: () => {},
      })
    )
  );
  assert.ok(globeHtml.includes('3D Lunar Globe') || globeHtml.includes('canvas') || globeHtml.includes('VisualizationErrorBoundary') || globeHtml.includes('NASA SVS 3727'), '3D mode contains globe');
  assert.ok(!globeHtml.includes('spatial-dual-viewport'), '3D mode does not render dual grid');

  // Dual mode renders both in equal grid
  const dualHtml = renderToStaticMarkup(
    React.createElement(
      ScenarioProvider,
      null,
      React.createElement(SpatialViewport, {
        viewMode: 'dual',
        preferences: DEFAULT_SPATIAL_PREFERENCES,
        onToggleLayer: () => {},
        onCameraPresetChange: () => {},
        onGlobeFallbackTo2D: () => {},
      })
    )
  );
  assert.ok(dualHtml.includes('spatial-dual-viewport'), 'Dual mode renders dual viewport grid');
  assert.ok(dualHtml.includes('2D Polar Map'), 'Dual mode includes 2D panel');
  assert.ok(dualHtml.includes('3D Moon Globe'), 'Dual mode includes 3D panel');
});
