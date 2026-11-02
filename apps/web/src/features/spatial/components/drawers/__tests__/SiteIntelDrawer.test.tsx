import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CANDIDATE_SITES } from '@luna/contracts';
import { SiteIntelDrawer } from '../SiteIntelDrawer';
import { TopocentricAzimuthDeg, TopocentricElevationDeg } from '@/domain/coordinates/frames';

const shackletonSite = CANDIDATE_SITES.find((s) => s.id === 'shackleton-rim')!;
const change6Site = CANDIDATE_SITES.find((s) => s.id === 'change-6')!;

function avail<T>(val: T) {
  return { kind: 'available' as const, value: val, unit: '°' };
}

test('SiteIntelDrawer: remains mounted with aria-hidden, inert, and collapsed classes when isOpen is false', () => {
  const html = renderToStaticMarkup(
    <SiteIntelDrawer
      site={shackletonSite}
      isOpen={false}
      onClose={() => {}}
      sunElevationDeg={avail(1.2 as TopocentricElevationDeg)}
      sunAzimuthDeg={avail(45 as TopocentricAzimuthDeg)}
      earthElevationDeg={avail(5.8 as TopocentricElevationDeg)}
      earthAzimuthDeg={avail(12 as TopocentricAzimuthDeg)}
    />
  );

  assert.ok(html.includes('aria-hidden="true"'), 'Must have aria-hidden="true" when closed');
  assert.ok(html.includes('inert'), 'Must have inert attribute when closed');
  assert.ok(html.includes('pointer-events-none'), 'Must have pointer-events-none when closed');
  assert.ok(html.includes('w-0') || html.includes('-translate-x-full'), 'Must have collapsed width/transform class');
  assert.ok(html.includes('SITE-001'), 'Must preserve site DOM structure for scroll retention');
});

test('SiteIntelDrawer: supports explicit docked and overlay mode styling', () => {
  const dockedHtml = renderToStaticMarkup(
    <SiteIntelDrawer
      site={shackletonSite}
      isOpen={true}
      mode="docked"
      onClose={() => {}}
      sunElevationDeg={avail(1.2 as TopocentricElevationDeg)}
      sunAzimuthDeg={avail(45 as TopocentricAzimuthDeg)}
      earthElevationDeg={avail(5.8 as TopocentricElevationDeg)}
      earthAzimuthDeg={avail(12 as TopocentricAzimuthDeg)}
    />
  );
  // Task 3.1: docked width comes from the width prop (default 440, resizable 320-560).
  assert.ok(dockedHtml.includes('width:440px') || dockedHtml.includes('width: 440px'),
    'Docked mode must render its width from the width prop');

  const overlayHtml = renderToStaticMarkup(
    <SiteIntelDrawer
      site={shackletonSite}
      isOpen={true}
      mode="overlay"
      onClose={() => {}}
      sunElevationDeg={avail(1.2 as TopocentricElevationDeg)}
      sunAzimuthDeg={avail(45 as TopocentricAzimuthDeg)}
      earthElevationDeg={avail(5.8 as TopocentricElevationDeg)}
      earthAzimuthDeg={avail(12 as TopocentricAzimuthDeg)}
    />
  );
  assert.ok(overlayHtml.includes('translate-x-0'), 'Overlay mode must render translate-x-0 when open');
});

test('SiteIntelDrawer: renders header, NASA Lunar Trek link, and site identity when isOpen is true', () => {
  const html = renderToStaticMarkup(
    <SiteIntelDrawer
      site={shackletonSite}
      isOpen={true}
      onClose={() => {}}
      sunElevationDeg={avail(1.2 as TopocentricElevationDeg)}
      sunAzimuthDeg={avail(45 as TopocentricAzimuthDeg)}
      earthElevationDeg={avail(5.8 as TopocentricElevationDeg)}
      earthAzimuthDeg={avail(12 as TopocentricAzimuthDeg)}
    />
  );

  assert.ok(html.includes('SITE-001'), 'Must display site code');
  assert.ok(html.includes('Shackleton Crater Rim'), 'Must display site name');
  assert.ok(html.includes('trek.nasa.gov'), 'Must contain NASA Lunar Trek link');
  assert.ok(html.includes('Planetary Site Intel Drawer'), 'Must have accessible label');
});

test('SiteIntelDrawer: renders LROC NAC and ShadowCam imagery for Shackleton', () => {
  const html = renderToStaticMarkup(
    <SiteIntelDrawer
      site={shackletonSite}
      isOpen={true}
      onClose={() => {}}
      sunElevationDeg={avail(1.2 as TopocentricElevationDeg)}
      sunAzimuthDeg={avail(45 as TopocentricAzimuthDeg)}
      earthElevationDeg={avail(5.8 as TopocentricElevationDeg)}
      earthAzimuthDeg={avail(12 as TopocentricAzimuthDeg)}
    />
  );

  assert.ok(html.includes('LROC NAC'), 'Must render LROC NAC imagery section');
  assert.ok(html.includes('ShadowCam'), 'Must render ShadowCam imagery card');
  assert.ok(html.includes('M1388412998LR'), 'Must display verified NASA product ID');
});

test('SiteIntelDrawer: conforms to WCAG 2.1 AA dialog and tablist a11y standards', () => {
  const html = renderToStaticMarkup(
    <SiteIntelDrawer
      site={shackletonSite}
      isOpen={true}
      onClose={() => {}}
      sunElevationDeg={avail(1.2 as TopocentricElevationDeg)}
      sunAzimuthDeg={avail(45 as TopocentricAzimuthDeg)}
      earthElevationDeg={avail(5.8 as TopocentricElevationDeg)}
      earthAzimuthDeg={avail(12 as TopocentricAzimuthDeg)}
    />
  );

  // SC 2.1.2 & 4.1.2 Dialog semantics
  assert.ok(html.includes('role="dialog"'), 'Must have role=dialog');
  assert.ok(html.includes('aria-modal="true"'), 'Must be marked as modal dialog');
  assert.ok(html.includes('aria-label="Planetary Site Intel Drawer"'), 'Must have accessible label');

  // SC 4.1.2 Tablist & Tab semantics
  assert.ok(html.includes('role="tablist"'), 'Must have role=tablist');
  assert.ok(html.includes('role="tab"'), 'Must have role=tab on buttons');
  assert.ok(html.includes('aria-selected="true"'), 'Must indicate selected tab');
  assert.ok(html.includes('role="tabpanel"'), 'Must have role=tabpanel');

  // SC 2.4.4 Link Purpose & Target Security
  assert.ok(html.includes('rel="noopener noreferrer"'), 'External link must have noopener noreferrer');
  assert.ok(html.includes('aria-label="Close Site Intel Drawer"'), 'Close button must have clear accessible name');
});

test('SiteIntelDrawer: displays off-map far-side indicators for Chang\'e 6 (SITE-020)', () => {
  const html = renderToStaticMarkup(
    <SiteIntelDrawer
      site={change6Site}
      isOpen={true}
      onClose={() => {}}
      sunElevationDeg={avail(-43.0 as TopocentricElevationDeg)}
      sunAzimuthDeg={avail(218 as TopocentricAzimuthDeg)}
      earthElevationDeg={avail(-50.9 as TopocentricElevationDeg)}
      earthAzimuthDeg={avail(221 as TopocentricAzimuthDeg)}
    />
  );

  assert.ok(html.includes('SITE-020'));
  assert.ok(html.includes('Chang&#x27;e 6') || html.includes("Chang'e 6"));
  assert.ok(html.includes('Sub-Horizon') || html.includes('Sub-horizon') || html.includes('Blackout'));
  assert.ok(html.includes('trek.nasa.gov/moon/#v=0.1&amp;x=206.0100&amp;y=-41.6400'));
});

