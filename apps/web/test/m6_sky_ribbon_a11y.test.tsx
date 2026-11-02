/**
 * Milestone C — Dual-Panel Sky-Ribbon 2.0 accessibility suite.
 *
 * Verifies what a non-visual or low-vision operator actually receives:
 *  - the companion region carries real clearance / disk-fraction / ridge-azimuth /
 *    rise-set values and states its observable definitions;
 *  - state is conveyed by glyph + bracketed text + hatching, never colour alone;
 *  - both canvases are decorative (`aria-hidden`) and the interactive widgets are
 *    keyboard reachable with visible focus rings;
 *  - `prefers-reduced-motion` removes decorative drawing without changing any
 *    geometry;
 *  - AGENTS.md § 5.1 file-size caps hold.
 */

import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SkyRibbonA11yTable } from '../src/features/sky-ribbon/SkyRibbonA11yTable';
import { SkyAnalyticalReadout } from '../src/features/sky-ribbon/SkyAnalyticalReadout';
import { SkyRibbonDeck } from '../src/features/sky-ribbon/SkyRibbonDeck';
import {
  buildEarthReadout,
  buildMissionEventReadout,
  buildRateReadouts,
  buildSolarReadout,
} from '../src/features/sky-ribbon/skyRibbonAnalysis';
import { buildSkylineTopology, toSkylineSamples } from '../src/features/sky-ribbon/skyRibbonSkyline';
import { buildTrajectory } from '../src/features/sky-ribbon/skyRibbonTrajectory';
import { resolveSolarDiskModel } from '../src/features/sky-ribbon/skyRibbonDisk';
import { buildEventRows, buildGrazingRows, buildRidgeContacts } from '../src/features/sky-ribbon/skyRibbonTableModel';
import { createCorridorProjection } from '../src/features/sky-ribbon/skyRibbonProjection';
import { drawCelestialBody } from '../src/features/sky-ribbon/skyRibbonCelestialRenderer';
import { GlobalScenarioProvider } from '../src/app/state/GlobalScenarioContext';
import { createRecordingContext, makeInterval, makeWhisker, BASE_EPOCH_MS } from './m6_sky_ribbon_fixtures';

const FEATURE_DIR = resolve(import.meta.dir, '../src/features/sky-ribbon');

const grazingInterval = makeInterval({
  sun: {
    status: 'partial_limb',
    fractionalSolarDiskVisibility: 0.435,
    meanElevationDeg: 0.18,
    meanAzimuthDeg: 154.5,
    meanHorizonMaskDeg: 0.26,
    clearanceDeg: -0.08,
    blocker: {
      azimuthDeg: 154.5,
      distanceKm: 12.4,
      elevationMeters: 1820,
      featureName: 'Connecting Ridge',
    },
  },
  earth: { status: 'terrain_blocked', clearanceDeg: -1.4, meanElevationDeg: 0.9 },
});

const skyline = toSkylineSamples([
  { azimuthDeg: 152, thetaNomDeg: 0.4 },
  { azimuthDeg: 154.5, thetaNomDeg: 0.26 },
  { azimuthDeg: 158, thetaNomDeg: 1.9 },
  { azimuthDeg: 160, thetaNomDeg: 0.1 },
]);

describe('Milestone C accessibility: companion table content', () => {
  const renderTable = (intervals = [grazingInterval], whiskers = [makeWhisker()]) => {
    const solar = buildSolarReadout(intervals[0] ?? null);
    const earth = buildEarthReadout(intervals[0] ?? null);
    return renderToStaticMarkup(
      <SkyRibbonA11yTable
        siteName="Connecting Ridge"
        intervals={intervals}
        eventWhiskers={whiskers}
        skyline={skyline}
        skylineTopology={buildSkylineTopology(skyline)}
        activeIndex={0}
        solar={solar}
        earth={earth}
        missionEvent={buildMissionEventReadout(intervals[0] ?? null)}
        disk={resolveSolarDiskModel({
          centreElevationDeg: intervals[0]?.sun.meanElevationDeg ?? null,
          angularRadiusDeg: 0.26,
        })}
        trajectories={[
          buildTrajectory(intervals, 'sun'),
          buildTrajectory(intervals, 'earth'),
        ]}
        solarCriterionLabel="upper-limb"
        windowLabel="2026-11-01 00:00Z → 2026-11-01 02:00Z"
      />,
    );
  };

  it('is a labelled region carrying clearance, disk fraction and Earth LoS', () => {
    const html = renderTable();
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Accessible sky-ribbon companion for Connecting Ridge');
    expect(html).toContain('-0.08°'); // signed criterion clearance
    expect(html).toContain('43.5%'); // geometric visible disk fraction
    expect(html).toContain('[PARTIAL]');
    expect(html).toContain('TERRAIN BLOCKED'); // Earth geometric LoS
    expect(html).toContain('ACTIVE · ');
    expect(html).toContain('2026-11-01 00:00Z → 2026-11-01 02:00Z');
  });

  it('exposes blocking ridge azimuths and rise/set times as table rows', () => {
    const html = renderTable();
    expect(html).toContain('Blocking ridge AZ');
    expect(html).toContain('154.5° (Connecting Ridge)');
    expect(html).toContain('Sunset (solar limb)');
    expect(html).toContain('2026-11-01 06:00Z');
    expect(html).toContain('MODERATE');
    expect(html).toContain('(±1.0 h)');
    expect(html).toContain('<caption');
    expect(html).toContain('<th scope="row"');
  });

  it('lists terrain sectors that reach the current solar elevation', () => {
    const html = renderTable();
    expect(html).toContain('AZ 158.0° at +1.90°');
    expect(html).toContain('AZ 152.0° at +0.40°');
  });

  it('states the observable definitions so the mirror cannot be misread', () => {
    const html = renderTable();
    // The redesign states each observable next to its own figure: the area fraction is geometric,
    // the irradiance-weighted figure is a different observable, and neither is electrical power.
    expect(html).toContain('visible disk fraction is the backend geometric (area) fraction');
    expect(html).toContain('irradiance-weighted fraction is a limb-darkened solid-angle');
    expect(html).toContain('still not generated electrical power');
    expect(html).toContain('not an RF link closure');
    expect(html).toContain('upper-limb criterion');
  });

  it('renders explicit empty rows when the scenario has no telemetry', () => {
    const html = renderTable([], []);
    expect(html).toContain('data-testid="sky-ribbon-a11y-rows-empty"');
    expect(html).toContain('data-testid="sky-ribbon-a11y-events-empty"');
    expect(html).toContain('No evaluated sub-intervals were returned');
    expect(html).toContain('No rise or set event was returned');
  });
});

describe('Milestone C accessibility: table model', () => {
  it('ranks the most occluded sub-intervals first and keeps the active row', () => {
    const intervals = [
      makeInterval({ startEpochMs: BASE_EPOCH_MS, sun: { fractionalSolarDiskVisibility: 1 } }),
      makeInterval({
        startEpochMs: BASE_EPOCH_MS + 3_600_000,
        sun: { fractionalSolarDiskVisibility: 0.2 },
      }),
      makeInterval({
        startEpochMs: BASE_EPOCH_MS + 7_200_000,
        sun: { fractionalSolarDiskVisibility: 0.6 },
      }),
    ];
    const rows = buildGrazingRows(intervals, 2, 2);
    expect(rows.length).toBe(2);
    // The active sub-interval is always present and sorts first.
    expect(rows[0].isActive).toBe(true);
    expect(rows[0].windowLabel).toContain('2026-11-01 02:00Z');
    // The remaining slot goes to the most occluded sub-interval, not the clearest.
    expect(rows[1].diskPercent).toBeCloseTo(20, 9);
    expect(buildGrazingRows([], 0)).toEqual([]);
  });

  it('caps mirror rows and derives contacts by comparison only', () => {
    const whiskers = Array.from({ length: 20 }, (_, index) =>
      makeWhisker({ eventType: index % 2 === 0 ? 'SUNRISE' : 'EARTH_SET' }),
    );
    expect(buildEventRows(whiskers).length).toBe(12);
    expect(buildEventRows(whiskers)[0].type).toBe('Sunrise (solar limb)');
    expect(buildRidgeContacts(skyline, 0.3).map((contact) => contact.azimuthDeg)).toEqual([158, 152]);
    expect(buildRidgeContacts(skyline, null)).toEqual([]);
  });
});

describe('Milestone C accessibility: read-out strip', () => {
  const renderReadout = (interval = grazingInterval) => {
    const solar = buildSolarReadout(interval);
    const earth = buildEarthReadout(interval);
    return renderToStaticMarkup(
      <SkyAnalyticalReadout
        solar={solar}
        earth={earth}
        rates={buildRateReadouts([interval], 0)}
        cursor={null}
        missionEvent={buildMissionEventReadout(interval)}
        disk={resolveSolarDiskModel({
          centreElevationDeg: interval.sun.meanElevationDeg,
          angularRadiusDeg: 0.26,
        })}
        solarCriterionLabel="upper-limb"
        earthCriterionLabel="centre"
        windowLabel="2026-11-01 00:00Z → 2026-11-01 02:00Z"
      />,
    );
  };

  it('shows every decision value with glyph and text badges', () => {
    const html = renderReadout();
    // The strip is grouped by kind of claim; each group carries one badge and its own figures.
    expect(html).toContain('data-testid="readout-group-solar"');
    expect(html).toContain('data-testid="readout-group-earth"');
    expect(html).toContain('data-testid="readout-group-event"');
    expect(html).toContain('-0.08°');
    expect(html).toContain('PARTIAL LIMB');
    expect(html).toContain('43.5%');
    expect(html).toContain('TERRAIN BLOCKED');
    expect(html).toContain('dAz/dt');
    expect(html).toContain('dEl/dt');
    expect(html).toContain('Geometric measurement');
    expect(html).toContain('Engineering interpretation · not power');
    expect(html).toContain('Geometric line-of-sight · not an RF link closure');
    expect(html).toContain('Not generated electrical power');
  });

  it('marks occlusion with a glyph and text badge, not colour alone', () => {
    // Colour is never the sole carrier of state: the solar glyph and the bracketed badge text
    // both encode it, so a monochrome or non-visual reading is still correct.
    const occluded = renderReadout();
    expect(occluded).toContain('◐');
    expect(occluded).toContain('PARTIAL LIMB');
    expect(occluded).toContain('TERRAIN BLOCKED');

    const clear = renderReadout(makeInterval());
    expect(clear).toContain('◉');
    expect(clear).toContain('FULL DISK');
  });

  it('announces the read-out through a polite live region', () => {
    const html = renderReadout();
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Solar PARTIAL LIMB');
  });
});

describe('Milestone C accessibility: keyboard + decorative canvas contract', () => {
  it('keeps both canvases decorative and both widgets keyboard reachable', () => {
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <SkyRibbonDeck intervals={[makeInterval()]} horizonProfile={[{ azimuthDeg: 154.5, thetaNomDeg: 0.25 }]} />
      </GlobalScenarioProvider>,
    );
    expect(html.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html.match(/role="application"/g)?.length).toBe(2);
    expect(html.match(/tabindex="0"/gi)?.length).toBe(2);
    expect(html).toContain('focus-visible:outline');
    expect(html).toContain('aria-describedby');
    expect(html).toContain('Arrow keys move the azimuth and elevation cursor');
  });
});

describe('Milestone C accessibility: prefers-reduced-motion', () => {
  const projection = createCorridorProjection(1080);
  const body = { kind: 'sun', label: 'SUN', azimuthDeg: 154.5, elevationDeg: 1.2 } as const;

  it('drops the decorative corona gradient under reduced motion', () => {
    const standard = createRecordingContext();
    drawCelestialBody(standard.ctx, projection, body, { reducedMotion: false });
    expect(standard.countOf('createRadialGradient')).toBe(1);

    const reduced = createRecordingContext();
    drawCelestialBody(reduced.ctx, projection, body, { reducedMotion: true });
    expect(reduced.countOf('createRadialGradient')).toBe(0);
  });

  it('keeps the drawn geometry identical so the reading does not change', () => {
    const standard = createRecordingContext();
    drawCelestialBody(standard.ctx, projection, body, { reducedMotion: false });
    const reduced = createRecordingContext();
    drawCelestialBody(reduced.ctx, projection, body, { reducedMotion: true });

    const geometry = (calls: { method: string; args: readonly number[] }[]) =>
      calls
        .filter((call) => ['moveTo', 'lineTo', 'arc'].includes(call.method))
        .map((call) => `${call.method}:${call.args.map((value) => value.toFixed(6)).join(',')}`);

    // Every structural call survives; only decorative calls are dropped.
    const structural = geometry(standard.calls);
    const withoutDecoration = geometry(reduced.calls);
    for (const call of withoutDecoration) expect(structural).toContain(call);
    expect(withoutDecoration.length).toBeLessThan(structural.length);
    // Labels (the actual numeric reading) are identical.
    expect(reduced.texts).toEqual(standard.texts);
  });
});

describe('Milestone C: AGENTS.md § 5.1 file-size caps', () => {
  const components = [
    'SkyRibbonDeck.tsx',
    'SkyContextPanorama.tsx',
    'GrazingCorridorCanvas.tsx',
    'SkyAnalyticalReadout.tsx',
    'SkyRibbonA11yTable.tsx',
    'SkyDeckStatePanel.tsx',
    'SkyDeckHeader.tsx',
    'CorridorFocusControl.tsx',
    'CorridorHeader.tsx',
  ];
  const hooks = ['useSkyCanvasSurface.ts', 'useSkyDeckModel.ts'];

  const lineCount = (file: string) =>
    readFileSync(resolve(FEATURE_DIR, file), 'utf-8').split('\n').length;

  it('keeps every React presentation component at or under 200 lines', () => {
    for (const file of components) {
      expect({ file, lines: lineCount(file) }).toMatchObject({ file });
      expect(lineCount(file)).toBeLessThanOrEqual(200);
    }
  });

  it('keeps every frontend hook at or under 140 lines', () => {
    for (const file of hooks) {
      expect(lineCount(file)).toBeLessThanOrEqual(140);
    }
  });
});
