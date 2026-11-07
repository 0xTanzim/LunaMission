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

test('Stress: SpatialViewport keeps one persistent panel tree; single modes hide, never unmount', () => {
  const renderViewport = (viewMode: 'map2d' | 'dual' | 'globe3d') =>
    renderToStaticMarkup(
      React.createElement(
        ScenarioProvider,
        null,
        React.createElement(SpatialViewport, {
          viewMode,
          preferences: DEFAULT_SPATIAL_PREFERENCES,
          onToggleLayer: () => {},
          onCameraPresetChange: () => {},
          onGlobeFallbackTo2D: () => {},
        })
      )
    );

  // Both visualizations stay in the tree in every mode (spec: spatial-visualization,
  // globe scene persistence) — switching modes must never unmount the WebGL globe.
  for (const [mode, html] of [['map2d', renderViewport('map2d')], ['dual', renderViewport('dual')], ['globe3d', renderViewport('globe3d')]] as const) {
    assert.ok(html.includes('spatial-dual-viewport'), `${mode} renders the persistent viewport container`);
    assert.ok(html.includes('svg'), `${mode} keeps the 2D map mounted`);
    assert.ok(html.includes('3D view loading') || html.includes('cursor-grab'), `${mode} keeps the globe mounted`);
  }

  const isHidden = (html: string, panel: 'spatial-map-panel' | 'spatial-globe-panel') =>
    new RegExp(`data-testid="${panel}"[^>]* hidden=""`).test(html) ||
    new RegExp(`data-testid="${panel}"[^>]*hidden`).test(html);
  // map2d hides only the globe; globe3d hides only the map; dual hides neither.
  assert.ok(isHidden(renderViewport('map2d'), 'spatial-globe-panel'), 'map2d must hide the globe panel');
  assert.ok(!isHidden(renderViewport('map2d'), 'spatial-map-panel'), 'map2d must show the map panel');
  assert.ok(isHidden(renderViewport('globe3d'), 'spatial-map-panel'), 'globe3d must hide the map panel');
  assert.ok(!isHidden(renderViewport('globe3d'), 'spatial-globe-panel'), 'globe3d must show the globe panel');
  assert.ok(!isHidden(renderViewport('dual'), 'spatial-map-panel') && !isHidden(renderViewport('dual'), 'spatial-globe-panel'), 'dual view must show both panels');

  // Only dual uses the side-by-side grid; single modes fill with one visible panel.
  assert.ok(renderViewport('dual').includes('md:grid-cols-2'), 'dual mode uses the two-column grid');
  assert.ok(!renderViewport('map2d').includes('md:grid-cols-2'), 'map2d must not lay out a dual grid');
  assert.ok(!renderViewport('globe3d').includes('md:grid-cols-2'), 'globe3d must not lay out a dual grid');

  // Titled chrome is a dual-only affordance; single modes show the visualization raw.
  assert.ok(renderViewport('dual').includes('2D Polar Map'), 'dual mode includes 2D panel title');
  assert.ok(renderViewport('dual').includes('3D Moon Globe'), 'dual mode includes 3D panel title');
  assert.ok(!renderViewport('map2d').includes('2D Polar Map'), 'map2d hides panel chrome');
  assert.ok(!renderViewport('globe3d').includes('3D Moon Globe'), 'globe3d hides panel chrome');
});
