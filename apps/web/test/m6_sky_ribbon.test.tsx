/**
 * Milestone C — Dual-Panel Sky-Ribbon 2.0 (ADR-03) behavioural suite.
 *
 * Asserts real behaviour, not snapshots:
 *  1. The grazing corridor is ONE affine elevation mapping — zero curvature, no
 *     scale break at +5° (the old canvas's defect), out-of-band geometry clipped
 *     rather than compressed.
 *  2. Azimuth/elevation projection round-trips, including a partial azimuth arc.
 *  3. Keyboard cursor reducer increments, wraps and clamps.
 *  4. Renderers emit a linear graticule, hatch occluded sectors, mark contact
 *     points and refuse to invent a flat horizon.
 *  5. Deck lifecycle markup (loading / empty / error / ready).
 *  6. Read-out derivations and rate provenance come from backend values only.
 */

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalScenarioProvider } from '../src/app/state/GlobalScenarioContext';
import {
  CORRIDOR_HEIGHT_PX,
  CORRIDOR_MAX_ELEVATION_DEG,
  CORRIDOR_MIN_ELEVATION_DEG,
  PANORAMA_MIN_ELEVATION_DEG,
  clampToElevationAxis,
  createCorridorProjection,
  createPanoramaProjection,
  pointerToSkyPosition,
} from '../src/features/sky-ribbon/skyRibbonProjection';
import {
  CURSOR_STEP_DEG,
  applyCursorKey,
  describeCursor,
  type SkyCursor,
} from '../src/features/sky-ribbon/skyRibbonCursor';
import {
  drawAzimuthGraticule,
  drawElevationGraticule,
  drawPanelBackground,
} from '../src/features/sky-ribbon/skyRibbonRenderer';
import { drawSkyline } from '../src/features/sky-ribbon/skyRibbonSkylineRenderer';
import { drawCelestialBody } from '../src/features/sky-ribbon/skyRibbonCelestialRenderer';
import { horizonBinsFromIntervals, toSkylineSamples } from '../src/features/sky-ribbon/skyRibbonSkyline';
import {
  buildEarthReadout,
  buildRateReadouts,
  buildSolarReadout,
} from '../src/features/sky-ribbon/skyRibbonAnalysis';
import { SkyRibbonDeck } from '../src/features/sky-ribbon/SkyRibbonDeck';
import { prepareSkyContext } from '../src/features/sky-ribbon/useSkyCanvasSurface';
import { createRecordingContext, makeInterval } from './m6_sky_ribbon_fixtures';

const WIDTH_PX = 1080;

describe('Milestone C: grazing corridor axis linearity', () => {
  it('maps elevation with one affine transform and zero curvature across the corridor', () => {
    const projection = createCorridorProjection(WIDTH_PX);
    const axis = projection.elevation;

    expect(axis.minDeg).toBe(-5);
    expect(axis.maxDeg).toBe(10);
    expect(axis.pixelsPerDegree).toBeCloseTo(CORRIDOR_HEIGHT_PX / 15, 12);

    // Constant first difference…
    const step = 0.25;
    const elevations: number[] = [];
    for (let el = CORRIDOR_MIN_ELEVATION_DEG; el <= CORRIDOR_MAX_ELEVATION_DEG + 1e-9; el += step) {
      elevations.push(Math.round(el * 1000) / 1000);
    }
    const slopes = elevations.slice(1).map((el, index) => {
      const previous = elevations[index];
      return (projection.elevationToY(el) - projection.elevationToY(previous)) / (el - previous);
    });
    for (const slope of slopes) expect(slope).toBeCloseTo(slopes[0], 10);

    // …and exactly zero second difference (affine ⇒ no break can hide anywhere).
    for (let index = 0; index + 2 < elevations.length; index++) {
      const secondDifference =
        projection.elevationToY(elevations[index]) -
        2 * projection.elevationToY(elevations[index + 1]) +
        projection.elevationToY(elevations[index + 2]);
      expect(Math.abs(secondDifference)).toBeLessThan(1e-9);
    }

    // Monotonic: higher elevation is always higher on screen.
    for (let index = 1; index < elevations.length; index++) {
      expect(projection.elevationToY(elevations[index])).toBeLessThan(
        projection.elevationToY(elevations[index - 1]),
      );
    }
  });

  it('has no scale break at +5° (the retired canvas magnified below the seam by 6x)', () => {
    const projection = createCorridorProjection(WIDTH_PX);
    const slopeBelowLegacySeam = projection.elevationToY(5.1) - projection.elevationToY(4.9);
    const slopeAtHorizon = projection.elevationToY(0.1) - projection.elevationToY(-0.1);
    const slopeAtCeiling = projection.elevationToY(9.9) - projection.elevationToY(9.7);

    expect(slopeBelowLegacySeam).toBeCloseTo(slopeAtHorizon, 10);
    expect(slopeAtCeiling).toBeCloseTo(slopeAtHorizon, 10);
    // 0.2° must be the same number of pixels everywhere in the panel.
    expect(Math.abs(slopeBelowLegacySeam)).toBeCloseTo(0.2 * projection.elevation.pixelsPerDegree, 9);
  });

  it('resolves grazing contact to a fraction of a degree and clips out-of-band geometry', () => {
    const projection = createCorridorProjection(WIDTH_PX);
    // 0.1° must be at least 2 device pixels so a limb contact is legible.
    expect(projection.elevation.pixelsPerDegree * 0.1).toBeGreaterThanOrEqual(2);

    // Above the ceiling / below the floor: out of range, not squashed inside.
    expect(projection.elevationToY(25)).toBeLessThan(0);
    expect(projection.elevationToY(-15)).toBeGreaterThan(CORRIDOR_HEIGHT_PX);
    expect(projection.isElevationVisible(10.01)).toBe(false);
    expect(projection.isElevationVisible(9.99)).toBe(true);
    expect(clampToElevationAxis(25, projection.elevation)).toBe(CORRIDOR_MAX_ELEVATION_DEG);
  });

  it('keeps the panorama linear too, with a coarser (but unbroken) scale', () => {
    const panorama = createPanoramaProjection(WIDTH_PX);
    const corridor = createCorridorProjection(WIDTH_PX);
    const panoramaSlope =
      panorama.elevationToY(30) - panorama.elevationToY(-10);
    expect(panoramaSlope).toBeCloseTo(-40 * panorama.elevation.pixelsPerDegree, 9);
    expect(panorama.elevation.minDeg).toBe(PANORAMA_MIN_ELEVATION_DEG);
    expect(panorama.elevation.maxDeg).toBe(90);
    expect(corridor.elevation.pixelsPerDegree).toBeGreaterThan(
      panorama.elevation.pixelsPerDegree * 5,
    );
  });
});

describe('Milestone C: projection round-trips', () => {
  it('round-trips elevation and azimuth through pixel space', () => {
    const panorama = createPanoramaProjection(WIDTH_PX);
    for (let elevation = -15; elevation <= 90; elevation += 1.5) {
      expect(panorama.yToElevation(panorama.elevationToY(elevation))).toBeCloseTo(elevation, 9);
    }
    for (let azimuth = 0; azimuth < 360; azimuth += 7.5) {
      expect(panorama.xToAzimuth(panorama.azimuthToX(azimuth))).toBeCloseTo(azimuth, 6);
    }
    for (let elevation = -5; elevation <= 10; elevation += 0.5) {
      const corridor = createCorridorProjection(WIDTH_PX);
      expect(corridor.yToElevation(corridor.elevationToY(elevation))).toBeCloseTo(elevation, 9);
    }
  });

  it('round-trips inside a partial azimuth arc without touching the elevation scale', () => {
    const full = createCorridorProjection(WIDTH_PX);
    const arc = createCorridorProjection(WIDTH_PX, 150, 60);

    expect(arc.azimuth.startDeg).toBeCloseTo(120, 9);
    expect(arc.azimuth.spanDeg).toBe(60);
    expect(arc.elevation.pixelsPerDegree).toBeCloseTo(full.elevation.pixelsPerDegree, 12);

    for (const azimuth of [120, 135, 150, 179.5]) {
      expect(arc.xToAzimuth(arc.azimuthToX(azimuth))).toBeCloseTo(azimuth, 6);
    }
    expect(arc.isAzimuthVisible(150)).toBe(true);
    expect(arc.isAzimuthVisible(30)).toBe(false);
    // Just outside the arc stays just outside (clipped), never wrapped to the far edge.
    expect(arc.azimuthToX(119)).toBeLessThan(0);
  });

  it('maps pointer coordinates back onto sky coordinates', () => {
    const projection = createPanoramaProjection(WIDTH_PX);
    const position = pointerToSkyPosition(projection, { left: 10, top: 20 }, 10 + 540, 20);
    expect(position.azimuthDeg).toBeCloseTo(180, 6);
    expect(position.elevationDeg).toBeCloseTo(90, 6);

    const below = pointerToSkyPosition(projection, { left: 0, top: 0 }, 0, 264);
    expect(below.azimuthDeg).toBeCloseTo(0, 6);
    expect(below.elevationDeg).toBeCloseTo(-15, 6);
  });
});

describe('Milestone C: keyboard cursor', () => {
  const projection = createCorridorProjection(WIDTH_PX);
  const seeded: SkyCursor = {
    panel: 'grazing-corridor',
    azimuthDeg: 200,
    elevationDeg: 1.5,
    source: 'keyboard',
  };

  it('steps, coarsens, wraps and clamps', () => {
    const fine = applyCursorKey(null, 'ArrowRight', projection, {
      seed: { azimuthDeg: 200, elevationDeg: 1.5 },
    });
    expect(fine.handled).toBe(true);
    expect(fine.cursor?.azimuthDeg).toBeCloseTo(200 + CURSOR_STEP_DEG.azimuthFine, 9);

    const coarse = applyCursorKey(seeded, 'ArrowRight', projection, { shiftKey: true });
    expect(coarse.cursor?.azimuthDeg).toBeCloseTo(200 + CURSOR_STEP_DEG.azimuthCoarse, 9);

    const page = applyCursorKey(seeded, 'PageUp', projection);
    expect(page.cursor?.azimuthDeg).toBeCloseTo(230, 9);

    const up = applyCursorKey(seeded, 'ArrowUp', projection, { shiftKey: true });
    expect(up.cursor?.elevationDeg).toBeCloseTo(2.5, 9);

    const ceiling = applyCursorKey({ ...seeded, elevationDeg: 9.95 }, 'ArrowUp', projection, {
      shiftKey: true,
    });
    expect(ceiling.cursor?.elevationDeg).toBe(CORRIDOR_MAX_ELEVATION_DEG);

    const wrapped = applyCursorKey({ ...seeded, azimuthDeg: 359.8 }, 'ArrowRight', projection);
    expect(wrapped.cursor?.azimuthDeg).toBeCloseTo(0.3, 9);

    expect(applyCursorKey(seeded, 'Home', projection).cursor?.azimuthDeg).toBe(0);
    expect(applyCursorKey(seeded, 'Enter', projection).selectRequested).toBe(true);
    expect(applyCursorKey(seeded, 'Escape', projection).cursor).toBeNull();
    expect(applyCursorKey(seeded, 'Tab', projection).handled).toBe(false);
    expect(describeCursor(seeded)).toBe('Grazing Corridor cursor · AZ 200.0° · EL +1.50°');
  });
});

describe('Milestone C: canvas renderers', () => {
  it('draws an evenly spaced elevation graticule (proof the axis is linear)', () => {
    const projection = createCorridorProjection(WIDTH_PX);
    const recorder = createRecordingContext();
    drawElevationGraticule(recorder.ctx, projection, 1);

    const tickYs = recorder.calls
      .filter((call) => call.method === 'moveTo')
      .map((call) => call.args[1]);
    expect(tickYs.length).toBe(16); // -5 … +10 inclusive, 1° steps
    // Ticks are emitted bottom-up (increasing elevation), so screen Y decreases by
    // exactly one degree of pixels — the defining property of a linear axis.
    const gaps = tickYs.slice(1).map((y, index) => tickYs[index] - y);
    for (const gap of gaps) expect(gap).toBeCloseTo(projection.elevation.pixelsPerDegree, 9);
    expect(recorder.texts).toContain('±0.0°');
  });

  it('hatches occluded terrain sectors and marks the contact azimuth', () => {
    const projection = createCorridorProjection(WIDTH_PX);
    const recorder = createRecordingContext();
    drawSkyline(
      recorder.ctx,
      projection,
      [
        { azimuthDeg: 150, nominalDeg: 0.4, lowDeg: null, highDeg: null },
        { azimuthDeg: 160, nominalDeg: 1.8, lowDeg: null, highDeg: null },
        { azimuthDeg: 170, nominalDeg: 2.1, lowDeg: null, highDeg: null },
      ],
      { occluderElevationDeg: 1.2 },
    );
    expect(recorder.countOf('stroke')).toBeGreaterThan(3); // silhouette + hatch + contacts
    expect(recorder.texts.filter((text) => text === '✕').length).toBe(1);
  });

  it('never substitutes a flat horizon when no bins are supplied', () => {
    const projection = createCorridorProjection(WIDTH_PX);
    const recorder = createRecordingContext();
    drawSkyline(recorder.ctx, projection, [], {});
    const notice = recorder.texts.join(' | ');
    expect(notice).toContain('NO TERRAIN SKYLINE TELEMETRY');
    expect(notice).toContain('NOT assumed to be 0°');
    expect(recorder.countOf('fill')).toBe(0); // no terrain polygon was invented
  });

  it('draws the sun at its angular radius when the API supplies one', () => {
    const projection = createCorridorProjection(WIDTH_PX);
    const withRadius = createRecordingContext();
    drawCelestialBody(
      withRadius.ctx,
      projection,
      { kind: 'sun', label: 'SUN', azimuthDeg: 150, elevationDeg: 1.2, angularRadiusDeg: 0.26 },
      { reducedMotion: false },
    );
    const radii = withRadius.calls.filter((call) => call.method === 'arc').map((call) => call.args[2]);
    expect(radii.some((radius) => Math.abs(radius - 0.26 * projection.elevation.pixelsPerDegree) < 1e-9)).toBe(true);

    const withoutRadius = createRecordingContext();
    drawCelestialBody(
      withoutRadius.ctx,
      projection,
      { kind: 'sun', label: 'SUN', azimuthDeg: 150, elevationDeg: 1.2 },
      { reducedMotion: true },
    );
    const markerRadii = withoutRadius.calls
      .filter((call) => call.method === 'arc')
      .map((call) => call.args[2]);
    expect(markerRadii).toEqual([4]); // glyph marker, no invented angular scale
  });

  it('flags a body that sits outside the corridor instead of clamping it inside', () => {
    const projection = createCorridorProjection(WIDTH_PX);
    const inside = createRecordingContext();
    drawCelestialBody(
      inside.ctx,
      projection,
      { kind: 'earth', label: 'EARTH', azimuthDeg: 342, elevationDeg: 8.4 },
      { reducedMotion: true },
    );
    expect(inside.countOf('arc')).toBe(1);

    const outside = createRecordingContext();
    drawCelestialBody(
      outside.ctx,
      projection,
      { kind: 'earth', label: 'TARGET', azimuthDeg: 342, elevationDeg: 42 },
      { reducedMotion: true },
    );
    expect(outside.texts.join(' ')).toContain('▲ TARGET +42.00°');
    expect(outside.countOf('arc')).toBe(0);
  });

  it('paints the panel background and graticule without throwing', () => {
    const projection = createPanoramaProjection(WIDTH_PX);
    const recorder = createRecordingContext();
    drawPanelBackground(recorder.ctx, projection);
    drawAzimuthGraticule(recorder.ctx, projection, 45);
    expect(recorder.countOf('fillRect')).toBe(1);
    expect(recorder.texts).toContain('315°');
    expect(recorder.texts).toContain('0°');
  });
});

describe('Milestone C: read-out derivations', () => {
  it('reports the backend disk fraction and criterion clearance verbatim', () => {
    const interval = makeInterval({
      sun: {
        status: 'partial_limb',
        fractionalSolarDiskVisibility: 0.435,
        clearanceDeg: -0.08,
        meanElevationDeg: 0.18,
        meanHorizonMaskDeg: 0.26,
        blocker: { azimuthDeg: 154.5, distanceKm: 12.4, elevationMeters: 1820, featureName: 'Connecting Ridge' },
      },
    });
    const solar = buildSolarReadout(interval);
    expect(solar.state).toBe('partial');
    expect(solar.badge).toBe('PARTIAL LIMB');
    expect(solar.diskPercent).toBeCloseTo(43.5, 9);
    expect(solar.clearanceDeg).toBe(-0.08);
    expect(solar.blockerAzimuthDeg).toBe(154.5);
    expect(solar.blockerLabel).toBe('Connecting Ridge');
  });

  it('distinguishes terrain-blocked Earth from below-horizon Earth', () => {
    const blocked = buildEarthReadout(makeInterval({ earth: { status: 'terrain_blocked' } }));
    const below = buildEarthReadout(makeInterval({ earth: { status: 'earth_sub_horizon' } }));
    expect(blocked.state).toBe('terrain-blocked');
    expect(below.state).toBe('below-horizon');
    expect(buildEarthReadout(null).state).toBe('unknown');
  });

  it('labels rate provenance and refuses a wrapped azimuth difference', () => {
    const first = makeInterval({ startEpochMs: 0, endEpochMs: 3_600_000, sun: { meanAzimuthDeg: 10, meanElevationDeg: 1 } });
    const second = makeInterval({
      startEpochMs: 3_600_000,
      endEpochMs: 7_200_000,
      sun: { meanAzimuthDeg: 12, meanElevationDeg: 1.5 },
    });
    const derived = buildRateReadouts([first, second], 0);
    expect(derived.sunAzimuth.provenance).toBe('interval-mean');
    expect(derived.sunAzimuth.valueDegPerHour).toBeCloseTo(2, 9);
    expect(derived.sunElevation.valueDegPerHour).toBeCloseTo(0.5, 9);

    const supplied = buildRateReadouts([first, second], 0, { sunAzimuthRateDegPerHour: 14.2 });
    expect(supplied.sunAzimuth.provenance).toBe('api');
    expect(supplied.sunAzimuth.valueDegPerHour).toBe(14.2);

    const wrapped = buildRateReadouts(
      [first, makeInterval({ startEpochMs: 3_600_000, endEpochMs: 7_200_000, sun: { meanAzimuthDeg: 350 } })],
      0,
    );
    expect(wrapped.sunAzimuth.provenance).toBe('unavailable');
    expect(wrapped.sunAzimuth.valueDegPerHour).toBeNull();

    const last = buildRateReadouts([first], 0);
    expect(last.sunAzimuth.provenance).toBe('unavailable');
  });

  it('normalizes horizon bins without inventing a flat horizon', () => {
    const samples = toSkylineSamples([
      { azimuthDeg: 350, thetaNomDeg: 0.4, thetaLowDeg: 0.2, thetaHighDeg: 0.6 },
      { azimuthDeg: 10, elevationDeg: 1.1 },
      { azimuthDeg: 20 },
      { azimuthDeg: Number.NaN, thetaNomDeg: 3 },
    ]);
    expect(samples.length).toBe(2);
    expect(samples[0].azimuthDeg).toBe(10);
    expect(samples[0].lowDeg).toBeNull();
    expect(samples[1].nominalDeg).toBe(0.4);
    expect(toSkylineSamples(undefined)).toEqual([]);

    const fromIntervals = horizonBinsFromIntervals([makeInterval()]);
    expect(fromIntervals[0].thetaNomDeg).toBe(0.25);
  });
});

describe('Milestone C: deck lifecycle states', () => {
  const renderDeck = (element: React.ReactElement) =>
    renderToStaticMarkup(<GlobalScenarioProvider>{element}</GlobalScenarioProvider>);

  it('renders an explicit empty state rather than a blank canvas', () => {
    const html = renderDeck(<SkyRibbonDeck siteName="Connecting Ridge" intervals={[]} />);
    expect(html).toContain('data-testid="sky-ribbon-deck-empty"');
    expect(html).toContain('[NO DATA]');
    expect(html).toContain('horizon is not assumed flat');
    expect(html).not.toContain('data-testid="grazing-corridor-canvas"');
  });

  it('renders loading and error states with non-colour badges', () => {
    const loading = renderDeck(<SkyRibbonDeck status="loading" />);
    expect(loading).toContain('data-testid="sky-ribbon-deck-loading"');
    expect(loading).toContain('[LOADING]');
    expect(loading).toContain('role="status"');

    const failed = renderDeck(
      <SkyRibbonDeck status="error" errorMessage="Ephemeris cache miss" onRetry={() => {}} />,
    );
    expect(failed).toContain('data-testid="sky-ribbon-deck-error"');
    expect(failed).toContain('role="alert"');
    expect(failed).toContain('Ephemeris cache miss');
    expect(failed).toContain('Retry Evaluation');
  });

  it('renders both panels, the read-out strip and the companion table when data exists', () => {
    const html = renderDeck(
      <SkyRibbonDeck
        siteName="Connecting Ridge"
        intervals={[makeInterval()]}
        horizonProfile={[{ azimuthDeg: 154.5, thetaNomDeg: 0.25 }]}
        solarCriterion="upperLimb"
      />,
    );
    expect(html).toContain('data-testid="sky-ribbon-deck"');
    expect(html).toContain('data-testid="sky-panorama-canvas"');
    expect(html).toContain('data-testid="grazing-corridor-canvas"');
    expect(html).toContain('data-testid="sky-analytical-readout"');
    expect(html).toContain('data-testid="sky-ribbon-a11y-table"');
    expect(html).toContain('STRICTLY LINEAR');
    // The no-scale-break claim stays visible; the redesign renders it in sentence case in the
    // deck header and again on the canvas scale legend, rather than as one all-caps DOM string.
    expect(html.toLowerCase()).toContain('no scale break');
    // With no published disk geometry the deck must say so instead of drawing a guessed disk.
    expect(html).toContain('Apparent solar disk');
    expect(html).toContain('unsupported');
  });

  it('safeguards canvas backing store and returns null on degenerate dimensions', () => {
    expect(prepareSkyContext(null, 500, 200, 1)).toBeNull();
    expect(prepareSkyContext({} as HTMLCanvasElement, 0, 200, 1)).toBeNull();
    expect(prepareSkyContext({} as HTMLCanvasElement, 500, 0, 1)).toBeNull();

    let widthSetCount = 0;
    let currentWidth = 500;
    const mockCanvas = {
      get width() { return currentWidth; },
      set width(v: number) { widthSetCount++; currentWidth = v; },
      height: 200,
      getContext: (type: string) => {
        if (type !== '2d') return null;
        return {
          setTransform: () => {},
          clearRect: () => {},
        } as unknown as CanvasRenderingContext2D;
      },
    } as unknown as HTMLCanvasElement;

    // First call sets width because target is 500 * 2 = 1000
    const ctx1 = prepareSkyContext(mockCanvas, 500, 200, 2);
    expect(ctx1).not.toBeNull();
    expect(widthSetCount).toBe(1);
    expect(mockCanvas.width).toBe(1000);

    // Second call with same dimensions MUST NOT reassign width (prevents bitmap clearing)
    const ctx2 = prepareSkyContext(mockCanvas, 500, 200, 2);
    expect(ctx2).not.toBeNull();
    expect(widthSetCount).toBe(1); // Unchanged!
  });
});
