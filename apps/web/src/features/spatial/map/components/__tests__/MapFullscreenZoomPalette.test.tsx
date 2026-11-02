import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapFullscreenZoomPalette } from '../MapFullscreenZoomPalette';

test('MapFullscreenZoomPalette: renders zoom in, zoom out, focus, and reset controls', () => {
  const html = renderToStaticMarkup(
    <MapFullscreenZoomPalette
      zoom={1.5}
      onZoomIn={() => {}}
      onZoomOut={() => {}}
      onReset={() => {}}
      onFocusSite={() => {}}
      isSiteFocused={false}
    />
  );

  assert.ok(html.includes('data-testid="fullscreen-map-zoom-palette"'), 'Must render testid');
  assert.ok(html.includes('aria-label="Zoom in"'), 'Must include Zoom in button');
  assert.ok(html.includes('aria-label="Zoom out"'), 'Must include Zoom out button');
  assert.ok(html.includes('aria-label="Focus on selected site"'), 'Must include Focus site button');
  assert.ok(html.includes('aria-label="Reset view"'), 'Must include Reset view button');
  assert.ok(html.includes('1.5x'), 'Must display formatted 1.5x zoom badge');
});

test('MapFullscreenZoomPalette: highlights focus button when isSiteFocused is true', () => {
  const html = renderToStaticMarkup(
    <MapFullscreenZoomPalette
      zoom={2.0}
      onZoomIn={() => {}}
      onZoomOut={() => {}}
      onReset={() => {}}
      onFocusSite={() => {}}
      isSiteFocused={true}
    />
  );

  assert.ok(html.includes('text-[var(--lm-color-selected-site)]'), 'Focused site button must have active site styling');
  assert.ok(html.includes('2.0x'), 'Must display formatted 2.0x zoom badge');
});
