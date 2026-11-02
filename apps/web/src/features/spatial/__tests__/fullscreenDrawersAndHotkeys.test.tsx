import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapFullscreenZoomPalette } from '../map/components/MapFullscreenZoomPalette';
import { SpatialToolbar } from '../components/toolbar/SpatialToolbar';
import { DEFAULT_SPATIAL_PREFERENCES } from '../model/spatialPreferences';

test('MapFullscreenZoomPalette: supports dynamic className for passport offset', () => {
  const defaultHtml = renderToStaticMarkup(
    <MapFullscreenZoomPalette
      zoom={1.0}
      onZoomIn={() => {}}
      onZoomOut={() => {}}
      onReset={() => {}}
      className="right-3"
    />
  );
  assert.ok(defaultHtml.includes('right-3'), 'Default styling must anchor palette at right-3');

  const offsetHtml = renderToStaticMarkup(
    <MapFullscreenZoomPalette
      zoom={1.0}
      onZoomIn={() => {}}
      onZoomOut={() => {}}
      onReset={() => {}}
      className="right-[430px]"
    />
  );
  assert.ok(
    offsetHtml.includes('right-[430px]'),
    'Offset styling must anchor palette at right-[430px] when passport is open'
  );
});

test('SpatialToolbar: renders canonical Site Intel button in Slot 5 without duplicates', () => {
  let toggled = false;
  const html = renderToStaticMarkup(
    <SpatialToolbar
      viewMode="map2d"
      onViewModeChange={() => {}}
      preferences={DEFAULT_SPATIAL_PREFERENCES}
      onToggleLayer={() => {}}
      onCameraPresetChange={() => {}}
      isFullscreenActive={false}
      onToggleFullscreen={() => {}}
      isSiteIntelOpen={false}
      onToggleSiteIntel={() => { toggled = true; }}
    />
  );

  const intelMatches = html.match(/data-testid="toolbar-site-intel"/g);
  assert.equal(intelMatches?.length, 1, 'Toolbar must render exactly one Site Intel button');
  assert.ok(html.includes('aria-label="Toggle Site Intel Drawer"'), 'Must have explicit accessible label');
  assert.ok(html.includes('Site Intel'), 'Must display Site Intel label');
});
