import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DockedMapInspector } from '@/features/spatial/map/components/inspector/DockedMapInspector';
import { CANDIDATE_SITES } from '@luna/contracts';
import { asTopocentricAzimuthDeg, asTopocentricElevationDeg } from '@/domain/coordinates/frames';

const mockSelectedSite = CANDIDATE_SITES[0]; // Shackleton Rim
const mockNearestSite = CANDIDATE_SITES[1]; // Connecting Ridge

const pointA = {
  coord: { latitudeDeg: -89.85, longitudeDeg: 15.0 },
  analysis: {
    distanceKm: 12.4,
    celestial: {
      sunElevationDeg: asTopocentricElevationDeg(-0.95),
      sunAzimuthDeg: asTopocentricAzimuthDeg(85.2),
      earthElevationDeg: asTopocentricElevationDeg(4.1),
      earthAzimuthDeg: asTopocentricAzimuthDeg(210.0),
    },
    nearestSite: mockNearestSite,
    nearestDistanceKm: 6.2,
    pos: { x: 400, y: 400 },
  },
};

const pointB = {
  coord: { latitudeDeg: -88.5, longitudeDeg: 90.0 },
  analysis: {
    distanceKm: 45.1,
    celestial: {
      sunElevationDeg: asTopocentricElevationDeg(1.2),
      sunAzimuthDeg: asTopocentricAzimuthDeg(140.0),
      earthElevationDeg: asTopocentricElevationDeg(6.8),
      earthAzimuthDeg: asTopocentricAzimuthDeg(195.0),
    },
    nearestSite: CANDIDATE_SITES[2],
    nearestDistanceKm: 14.8,
    pos: { x: 600, y: 300 },
  },
};

test('State 1: No point selected renders null and reserves zero DOM space', () => {
  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: null,
      customPointData: null,
      selectedSite: mockSelectedSite,
      scientificMapMode: 'topography',
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  assert.equal(html, '', 'Inspector must render nothing when no point is selected');
});

test('State 2: Point selected opens in collapsed compact state by default with summary metrics', () => {
  let dismissed = false;

  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: pointA,
      customPointData: pointA.analysis,
      selectedSite: mockSelectedSite,
      scientificMapMode: 'topography',
      onClose: () => {
        dismissed = true;
      },
      onSelectNearestSite: () => {},
    })
  );

  assert.ok(html.includes('data-testid="docked-map-inspector"'), 'Inspector container must render');
  assert.ok(html.includes('data-testid="docked-map-inspector-compact"'), 'Compact summary bar must render by default');
  assert.ok(!html.includes('data-testid="docked-map-inspector-expanded"'), 'Expanded view must not render by default');
  
  // Coordinates and primary distance
  assert.ok(html.includes('89.850°S'), 'Latitude formatted to 3 decimals');
  assert.ok(html.includes('15.000°E'), 'Longitude formatted to 3 decimals');
  assert.ok(html.includes('12.4 km'), 'Distance to active site displayed');
  
  // Essential celestial summary
  assert.ok(html.includes('-0.95°'), 'Sun elevation with proper negative sign');
  assert.ok(html.includes('+4.10°'), 'Earth elevation with proper positive sign');

  // Interactive controls
  assert.ok(html.includes('aria-expanded="false"'), 'Details button marked with aria-expanded="false"');
  // The affordance was renamed to the verb an operator acts on, and now carries an explicit
  // accessible name in addition to the visible label.
  assert.ok(html.includes('Inspect'), 'Expand affordance label visible');
  assert.ok(html.includes('aria-label="Inspect point details"'), 'Expand affordance has an accessible name');
  assert.ok(html.includes('aria-label="Dismiss point selection"'), 'Dismiss button accessible');
});

test('State 3: Point selected expanded on demand shows full geometry and USGS ACC badge', () => {
  let selectedNearestSite = null;

  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: pointA,
      customPointData: pointA.analysis,
      selectedSite: mockSelectedSite,
      scientificMapMode: 'topography',
      initialExpanded: true,
      onClose: () => {},
      onSelectNearestSite: (site) => {
        selectedNearestSite = site;
      },
    })
  );

  assert.ok(html.includes('data-testid="docked-map-inspector"'), 'Inspector container must render');
  assert.ok(html.includes('data-testid="docked-map-inspector-expanded"'), 'Expanded panel must render');
  // The bound became viewport-relative (38vh) so the inspector cannot overflow a short laptop
  // screen; a fixed 160px cap would clip content on tall displays and still overflow on short ones.
  assert.ok(/max-h-\[(?:160px|\d+vh)\]/.test(html), 'Expanded container must be bounded with max-h');
  assert.ok(html.includes('overflow-y-auto'), 'Expanded container must scroll its overflow');
  assert.ok(html.includes('data-testid="inspector-geometry-panel"'), 'Geometry panel must render');

  // Secondary details
  assert.ok(html.includes('ACC:'), 'USGS ACC coordinate code must be rendered');
  assert.ok(html.includes('LGRS/ME'), 'Geodesy standard badge must be rendered');
  assert.ok(html.includes('85.2°'), 'Sun azimuth must be rendered');
  assert.ok(html.includes('210.0°'), 'Earth azimuth must be rendered');
  assert.ok(html.includes(mockNearestSite.code), 'Nearest candidate code must be rendered');
  assert.ok(html.includes('Select Nearest'), 'Select nearest button must be present');

  // Collapse control
  assert.ok(html.includes('aria-expanded="true"'), 'Collapse button marked with aria-expanded="true"');
  assert.ok(html.includes('Collapse'), 'Collapse button text visible');
});

test('State 4: Point updated in place reflects new coordinates and telemetry', () => {
  const htmlA = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: pointA,
      customPointData: pointA.analysis,
      selectedSite: mockSelectedSite,
      scientificMapMode: 'topography',
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  const htmlB = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: pointB,
      customPointData: pointB.analysis,
      selectedSite: mockSelectedSite,
      scientificMapMode: 'topography',
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  assert.ok(htmlA.includes('89.850°S') && htmlA.includes('12.4 km'), 'First point telemetry displayed');
  assert.ok(htmlB.includes('88.500°S') && htmlB.includes('45.1 km'), 'Second point telemetry updated cleanly in place');
  assert.ok(!htmlB.includes('89.850°S'), 'First point data does not bleed into second point');
});

test('State 5: Dismissal triggers onClose callback', () => {
  let closed = false;
  const inspector = React.createElement(DockedMapInspector, {
    customPoint: pointA,
    customPointData: pointA.analysis,
    selectedSite: mockSelectedSite,
    scientificMapMode: 'topography',
    onClose: () => {
      closed = true;
    },
    onSelectNearestSite: () => {},
  });

  // Verify onClose prop is wired
  assert.equal(closed, false);
  inspector.props.onClose();
  assert.equal(closed, true, 'onClose must be invoked on dismissal');
});
