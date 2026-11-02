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

test('SpatialWorkspace: In dual view mode, viewport container spans 12 columns (lg:col-span-12)', () => {
  const html = renderWorkspace('dual');

  // In dual view, viewport container must expand across the full 12-column grid
  assert.ok(
    html.includes('lg:col-span-12'),
    'Dual view viewport container must contain lg:col-span-12 for full-width breathability'
  );
  assert.ok(
    !html.includes('lg:col-span-8'),
    'Dual view must not contain legacy narrow lg:col-span-8'
  );
});

test('SpatialWorkspace: In dual view mode, static passport column is omitted', () => {
  const html = renderWorkspace('dual');

  // In dual view, the static right-hand passport column is omitted
  assert.ok(
    !html.includes('data-testid="spatial-static-passport-column"'),
    'Dual view must omit static passport column to allow 100% full-width dual viewport'
  );
  assert.ok(
    !html.includes('lg:col-span-4'),
    'Dual view must not retain legacy lg:col-span-4 static passport column'
  );
});

test('SpatialWorkspace: In dual view mode, Point Passport pill/toggle is rendered in header actions', () => {
  const html = renderWorkspace('dual');

  // Dual view must render the accessible Point Passport pill toggle button in header
  assert.ok(
    html.includes('data-testid="dual-passport-toggle"'),
    'Dual view header must provide a data-testid="dual-passport-toggle" button'
  );
  assert.ok(
    html.includes('Point Passport'),
    'Toggle button must display Point Passport label'
  );
});

test('SpatialWorkspace: Passport drawer overlay renders when toggled open in dual view', () => {
  const closedHtml = renderWorkspace('dual', false);
  assert.ok(
    !closedHtml.includes('Selected Site Passport'),
    'Drawer overlay must not be visible when isDualPassportOpen is false'
  );

  const openHtml = renderWorkspace('dual', true);
  assert.ok(
    openHtml.includes('Selected Site Passport'),
    'Drawer overlay title must be visible when isDualPassportOpen is true'
  );
  assert.ok(
    openHtml.includes('Close Point Passport overlay'),
    'Drawer overlay close button must be present when open'
  );
  assert.ok(
    openHtml.includes('JPL Horizons Benchmark Verified'),
    'PointPassport content must be rendered inside drawer overlay'
  );
});

test('SpatialWorkspace: Single view modes (2D Map, 3D Moon) retain standard 7/5 split', () => {
  const mapHtml = renderWorkspace('map2d');

  assert.ok(
    mapHtml.includes('lg:col-span-7'),
    '2D Map mode must allocate 7 columns to viewport container'
  );
  assert.ok(
    mapHtml.includes('lg:col-span-5'),
    '2D Map mode must allocate 5 columns to static passport'
  );
  assert.ok(
    mapHtml.includes('data-testid="spatial-static-passport-column"'),
    '2D Map mode must render static passport column'
  );
  assert.ok(
    !mapHtml.includes('data-testid="dual-passport-toggle"'),
    '2D Map mode must not show dual passport toggle'
  );

  const globeHtml = renderWorkspace('globe3d');

  assert.ok(
    globeHtml.includes('lg:col-span-7'),
    '3D Moon mode must allocate 7 columns to viewport container'
  );
  assert.ok(
    globeHtml.includes('lg:col-span-5'),
    '3D Moon mode must allocate 5 columns to static passport'
  );
  assert.ok(
    globeHtml.includes('data-testid="spatial-static-passport-column"'),
    '3D Moon mode must render static passport column'
  );
  assert.ok(
    !globeHtml.includes('data-testid="dual-passport-toggle"'),
    '3D Moon mode must not show dual passport toggle'
  );
});

test('SpatialViewport: Dual view container renders 50/50 side-by-side grid layout', () => {
  const html = renderToStaticMarkup(
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

  assert.ok(
    html.includes('grid-cols-1 md:grid-cols-2'),
    'Dual viewport must divide canvas equally via grid-cols-1 md:grid-cols-2'
  );
  assert.ok(
    html.includes('2D Polar Map'),
    'Dual viewport must contain 2D Polar Map panel'
  );
  assert.ok(
    html.includes('3D Moon Globe'),
    'Dual viewport must contain 3D Moon Globe panel'
  );
});

test('SpatialWorkspace: PassportPillButton enforces whitespace-nowrap, shrink-0, and h-[28px] to prevent multiline wrap', () => {
  const html = renderWorkspace('dual');

  assert.ok(
    html.includes('data-testid="dual-passport-toggle"'),
    'Dual view must render the pill toggle'
  );
  assert.ok(
    html.includes('whitespace-nowrap'),
    'PassportPillButton must specify whitespace-nowrap to prevent 2-line wrapping'
  );
  assert.ok(
    html.includes('shrink-0'),
    'PassportPillButton must specify shrink-0 so it is not squeezed by toolbar'
  );
  assert.ok(
    html.includes('h-[28px]'),
    'PassportPillButton must enforce fixed h-[28px] matching single-line toolbar height'
  );
});

test('SpatialWorkspace: header keeps the flight-console rows across view modes', () => {
  for (const mode of ['map2d', 'dual', 'globe3d'] as const) {
    const html = renderWorkspace(mode);
    assert.ok(
      html.includes('Spatial Workspace'),
      `Mode ${mode} must include Spatial Workspace title`
    );
    // Row B is a full-width control strip: wrapping happens between whole groups, never
    // inside the title row, so the title/context baseline never shifts with the toolbar.
    assert.ok(
      html.includes('order-last basis-full w-full min-w-0'),
      `Mode ${mode} must render the toolbar as its own full-width row`
    );
    // The mission context shares row A from sm up; on phones it wraps to its own line
    // instead of truncating beside the title.
    assert.ok(
      html.includes('max-md:order-last max-md:basis-full'),
      `Mode ${mode} must wrap the mission context to its own line on phones`
    );
  }
});
