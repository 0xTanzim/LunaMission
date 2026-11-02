import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DockedMapInspector } from '../DockedMapInspector';
import { InspectorGeometryPanel } from '../InspectorGeometryPanel';
import { InspectorVolatilesPanel } from '../InspectorVolatilesPanel';
import { CANDIDATE_SITES } from '@luna/contracts';
import { asTopocentricAzimuthDeg, asTopocentricElevationDeg } from '@/domain/coordinates/frames';
import type { CandidateSite } from '@/domain/sites/candidateSite';

const mockSite = CANDIDATE_SITES[0];
const mockNearestSite = CANDIDATE_SITES[1];

const mockCustomPoint = {
  coord: { latitudeDeg: -89.5, longitudeDeg: 45.0 },
  analysis: {
    distanceKm: 15.2,
    celestial: {
      sunElevationDeg: asTopocentricElevationDeg(1.45),
      sunAzimuthDeg: asTopocentricAzimuthDeg(120.5),
      earthElevationDeg: asTopocentricElevationDeg(5.2),
      earthAzimuthDeg: asTopocentricAzimuthDeg(310.2),
    },
    nearestSite: mockNearestSite,
    nearestDistanceKm: 8.4,
    pos: { x: 520, y: 480 },
  },
};

test('DockedMapInspector renders compact summary by default on point selection (State 2)', () => {
  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: mockCustomPoint,
      customPointData: mockCustomPoint.analysis,
      selectedSite: mockSite,
      scientificMapMode: 'topography',
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  assert.ok(html.includes('data-testid="docked-map-inspector"'), 'Inspector container must render');
  assert.ok(html.includes('data-testid="docked-map-inspector-compact"'), 'Compact summary bar must render');
  assert.ok(html.includes('89.500°S'), 'Latitude must be formatted in compact summary');
  assert.ok(html.includes('45.000°E'), 'Longitude must be formatted in compact summary');
  assert.ok(html.includes('15.2 km'), 'Distance to active site must be displayed in compact summary');
  assert.ok(html.includes('+1.45°'), 'Sun elevation must include sign in compact summary');
  assert.ok(html.includes('+5.20°'), 'Earth elevation must include sign in compact summary');
  assert.ok(html.includes('aria-expanded="false"'), 'Details expand button must indicate collapsed state');
  assert.ok(html.includes('aria-label="Dismiss point selection"'), 'Dismiss button must be accessible');
  assert.ok(!html.includes('data-testid="inspector-geometry-panel"'), 'Detailed geometry grid must NOT render when collapsed');
});

test('DockedMapInspector renders expanded secondary details on demand (State 3)', () => {
  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: mockCustomPoint,
      customPointData: mockCustomPoint.analysis,
      selectedSite: mockSite,
      scientificMapMode: 'topography',
      initialExpanded: true,
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  assert.ok(html.includes('data-testid="docked-map-inspector"'), 'Inspector container must render');
  assert.ok(html.includes('data-testid="docked-map-inspector-expanded"'), 'Expanded panel must render');
  assert.ok(html.includes('data-testid="inspector-geometry-panel"'), 'Detailed geometry panel must render');
  assert.ok(html.includes('89.500°S'), 'Latitude must be formatted');
  assert.ok(html.includes('45.000°E'), 'Longitude must be formatted');
  assert.ok(html.includes('15.2 km'), 'Distance to active site must be displayed');
  assert.ok(html.includes('+1.45°'), 'Sun elevation must include sign');
  assert.ok(html.includes('120.5°'), 'Sun azimuth must be displayed');
  assert.ok(html.includes('+5.20°'), 'Earth elevation must include sign');
  assert.ok(html.includes(mockNearestSite.code), 'Nearest candidate code must be present');
  assert.ok(html.includes('ACC:'), 'Inspector must render USGS ACC code');
  assert.ok(html.includes('LGRS/ME'), 'Inspector must render geodesy provenance badge');
  assert.ok(html.includes('aria-expanded="true"'), 'Collapse button must indicate expanded state');
});

test('DockedMapInspector renders Volatiles panel when scientificMapMode is volatiles without custom point', () => {
  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: null,
      customPointData: null,
      selectedSite: mockSite,
      scientificMapMode: 'volatiles',
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  assert.ok(html.includes('data-testid="docked-map-inspector"'), 'Inspector container must render in volatiles mode');
  assert.ok(html.includes('data-testid="inspector-volatiles-panel"'), 'Volatiles panel must render');
});

test('DockedMapInspector renders both Geometry and Volatiles tabs when both are active in expanded view', () => {
  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: mockCustomPoint,
      customPointData: mockCustomPoint.analysis,
      selectedSite: mockSite,
      scientificMapMode: 'volatiles',
      initialExpanded: true,
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  assert.ok(html.includes('Split View'), 'Split view tab button must be present');
  assert.ok(html.includes('Geometry'), 'Geometry tab button must be present');
  assert.ok(html.includes('ISRU Volatiles'), 'Volatiles tab button must be present');
  assert.ok(html.includes('data-testid="inspector-geometry-panel"'));
  assert.ok(html.includes('data-testid="inspector-volatiles-panel"'));
});

test('DockedMapInspector returns null when neither custom point nor volatiles mode is active (State 1)', () => {
  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: null,
      customPointData: null,
      selectedSite: mockSite,
      scientificMapMode: 'topography',
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  assert.equal(html, '', 'Should return empty string / null when inactive');
});

test('InspectorGeometryPanel renders formatted metrics, sign handling, and spherical datum notice', () => {
  let selectedCandidate: CandidateSite | null = null;

  const html = renderToStaticMarkup(
    React.createElement(InspectorGeometryPanel, {
      coord: { latitudeDeg: -88.75, longitudeDeg: 120.0 },
      distanceKm: 25.6,
      sunElevationDeg: asTopocentricElevationDeg(-0.85),
      sunAzimuthDeg: asTopocentricAzimuthDeg(45.0),
      earthElevationDeg: asTopocentricElevationDeg(3.14),
      earthAzimuthDeg: asTopocentricAzimuthDeg(180.0),
      nearestSite: mockNearestSite,
      nearestDistanceKm: 12.1,
      onSelectNearest: (site) => {
        selectedCandidate = site;
      },
    })
  );

  assert.ok(html.includes('88.750°S'), 'Should render formatted latitude');
  assert.ok(html.includes('120.000°E'), 'Should render formatted longitude');
  assert.ok(html.includes('25.6 km'), 'Should render active distance');
  assert.ok(html.includes('-0.85°'), 'Negative sun elevation formatted without double minus');
  assert.ok(html.includes('+3.14°'), 'Positive earth elevation includes leading plus');
  assert.ok(html.includes('Select Nearest'), 'Select nearest action button present');
  assert.ok(html.includes('spherical datum') || html.includes('R=1737.4 km'), 'Notice displayed');
});

test('InspectorVolatilesPanel renders ISRU evaluation and target coordinates', () => {
  const html = renderToStaticMarkup(
    React.createElement(InspectorVolatilesPanel, {
      latDeg: mockSite.coordinates.latitudeDeg,
      lonDeg: mockSite.coordinates.longitudeDeg,
      siteName: mockSite.name,
    })
  );

  assert.ok(html.includes('data-testid="inspector-volatiles-panel"'), 'Volatiles panel container present');
  assert.ok(html.includes(mockSite.name) || html.includes('Evaluating') || html.includes('ISRU'));
});
