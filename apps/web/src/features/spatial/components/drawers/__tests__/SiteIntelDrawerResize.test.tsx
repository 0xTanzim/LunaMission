import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteIntelDrawer } from '../SiteIntelDrawer';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  INTEL_DRAWER_MIN_WIDTH_PX,
  INTEL_DRAWER_MAX_WIDTH_PX,
} from '@/features/spatial/model/spatialPreferences';
import type { TopocentricElevationDeg, TopocentricAzimuthDeg } from '@/domain/coordinates/frames';

const avail = (value: number) => ({ kind: 'available', value });

function renderDrawer(props: Record<string, unknown> = {}) {
  return renderToStaticMarkup(
    React.createElement(SiteIntelDrawer, {
      site: CANDIDATE_SITES[0],
      isOpen: true,
      onClose: () => {},
      sunElevationDeg: avail(1.2 as TopocentricElevationDeg),
      sunAzimuthDeg: avail(45 as TopocentricAzimuthDeg),
      earthElevationDeg: avail(5.8 as TopocentricElevationDeg),
      earthAzimuthDeg: avail(12 as TopocentricAzimuthDeg),
      mode: 'docked',
      width: 440,
      onWidthChange: () => {},
      ...props,
    } as never),
  );
}

test('intel drawer: resizable separator handle announces bounds and current width', () => {
  const html = renderDrawer({ width: 480 });
  assert.ok(html.includes('role="separator"'), 'a separator resize handle must exist');
  assert.ok(html.includes('aria-orientation="vertical"'), 'handle is a vertical divider');
  assert.ok(html.includes(`aria-valuemin="${INTEL_DRAWER_MIN_WIDTH_PX}"`), 'handle exposes the 320 min');
  assert.ok(html.includes(`aria-valuemax="${INTEL_DRAWER_MAX_WIDTH_PX}"`), 'handle exposes the 560 max');
  assert.ok(html.includes('aria-valuenow="480"'), 'handle exposes the live width');
});

test('intel drawer: docked panel width follows the width prop, not a hardcoded 440', () => {
  const html = renderDrawer({ width: 560 });
  assert.ok(html.includes('width:560px') || html.includes('width: 560px'), 'docked panel must size from the prop');
});

test('intel drawer: the resize handle is omitted in overlay (mobile bottom-sheet) mode', () => {
  assert.equal(renderDrawer({ mode: 'overlay' }).includes('role="separator"'), false);
});
