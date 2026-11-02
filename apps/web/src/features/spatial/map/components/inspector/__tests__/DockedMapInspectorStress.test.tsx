import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DockedMapInspector } from '../DockedMapInspector';
import { InspectorGeometryPanel } from '../InspectorGeometryPanel';
import { InspectorVolatilesPanel } from '../InspectorVolatilesPanel';
import { CANDIDATE_SITES } from '@luna/contracts';
import {
  asSelenographicLatitudeDeg,
  asSelenographicLongitudeDeg,
  asTopocentricAzimuthDeg,
  asTopocentricElevationDeg,
} from '@/domain/coordinates/frames';
import {
  analyzeCustomPoint,
  celestialAt,
  distanceFromSouthPoleKm,
  nearestCandidate,
  type SubPoints,
} from '@/features/spatial/map/model/mapPointAnalysis';
import { prospectVolatilesAtCoordinates } from '@/domain/volatiles/thermalNeutronModels';
import type { ScientificMapLayerMode } from '@/features/spatial/model/spatialPreferences';

const mockSelectedSite = CANDIDATE_SITES[0]; // Shackleton Rim (-89.9°S, 0°E)

const mockSubPoints: SubPoints = {
  subSolarLatDeg: asSelenographicLatitudeDeg(-1.5),
  subSolarLonDeg: asSelenographicLongitudeDeg(45.0),
  subEarthLatDeg: asSelenographicLatitudeDeg(6.2),
  subEarthLonDeg: asSelenographicLongitudeDeg(12.0),
};

// ---------------------------------------------------------------------------
// 1. Boundary Coordinates: 83°S Boundary Circle
// ---------------------------------------------------------------------------
test('Stress: 83°S boundary coordinates across multiple meridians render properly without NaN', () => {
  const boundaryLongitudes = [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0, 359.99];

  for (const lon of boundaryLongitudes) {
    const coord = { latitudeDeg: -83.0, longitudeDeg: lon };
    const analysis = analyzeCustomPoint(coord, mockSelectedSite, mockSubPoints);

    assert.ok(Number.isFinite(analysis.distanceKm), `distanceKm must be finite at lon=${lon}`);
    assert.ok(Number.isFinite(analysis.nearestDistanceKm), `nearestDistanceKm must be finite at lon=${lon}`);
    assert.ok(analysis.nearestSite, `nearestSite must be resolved at lon=${lon}`);

    const html = renderToStaticMarkup(
      React.createElement(DockedMapInspector, {
        customPoint: { coord, analysis },
        selectedSite: mockSelectedSite,
        scientificMapMode: 'topography',
        onClose: () => {},
        onSelectNearestSite: () => {},
      })
    );

    assert.ok(html.includes('83.000°S'), `Formatted lat 83.000°S expected at lon=${lon}`);
    assert.ok(html.includes(`${lon.toFixed(3)}°E`), `Formatted lon ${lon.toFixed(3)}°E expected at lon=${lon}`);
    assert.ok(!html.includes('NaN'), `Output must not contain NaN at lon=${lon}`);
  }
});

// ---------------------------------------------------------------------------
// 2. Exact Geographic South Pole (90.0°S)
// ---------------------------------------------------------------------------
test('Stress: Exact 90°S geographic pole handles singular azimuth and zero distance without degenerate states', () => {
  const poleCoord = { latitudeDeg: -90.0, longitudeDeg: 0.0 };
  const analysis = analyzeCustomPoint(poleCoord, mockSelectedSite, mockSubPoints);
  const poleDistanceKm = distanceFromSouthPoleKm(poleCoord);

  assert.equal(poleDistanceKm, 0, 'Distance from exact pole must be 0 km');
  assert.ok(Number.isFinite(analysis.celestial.sunElevationDeg));
  assert.ok(Number.isFinite(analysis.celestial.earthElevationDeg));

  const html = renderToStaticMarkup(
    React.createElement(DockedMapInspector, {
      customPoint: { coord: poleCoord, analysis },
      selectedSite: mockSelectedSite,
      scientificMapMode: 'topography',
      onClose: () => {},
      onSelectNearestSite: () => {},
    })
  );

  assert.ok(html.includes('90.000°S'), 'Must display 90.000°S');
  assert.ok(html.includes('0.000°E'), 'Must display 0.000°E');
  assert.ok(!html.includes('NaN'), 'Must not contain NaN');
});

// ---------------------------------------------------------------------------
// 3. Anti-Meridian & Signed Longitudes (±180° / 360°)
// ---------------------------------------------------------------------------
test('Stress: Anti-meridian and wrap longitudes evaluate and format cleanly', () => {
  const testCoordinates = [
    { latitudeDeg: -85.5, longitudeDeg: 180.0 },
    { latitudeDeg: -85.5, longitudeDeg: -180.0 },
    { latitudeDeg: -87.2, longitudeDeg: 360.0 },
    { latitudeDeg: -86.0, longitudeDeg: -45.0 },
  ];

  for (const coord of testCoordinates) {
    const analysis = analyzeCustomPoint(coord, mockSelectedSite, mockSubPoints);
    const html = renderToStaticMarkup(
      React.createElement(DockedMapInspector, {
        customPoint: { coord, analysis },
        selectedSite: mockSelectedSite,
        scientificMapMode: 'volatiles',
        onClose: () => {},
        onSelectNearestSite: () => {},
      })
    );

    assert.ok(html.includes('data-testid="docked-map-inspector"'));
    assert.ok(!html.includes('NaN'), `Must not produce NaN for coord ${JSON.stringify(coord)}`);
  }
});

// ---------------------------------------------------------------------------
// 4. Missing or Extreme Telemetry Angles
// ---------------------------------------------------------------------------
test('Stress: Extreme celestial elevations (-15°, 0°, +15°) and azimuth boundary cases format with correct signs', () => {
  const extremeCases = [
    { sunElev: -15.42, earthElev: -8.11, sunAz: 0.0, earthAz: 359.9 },
    { sunElev: 0.0, earthElev: 0.0, sunAz: 180.0, earthAz: 90.0 },
    { sunElev: 12.34, earthElev: 8.76, sunAz: 270.0, earthAz: 45.0 },
  ];

  for (const c of extremeCases) {
    const html = renderToStaticMarkup(
      React.createElement(InspectorGeometryPanel, {
        coord: { latitudeDeg: -88.0, longitudeDeg: 100.0 },
        distanceKm: 0.0,
        sunElevationDeg: asTopocentricElevationDeg(c.sunElev),
        sunAzimuthDeg: asTopocentricAzimuthDeg(c.sunAz),
        earthElevationDeg: asTopocentricElevationDeg(c.earthElev),
        earthAzimuthDeg: asTopocentricAzimuthDeg(c.earthAz),
        nearestSite: mockSelectedSite,
        nearestDistanceKm: 0.0,
        onSelectNearest: () => {},
      })
    );

    if (c.sunElev >= 0) {
      assert.ok(html.includes(`+${c.sunElev.toFixed(2)}°`), `Expected + sign for sun elev ${c.sunElev}`);
    } else {
      assert.ok(html.includes(`${c.sunElev.toFixed(2)}°`), `Expected negative sign for sun elev ${c.sunElev}`);
    }

    if (c.earthElev >= 0) {
      assert.ok(html.includes(`+${c.earthElev.toFixed(2)}°`), `Expected + sign for earth elev ${c.earthElev}`);
    } else {
      assert.ok(html.includes(`${c.earthElev.toFixed(2)}°`), `Expected negative sign for earth elev ${c.earthElev}`);
    }
  }
});

// ---------------------------------------------------------------------------
// 5. Rapid Layer Toggles & All Scientific Modes
// ---------------------------------------------------------------------------
test('Stress: Inspector responds stably to all scientific map modes', () => {
  const allModes: ScientificMapLayerMode[] = [
    'none',
    'topography',
    'hillshade',
    'slope',
    'geology',
    'illumination',
    'volatiles',
    'temperature',
  ];

  const coord = { latitudeDeg: -89.2, longitudeDeg: 15.0 };
  const analysis = analyzeCustomPoint(coord, mockSelectedSite, mockSubPoints);

  for (const mode of allModes) {
    const htmlWithPoint = renderToStaticMarkup(
      React.createElement(DockedMapInspector, {
        customPoint: { coord, analysis },
        selectedSite: mockSelectedSite,
        scientificMapMode: mode,
        onClose: () => {},
        onSelectNearestSite: () => {},
      })
    );
    assert.ok(htmlWithPoint.includes('data-testid="docked-map-inspector"'), `Expected inspector open for mode=${mode} with point`);

    const htmlWithoutPoint = renderToStaticMarkup(
      React.createElement(DockedMapInspector, {
        customPoint: null,
        selectedSite: mockSelectedSite,
        scientificMapMode: mode,
        onClose: () => {},
        onSelectNearestSite: () => {},
      })
    );

    if (mode === 'volatiles' || mode === 'temperature') {
      assert.ok(htmlWithoutPoint.includes('data-testid="docked-map-inspector"'), `Volatiles panel expected for mode=${mode} without point`);
    } else {
      assert.equal(htmlWithoutPoint, '', `Inspector should be hidden for mode=${mode} without point`);
    }
  }
});

// ---------------------------------------------------------------------------
// 6. Volatiles Prospecting Engine Stability Across Boundary Grid
// ---------------------------------------------------------------------------
test('Stress: ProspectVolatilesAtCoordinates produces finite valid yields across polar boundary grid', () => {
  const sampleLatitudes = [-83.0, -85.0, -88.0, -89.5, -90.0];
  const sampleLongitudes = [0.0, 90.0, 180.0, 270.0];

  for (const lat of sampleLatitudes) {
    for (const lon of sampleLongitudes) {
      const res = prospectVolatilesAtCoordinates(lat, lon);

      assert.ok(Number.isFinite(res.divinerTempKelvin), `divinerTempKelvin must be finite at (${lat}, ${lon})`);
      assert.ok(res.divinerTempKelvin > 0, `divinerTempKelvin must be > 0 at (${lat}, ${lon})`);
      assert.ok(Number.isFinite(res.epithermalNeutronFluxCps), `epithermalNeutronFluxCps must be finite at (${lat}, ${lon})`);
      assert.ok(Number.isFinite(res.hydrogenWeightPct), `hydrogenWeightPct must be finite at (${lat}, ${lon})`);
      assert.ok(Number.isFinite(res.estimatedIceDensityKgPerM3), `estimatedIceDensityKgPerM3 must be finite at (${lat}, ${lon})`);
      assert.ok(Number.isFinite(res.iceYieldMetricTonsPerHectare), `iceYieldMetricTonsPerHectare must be finite at (${lat}, ${lon})`);
      assert.ok(res.isruFeasibilityScore >= 0 && res.isruFeasibilityScore <= 100, `isruFeasibilityScore in [0, 100] at (${lat}, ${lon})`);
      assert.ok(['sublimation_tent', 'deep_thermal_coring', 'unviable'].includes(res.extractionMethod));
    }
  }
});
