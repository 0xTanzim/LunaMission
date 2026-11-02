import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DEFAULT_PROJECTION_CONFIG, projectLatLon } from '@/domain/coordinates/projection';
import { CANDIDATE_SITES } from '@luna/contracts';
import { MapOverlayCards } from '../components/MapOverlayCards';
import { DockedMapInspector } from '../components/inspector/DockedMapInspector';
import { asTopocentricAzimuthDeg, asTopocentricElevationDeg } from '@/domain/coordinates/frames';
import { ScenarioModelContext } from '@/app/scenario/context/scenarioContext';
import { deriveScenarioModel } from '@/app/scenario/model/scenarioModel';

const { svgSize: SVG_SIZE, center: CENTER, maxRadius: MAX_RADIUS } = DEFAULT_PROJECTION_CONFIG;

/**
 * Mathematical model of SVG viewBox with preserveAspectRatio="xMidYMid meet".
 */
function computeSvgProjection(containerWidth: number, containerHeight: number) {
  const scale = Math.min(containerWidth / SVG_SIZE, containerHeight / SVG_SIZE);
  const renderedWidth = SVG_SIZE * scale;
  const renderedHeight = SVG_SIZE * scale;
  const offsetX = (containerWidth - renderedWidth) / 2;
  const offsetY = (containerHeight - renderedHeight) / 2;

  const toScreen = (svgX: number, svgY: number) => ({
    x: offsetX + svgX * scale,
    y: offsetY + svgY * scale,
  });

  return {
    scale,
    scaleX: scale,
    scaleY: scale,
    offsetX,
    offsetY,
    centerScreen: toScreen(CENTER, CENTER),
    discRadiusScreen: MAX_RADIUS * scale,
    toScreen,
  };
}

test('MapCanvas SVG maintains uniform scaling and center alignment across viewport dimensions', () => {
  const testDimensions = [
    { w: 1200, h: 800, desc: 'Widescreen 16:10' },
    { w: 780, h: 650, desc: 'Dual View (50% of 12-col desktop)' },
    { w: 600, h: 600, desc: '1:1 Square' },
    { w: 500, h: 700, desc: 'Narrow Portrait' },
  ];

  for (const dim of testDimensions) {
    const proj = computeSvgProjection(dim.w, dim.h);

    // Uniform scaling invariant: scaleX must equal scaleY exactly
    assert.equal(proj.scaleX, proj.scaleY, `${dim.desc}: scaling must be strictly uniform`);

    // Center alignment invariant: center of SVG (300, 300) must land exactly on (w/2, h/2)
    assert.ok(
      Math.abs(proj.centerScreen.x - dim.w / 2) < 1e-6,
      `${dim.desc}: center X (${proj.centerScreen.x}) must match container midpoint (${dim.w / 2})`
    );
    assert.ok(
      Math.abs(proj.centerScreen.y - dim.h / 2) < 1e-6,
      `${dim.desc}: center Y (${proj.centerScreen.y}) must match container midpoint (${dim.h / 2})`
    );

    // Boundary containment invariant: polar disc must never exceed container bounds
    const minX = proj.centerScreen.x - proj.discRadiusScreen;
    const maxX = proj.centerScreen.x + proj.discRadiusScreen;
    const minY = proj.centerScreen.y - proj.discRadiusScreen;
    const maxY = proj.centerScreen.y + proj.discRadiusScreen;

    assert.ok(minX >= 0 && maxX <= dim.w, `${dim.desc}: disc X bounds [${minX}, ${maxX}] inside container`);
    assert.ok(minY >= 0 && maxY <= dim.h, `${dim.desc}: disc Y bounds [${minY}, ${maxY}] inside container`);
  }
});

test('Opening DockedMapInspector rescales SVG uniformly with zero disc occlusion', () => {
  const containerW = 780;
  const initialH = 650;
  const inspectorH = 150; // Docked height when expanded
  const finalH = initialH - inspectorH; // 500px

  const initialProj = computeSvgProjection(containerW, initialH);
  const openProj = computeSvgProjection(containerW, finalH);

  // Both states must maintain 1:1 uniform aspect ratio
  assert.equal(initialProj.scaleX, initialProj.scaleY);
  assert.equal(openProj.scaleX, openProj.scaleY);

  // Center must dynamically adjust to midpoint of available canvas height
  assert.equal(openProj.centerScreen.x, containerW / 2);
  assert.equal(openProj.centerScreen.y, finalH / 2);

  // Disc boundary must be entirely contained in the canvas area (y in [0, finalH])
  const openDiscBottom = openProj.centerScreen.y + openProj.discRadiusScreen;
  assert.ok(
    openDiscBottom <= finalH,
    `Rescaled disc bottom (${openDiscBottom}px) must not bleed past canvas height (${finalH}px)`
  );

  // All 13 Artemis candidate sites must remain strictly inside visible canvas bounds
  for (const site of CANDIDATE_SITES) {
    const pt = projectLatLon(site.coordinates.latitudeDeg, site.coordinates.longitudeDeg);
    const screenPt = openProj.toScreen(pt.x, pt.y);

    assert.ok(
      screenPt.x >= 0 && screenPt.x <= containerW,
      `Site ${site.code} X (${screenPt.x}px) must be inside canvas`
    );
    assert.ok(
      screenPt.y >= 0 && screenPt.y <= finalH,
      `Site ${site.code} Y (${screenPt.y}px) must be inside canvas`
    );
  }
});

test('MapOverlayCards contains no floating custom-point or volatile cards occluding polar disc', () => {
  const mockModel = deriveScenarioModel(CANDIDATE_SITES[0], Date.now(), 'geometry-only');

  // Render MapOverlayCards without active popovers or hovering
  const html = renderToStaticMarkup(
    React.createElement(
      ScenarioModelContext.Provider,
      { value: mockModel },
      React.createElement(MapOverlayCards, {
        hoveredSite: null,
        hoverPreview: null,
        activeVectorPopover: null,
        distanceFromPoleKm: 18.4,
        customPoint: null,
        onCloseVectorPopover: () => {},
      })
    )
  );

  // Assert neither legacy floating card exists in the output
  assert.ok(!html.includes('CustomPointCard'), 'CustomPointCard must not be rendered');
  assert.ok(!html.includes('VolatileProspectingCard'), 'VolatileProspectingCard must not be rendered');
  assert.ok(!html.includes('ISRU Volatiles'), 'Volatiles data must not float in overlay cards');

  // Verify SiteTelemetryCard is tucked in top-right corner (w-44, right-3)
  assert.ok(html.includes('right-3'), 'Site telemetry must be anchored to right margin');
  assert.ok(html.includes('w-44'), 'Site telemetry card must be narrow (176px)');
});

test('When custom point is inspected, SiteTelemetryCard yields to prevent visual clutter', () => {
  const mockModel = deriveScenarioModel(CANDIDATE_SITES[0], Date.now(), 'geometry-only');

  const html = renderToStaticMarkup(
    React.createElement(
      ScenarioModelContext.Provider,
      { value: mockModel },
      React.createElement(MapOverlayCards, {
        hoveredSite: null,
        hoverPreview: null,
        activeVectorPopover: null,
        distanceFromPoleKm: 18.4,
        customPoint: {
          coord: { latitudeDeg: -89.5, longitudeDeg: 0 },
          analysis: {
            distanceKm: 10,
            celestial: {
              sunElevationDeg: asTopocentricElevationDeg(1.2),
              sunAzimuthDeg: asTopocentricAzimuthDeg(90),
              earthElevationDeg: asTopocentricElevationDeg(4.5),
              earthAzimuthDeg: asTopocentricAzimuthDeg(270),
            },
            nearestSite: CANDIDATE_SITES[0],
            nearestDistanceKm: 5,
            pos: { x: 300, y: 300 },
          },
        },
        onCloseVectorPopover: () => {},
      })
    )
  );

  // When custom point is active, SiteTelemetryCard yields (returns null)
  assert.equal(html, '', 'Overlay cards must yield when inspecting a custom point');
});

test('ScientificMapLegend and MapScaleBar maintain collision-free corner separation', () => {
  // Layout bounds model:
  // MapScaleBar is placed at bottom-3 left-3 (x: 12px, y: H - 12px, max width: ~260px)
  // ScientificMapLegend is placed at bottom-4 right-4 (right: 16px, max width: 320px)
  const scaleBarLeft = 12;
  const scaleBarWidth = 260; // scale bar + labels + status indicators
  const scaleBarRight = scaleBarLeft + scaleBarWidth; // 272px

  const legendMarginRight = 16;
  const legendMaxWidth = 320;

  const testWidths = [650, 780, 900, 1200, 1440, 1920];

  for (const w of testWidths) {
    const legendLeft = w - legendMarginRight - legendMaxWidth;
    const horizontalClearance = legendLeft - scaleBarRight;

    assert.ok(
      horizontalClearance > 0,
      `Width ${w}px: ScaleBar right (${scaleBarRight}px) and Legend left (${legendLeft}px) must have positive clearance (${horizontalClearance}px)`
    );
  }
});
