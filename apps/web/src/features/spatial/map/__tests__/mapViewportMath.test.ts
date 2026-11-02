import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDIDATES_PAN_Y_PX,
  CANDIDATES_ZOOM,
  REGIONAL_ZOOM,
  SITE_ZOOM,
  WHEEL_ZOOM_IN_FACTOR,
  WHEEL_ZOOM_OUT_FACTOR,
  ZOOM_MAX,
  ZOOM_MIN,
  clampZoom,
  coordinateFromPointer,
  dragOrigin,
  draggedPan,
  presetViewport,
  steppedZoom,
  wheelZoom,
  clampPan,
  computeFitAllViewport,
  zoomAroundScreenPoint,
  zoomAroundWorldPoint,
  zoomAroundFocalPoint,
} from '@/features/spatial/map/model/mapViewportMath';
import { DEFAULT_PROJECTION_CONFIG } from '@/domain/coordinates/projection';

const CENTER = DEFAULT_PROJECTION_CONFIG.center;

test('zoom stays inside the documented range', () => {
  assert.equal(clampZoom(0.2), ZOOM_MIN);
  assert.equal(clampZoom(9), ZOOM_MAX);
  assert.equal(clampZoom(1.7), 1.7);
});

test('toolbar steps move by one step and stop at the limits', () => {
  assert.equal(steppedZoom(1.0, 1), 1.35);
  assert.equal(steppedZoom(1.0, -1), ZOOM_MIN, 'the step below the floor lands on the floor');
  assert.equal(steppedZoom(ZOOM_MAX, 1), ZOOM_MAX);
  assert.equal(steppedZoom(ZOOM_MIN, -1), ZOOM_MIN);
});

test('wheel zoom multiplies and keeps the two-decimal readout exact', () => {
  assert.equal(wheelZoom(1.0, -100), WHEEL_ZOOM_IN_FACTOR);
  assert.equal(wheelZoom(1.0, 100), WHEEL_ZOOM_OUT_FACTOR);
  assert.equal(wheelZoom(4.4, -100), ZOOM_MAX, 'magnifying past the ceiling lands on it');
  assert.equal(wheelZoom(0.9, 100), ZOOM_MIN);
});

test('camera presets describe a full camera, not just a zoom', () => {
  const sitePos = { x: CENTER + 40, y: CENTER + 30 };

  assert.deepEqual(presetViewport('regional', sitePos, CENTER), { zoom: REGIONAL_ZOOM, pan: { x: 0, y: 0 } });
  assert.deepEqual(presetViewport('candidates', sitePos, CENTER), {
    zoom: CANDIDATES_ZOOM,
    pan: { x: 0, y: CANDIDATES_PAN_Y_PX },
  });
  assert.deepEqual(presetViewport('site', sitePos, CENTER), {
    zoom: SITE_ZOOM,
    pan: { x: (CENTER - sitePos.x) * SITE_ZOOM, y: (CENTER - sitePos.y) * SITE_ZOOM },
  });
});

test('the site preset pans the selected site onto the map centre', () => {
  const sitePos = { x: 340, y: 260 };
  const { pan, zoom } = presetViewport('site', sitePos, CENTER);

  // The CSS transform is translate(pan) then scale(zoom) about the centre, so the
  // site lands on `center` when the pan is the site-to-centre offset at that zoom.
  const landedX = (sitePos.x - CENTER) * zoom + pan.x + CENTER;
  const landedY = (sitePos.y - CENTER) * zoom + pan.y + CENTER;

  assert.ok(Math.abs(landedX - CENTER) < 1e-9, `x landed at ${landedX}`);
  assert.ok(Math.abs(landedY - CENTER) < 1e-9, `y landed at ${landedY}`);
});

test('pointer inversion returns the centre to the pole and undoes pan and zoom', () => {
  const svgSize = DEFAULT_PROJECTION_CONFIG.svgSize;
  const rect = { left: 100, top: 50, width: svgSize, height: svgSize };
  const identity = { zoom: 1, pan: { x: 0, y: 0 } };

  const pole = coordinateFromPointer({
    clientX: rect.left + CENTER,
    clientY: rect.top + CENTER,
    rect,
    svgSize,
    center: CENTER,
    viewport: identity,
  });
  assert.ok(pole);
  assert.equal(Math.round(pole!.latitudeDeg), -90);

  // A magnified, panned frame must map back to the same selenographic point.
  const viewport = { zoom: 2, pan: { x: -20, y: 15 } };
  const untransformed = { x: CENTER + 25, y: CENTER - 18 };
  const screen = {
    clientX: rect.left + CENTER + (untransformed.x - CENTER) * viewport.zoom + viewport.pan.x,
    clientY: rect.top + CENTER + (untransformed.y - CENTER) * viewport.zoom + viewport.pan.y,
  };
  const zoomed = coordinateFromPointer({ ...screen, rect, svgSize, center: CENTER, viewport });
  const flat = coordinateFromPointer({
    clientX: rect.left + untransformed.x,
    clientY: rect.top + untransformed.y,
    rect,
    svgSize,
    center: CENTER,
    viewport: identity,
  });

  assert.ok(zoomed && flat);
  assert.equal(zoomed!.latitudeDeg, flat!.latitudeDeg);
  assert.equal(zoomed!.longitudeDeg, flat!.longitudeDeg);
});

test('pointer inversion refuses positions outside the mapped disc', () => {
  const svgSize = DEFAULT_PROJECTION_CONFIG.svgSize;
  assert.equal(
    coordinateFromPointer({
      clientX: 0,
      clientY: 0,
      rect: { left: 0, top: 0, width: svgSize, height: svgSize },
      svgSize,
      center: CENTER,
      viewport: { zoom: 1, pan: { x: 0, y: 0 } },
    }),
    null,
  );
});

test('a drag keeps the map under the cursor from mousedown to mousemove', () => {
  const viewport = { zoom: 1.5, pan: { x: 12, y: -7 } };
  const origin = dragOrigin(viewport, 300, 210);

  assert.deepEqual(origin, { x: 300 - viewport.pan.x, y: 210 - viewport.pan.y });
  assert.deepEqual(draggedPan(origin, 300, 210), viewport.pan, 'no jump when the drag starts');
  assert.deepEqual(draggedPan(origin, 315, 200), { x: 27, y: -17 });
});

test('clampPan restricts pan within reasonable bounds based on zoom', () => {
  const bounded1 = clampPan({ x: 9999, y: -9999 }, 1.0, CENTER);
  assert.ok(Math.abs(bounded1.x) <= CENTER * 1.0 * 0.85);
  assert.ok(Math.abs(bounded1.y) <= CENTER * 1.0 * 0.85);

  const bounded2 = clampPan({ x: 50, y: -40 }, 1.0, CENTER);
  assert.deepEqual(bounded2, { x: 50, y: -40 });
});

test('fit-all preset computes a camera that frames all candidate sites', () => {
  const sitePos = { x: CENTER, y: CENTER };
  const fitAll = presetViewport('fit-all', sitePos, CENTER);

  assert.ok(fitAll.zoom >= 1.0 && fitAll.zoom <= 2.5);
  assert.ok(Number.isFinite(fitAll.pan.x));
  assert.ok(Number.isFinite(fitAll.pan.y));
});

test('coordinateFromPointer handles widescreen aspect ratio letterboxing accurately', () => {
  const svgSize = DEFAULT_PROJECTION_CONFIG.svgSize; // 600
  // Container is 1000px wide and 500px tall. With preserveAspectRatio meet:
  // Rendered square is 500x500px, centered with 250px left margin.
  const rect = { left: 0, top: 0, width: 1000, height: 500 };
  const viewport = { zoom: 1, pan: { x: 0, y: 0 } };

  // Center of rendered square: clientX = 250 + 250 = 500, clientY = 250.
  const pole = coordinateFromPointer({
    clientX: 500,
    clientY: 250,
    rect,
    svgSize,
    center: CENTER,
    viewport,
  });

  assert.ok(pole);
  assert.equal(Math.round(pole!.latitudeDeg), -90);

  // Click in black bar area (clientX = 50, which is < 250): should return null
  const outsideBar = coordinateFromPointer({
    clientX: 50,
    clientY: 250,
    rect,
    svgSize,
    center: CENTER,
    viewport,
  });
  assert.equal(outsideBar, null);
});

test('zoomAroundWorldPoint preserves candidate site on screen across zoom levels', () => {
  const currentViewport = { zoom: 1.5, pan: { x: 30, y: -20 } };
  const worldPoint = { x: 380, y: 220 }; // off-center candidate site

  // Calculate screen position of world point before zoom
  const screenBeforeX = currentViewport.pan.x + CENTER + (worldPoint.x - CENTER) * currentViewport.zoom;
  const screenBeforeY = currentViewport.pan.y + CENTER + (worldPoint.y - CENTER) * currentViewport.zoom;

  // Zoom in to 3.0 focused on world candidate
  const zoomedViewport = zoomAroundWorldPoint(currentViewport, 3.0, worldPoint, CENTER);

  // Calculate screen position of world point after zoom
  const screenAfterX = zoomedViewport.pan.x + CENTER + (worldPoint.x - CENTER) * zoomedViewport.zoom;
  const screenAfterY = zoomedViewport.pan.y + CENTER + (worldPoint.y - CENTER) * zoomedViewport.zoom;

  assert.ok(Math.abs(screenBeforeX - screenAfterX) < 1e-4, 'World candidate X must stay identical on screen');
  assert.ok(Math.abs(screenBeforeY - screenAfterY) < 1e-4, 'World candidate Y must stay identical on screen');
  assert.equal(zoomedViewport.zoom, 3.0);
});

test('zoomAroundScreenPoint preserves point under mouse cursor across wheel zoom levels', () => {
  const currentViewport = { zoom: 1.2, pan: { x: 40, y: -30 } };
  const cursorScreenSvg = { x: 420, y: 180 }; // mouse pointer on screen

  // Invert cursor to world point before zoom
  const worldX = (cursorScreenSvg.x - CENTER - currentViewport.pan.x) / currentViewport.zoom + CENTER;
  const worldY = (cursorScreenSvg.y - CENTER - currentViewport.pan.y) / currentViewport.zoom + CENTER;

  // Zoom to 2.4 around cursor
  const zoomedViewport = zoomAroundScreenPoint(currentViewport, 2.4, cursorScreenSvg, CENTER);

  // Project world point back to screen after zoom
  const newScreenX = zoomedViewport.pan.x + CENTER + (worldX - CENTER) * zoomedViewport.zoom;
  const newScreenY = zoomedViewport.pan.y + CENTER + (worldY - CENTER) * zoomedViewport.zoom;

  assert.ok(Math.abs(newScreenX - cursorScreenSvg.x) < 1e-4, 'Cursor X must stay identical');
  assert.ok(Math.abs(newScreenY - cursorScreenSvg.y) < 1e-4, 'Cursor Y must stay identical');
  assert.equal(zoomedViewport.zoom, 2.4);
});
