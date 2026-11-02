import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CANDIDATE_SITES } from '@luna/contracts';
import { projectLatLon } from '@/domain/coordinates/projection';
import { MapGridLayer } from '@/features/spatial/map/layers/MapGridLayer';
import { SelectedCandidatePin } from '@/features/spatial/map/layers/SelectedCandidatePin';
import { SiteTelemetryCard } from '@/features/spatial/components/cards/SiteTelemetryCard';
import { ResultAvailability } from '@/domain/celestial/availability';
import { TopocentricAzimuthDeg, TopocentricElevationDeg } from '@/domain/coordinates/frames';

function avail<T>(val: T): ResultAvailability<T> {
  return { kind: 'available', value: val, unit: '°' };
}

const change6Site = CANDIDATE_SITES.find((s) => s.id === 'change-6')!;
const shackletonSite = CANDIDATE_SITES.find((s) => s.id === 'shackleton-rim')!;

test('MapGridLayer: renders 83.0°S Polar Map Sheet Limit graticule label', () => {
  const html = renderToStaticMarkup(
    <svg viewBox="0 0 600 600">
      <MapGridLayer showGrid={true} zoom={1.0} />
    </svg>
  );

  assert.ok(html.includes('83.0°S'), 'Must display 83.0°S graticule line label');
  assert.ok(html.includes('Polar Map Limit'), 'Must explicitly indicate polar map sheet limit');
});

test('SelectedCandidatePin: renders directional bearing arrow for off-map site SITE-020', () => {
  const pos = projectLatLon(change6Site.coordinates.latitudeDeg, change6Site.coordinates.longitudeDeg);
  const html = renderToStaticMarkup(
    <svg viewBox="0 0 600 600">
      <SelectedCandidatePin site={change6Site} pos={pos} />
    </svg>
  );

  assert.ok(html.includes('Bearing ↗'), 'Selected pin badge must label off-map bearing');
  assert.ok(html.includes('bearing-arrow'), 'Selected pin must render directional bearing indicator arrow');
  assert.ok(html.includes('Selected off-map bearing candidate'), 'Aria label must describe off-map bearing');
});

test('SelectedCandidatePin: does not render bearing arrow for in-bounds polar site', () => {
  const pos = projectLatLon(shackletonSite.coordinates.latitudeDeg, shackletonSite.coordinates.longitudeDeg);
  const html = renderToStaticMarkup(
    <svg viewBox="0 0 600 600">
      <SelectedCandidatePin site={shackletonSite} pos={pos} />
    </svg>
  );

  assert.ok(!html.includes('Bearing ↗'), 'Polar site should not label bearing arrow');
  assert.ok(!html.includes('bearing-arrow'), 'Polar site must not render bearing arrow');
});

test('SiteTelemetryCard: displays Off-Map Benchmark callout and sub-horizon Earth indicator for SITE-020', () => {
  const html = renderToStaticMarkup(
    <SiteTelemetryCard
      site={change6Site}
      sunElevationDeg={avail(1.5 as TopocentricElevationDeg)}
      sunAzimuthDeg={avail(120 as TopocentricAzimuthDeg)}
      earthElevationDeg={avail(-50.9 as TopocentricElevationDeg)}
      earthAzimuthDeg={avail(221 as TopocentricAzimuthDeg)}
      distanceFromPoleKm={1382.0}
    />
  );

  assert.ok(html.includes('OFF-MAP BEARING'), 'Must display OFF-MAP BEARING badge');
  assert.ok(html.includes('Outside 83°S Sheet'), 'Must note outside 83°S sheet');
  assert.ok(html.includes('Sub-horizon'), 'Must indicate sub-horizon status for Earth');
});
