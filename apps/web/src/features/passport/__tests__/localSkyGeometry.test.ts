import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPACT_FRAME_SPEC,
  COMPACT_LABEL_GUTTER_PX,
  COMPACT_LABEL_OFFSET_PX,
  COMPACT_TERRAIN_STEPS,
  EXPANDED_LABEL_GUTTER_PX,
  EXPANDED_LABEL_OFFSET_PX,
  EXPANDED_TERRAIN_STEPS,
  HORIZON_MAX_ELEV_DEG,
  HORIZON_MIN_ELEV_DEG,
  compactFrame,
  createHorizonFrame,
  expandedFrame,
  markerLabelPlacement,
  terrainSilhouettePath,
  type HorizonFrame,
} from '@/features/passport/model/localSkyGeometry';

/**
 * The two local-sky views are the same topocentric frame at different pixel
 * extents, so the mapping itself is the contract that keeps them consistent.
 * These tests pin the elevation/azimuth projection, the clamping behaviour and
 * the geometry-only flattening of the terrain mask.
 */

const FLOAT_TOLERANCE = 1e-9;

function assertClose(actual: number, expected: number, message: string): void {
  assert.ok(
    Math.abs(actual - expected) <= FLOAT_TOLERANCE,
    `${message}: expected ${expected}, got ${actual}`,
  );
}

function frameWith(extent: { viewBoxW: number; viewBoxH: number }): HorizonFrame {
  return createHorizonFrame({
    ...COMPACT_FRAME_SPEC,
    ...extent,
  });
}

interface Vertex {
  x: number;
  y: number;
}

/** Every `x y` pair in the path; the last two are the polygon's baseline corners. */
function pathVertices(path: string): Vertex[] {
  return [...path.matchAll(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g)].map((match) => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));
}

/** The sampled silhouette points, i.e. the polygon before it is closed along the base. */
function silhouetteVertices(path: string): Vertex[] {
  return pathVertices(path).slice(0, -2);
}

test('createHorizonFrame maps the plotted elevation band onto the drawing box', () => {
  const frame = frameWith({ viewBoxW: 500, viewBoxH: 200 });
  assert.equal(frame.chartW, 500 - COMPACT_FRAME_SPEC.padLeft - COMPACT_FRAME_SPEC.padRight);
  assert.equal(frame.chartH, 200 - COMPACT_FRAME_SPEC.padTop - COMPACT_FRAME_SPEC.padBottom);
  assert.equal(frame.plotRight, frame.padLeft + frame.chartW);
  assert.equal(frame.plotBottom, frame.padTop + frame.chartH);

  // Higher elevation is smaller y: the band's top edge is the maximum angle.
  assert.equal(frame.elevToY(HORIZON_MAX_ELEV_DEG), frame.padTop);
  assert.equal(frame.elevToY(HORIZON_MIN_ELEV_DEG), frame.plotBottom);
  assert.ok(frame.elevToY(20) < frame.elevToY(5));
});

test('createHorizonFrame clamps angles outside the plotted band', () => {
  const frame = frameWith({ viewBoxW: 500, viewBoxH: 200 });
  assert.equal(frame.elevToY(90), frame.elevToY(HORIZON_MAX_ELEV_DEG));
  assert.equal(frame.elevToY(-90), frame.elevToY(HORIZON_MIN_ELEV_DEG));
  assert.ok(frame.elevToY(90) >= frame.padTop);
  assert.ok(frame.elevToY(-90) <= frame.plotBottom);
});

test('the 0° reference plane keeps the same fractional height in both views', () => {
  const bandSpan = HORIZON_MAX_ELEV_DEG - HORIZON_MIN_ELEV_DEG;
  const expectedAboveBase = -HORIZON_MIN_ELEV_DEG / bandSpan;

  for (const frame of [compactFrame, expandedFrame]) {
    assert.equal(frame.zeroY, frame.elevToY(0));
    const fractionAboveBase = (frame.plotBottom - frame.zeroY) / frame.chartH;
    assertClose(fractionAboveBase, expectedAboveBase, `${frame.viewBoxH}px chart zero plane`);
  }

  // Same frame maths at different extents: a shared elevation holds a shared
  // fractional height, so the two views cannot drift apart.
  assert.ok(expandedFrame.chartH > compactFrame.chartH);
  for (const elevationDeg of [-6, -2, 0, 7.5, 14, 22]) {
    const compactFraction =
      (compactFrame.plotBottom - compactFrame.elevToY(elevationDeg)) / compactFrame.chartH;
    const expandedFraction =
      (expandedFrame.plotBottom - expandedFrame.elevToY(elevationDeg)) / expandedFrame.chartH;
    assertClose(compactFraction, expandedFraction, `${elevationDeg}° plotted fraction`);
  }
});

test('azimuth projection wraps any bearing into the 0-360 plot', () => {
  const frame = frameWith({ viewBoxW: 480, viewBoxH: 200 });
  const quarter = frame.chartW / 4;

  assert.equal(frame.azToX(0), frame.padLeft);
  assertClose(frame.azToX(90), frame.padLeft + quarter, 'east bearing');
  assertClose(frame.azToX(180), frame.padLeft + 2 * quarter, 'south bearing');
  assertClose(frame.azToX(270), frame.padLeft + 3 * quarter, 'west bearing');

  // Out-of-range bearings are the same direction, not a different x.
  assertClose(frame.azToX(360), frame.azToX(0), 'full turn wraps');
  assertClose(frame.azToX(-90), frame.azToX(270), 'negative bearing wraps');
  assertClose(frame.azToX(720), frame.azToX(0), 'multiple turns wrap');
});

test('terrain silhouette samples one vertex per azimuth step and closes the polygon', () => {
  const options = {
    mode: 'terrain-aware' as const,
    meanTerrainHorizonDeg: -0.5,
    maxTerrainObstructionDeg: 3.5,
  };
  for (const [frame, steps] of [
    [compactFrame, COMPACT_TERRAIN_STEPS],
    [expandedFrame, EXPANDED_TERRAIN_STEPS],
  ] as const) {
    const path = terrainSilhouettePath(frame, { ...options, steps });
    assert.equal(path[0], 'M');
    assert.ok(path.endsWith('Z'));
    assert.equal(silhouetteVertices(path).length, steps + 1);
    assert.ok(path.includes(`L ${frame.plotRight} ${frame.plotBottom}`));
    assert.ok(path.includes(`L ${frame.padLeft} ${frame.plotBottom}`));
  }
});

test('geometry-only flattens the terrain mask onto the 0° horizon', () => {
  const path = terrainSilhouettePath(compactFrame, {
    mode: 'geometry-only',
    meanTerrainHorizonDeg: -0.5,
    maxTerrainObstructionDeg: 3.5,
    steps: COMPACT_TERRAIN_STEPS,
  });
  const heights = new Set(silhouetteVertices(path).map((vertex) => vertex.y));
  assert.equal(heights.size, 1, 'geometry-only silhouette must be a single flat line');
  const [onlyY] = [...heights];
  assert.equal(onlyY, Number(compactFrame.elevToY(0).toFixed(1)));
});

test('terrain-aware silhouette follows the site horizon profile and never dips below the plane', () => {
  const meanTerrainHorizonDeg = 0.4;
  const maxTerrainObstructionDeg = 4.2;
  const path = terrainSilhouettePath(expandedFrame, {
    mode: 'terrain-aware',
    meanTerrainHorizonDeg,
    maxTerrainObstructionDeg,
    steps: EXPANDED_TERRAIN_STEPS,
  });
  // Coordinates are written at 0.1px precision, so allow that much slack.
  const planeY = Number(expandedFrame.elevToY(0).toFixed(1));
  const meanY = Number(expandedFrame.elevToY(meanTerrainHorizonDeg).toFixed(1));
  const peakY = Number(expandedFrame.elevToY(maxTerrainObstructionDeg).toFixed(1));
  const vertices = silhouetteVertices(path);

  assert.ok(vertices.every((v) => v.y <= planeY + 0.1), 'mask is clamped at the reference plane');
  assert.ok(vertices.some((v) => v.y < meanY - 0.1), 'terrain relief must vary around the mean horizon');
  assert.ok(vertices.every((v) => v.y >= peakY - 0.1), 'mask never exceeds the site peak obstruction');
});

test('a terrain profile at or below the plane still draws a flat mask', () => {
  const path = terrainSilhouettePath(compactFrame, {
    mode: 'terrain-aware',
    meanTerrainHorizonDeg: -3,
    maxTerrainObstructionDeg: -1,
    steps: COMPACT_TERRAIN_STEPS,
  });
  const heights = new Set(silhouetteVertices(path).map((vertex) => vertex.y));
  assert.equal(heights.size, 1);
});

test('marker labels flip inside the right gutter so text stays inside the plot', () => {
  const cases: [HorizonFrame, number, number][] = [
    [compactFrame, COMPACT_LABEL_GUTTER_PX, COMPACT_LABEL_OFFSET_PX],
    [expandedFrame, EXPANDED_LABEL_GUTTER_PX, EXPANDED_LABEL_OFFSET_PX],
  ];
  for (const [frame, gutter, offset] of cases) {
    const centre = markerLabelPlacement(frame, frame.azToX(180), gutter, offset);
    assert.equal(centre.anchor, 'start');
    assert.equal(centre.x, frame.azToX(180) + offset);

    const edge = markerLabelPlacement(frame, frame.plotRight - 1, gutter, offset);
    assert.equal(edge.anchor, 'end');
    assert.equal(edge.x, frame.plotRight - 1 - offset);

    // Exactly at the gutter boundary the label still points right.
    const boundary = markerLabelPlacement(frame, frame.plotRight - gutter, gutter, offset);
    assert.equal(boundary.anchor, 'start');
  }
});
