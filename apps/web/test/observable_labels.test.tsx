import { describe, expect, it } from 'bun:test';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { SummaryMetrics } from '@luna/contracts';
import { ExecutiveKpiStrip } from '../src/features/analyze/ExecutiveKpiStrip';
import { GanttTimelineCanvas } from '../src/features/timeline/GanttTimelineCanvas';
import { GanttEventSequenceTable } from '../src/features/accessibility/GanttEventSequenceTable';
import { Tier2TableHeader } from '../src/features/comparison/components/Tier2TableHeader';
import { VEHICLE_CONSTRAINT_CONFIGS } from '../src/features/comparison/components/vehicleConstraintConfigs';
import { RADAR_AXES } from '../src/features/comparison/model/radarChartMath';

/**
 * Observable-separation guards for C1/C2.
 *
 * Five quantities must never be conflated in user-facing text:
 *   1. any-disk visibility      (some limb visible)
 *   2. full-disk visibility     (entire disk unobstructed)
 *   3. geometric visible solid-angle fraction
 *   4. irradiance-weighted visible fraction (limb-darkened)
 *   5. usable electrical power (engineering estimate)
 *
 * …and three further separations: geometric Earth line-of-sight is not RF link
 * closure, a deterministic terrain sensitivity envelope is not a confidence
 * interval, and nothing about power or comms is "guaranteed".
 */

const SRC_ROOT = path.resolve(import.meta.dir, '..', 'src');

/** Displayed phrases that conflated two observables and must never come back. */
const FORBIDDEN_DISPLAY_PHRASES = [
  // geometric Earth LoS presented as communications
  'Direct Earth Comms',
  'COMMS CHAMPION',
  'Direct-To-Earth (DTE) Link',
  'DTE Comm',
  'DTE Access',
  'DTE Visibility Window',
  'Earth DTE',
  'Periodic Relay',
  'Occulted / Relay Req.',
  // sunlight presented as energy or power
  'Max continuous power',
  'Battery drain span',
  'Solar Power',
  // deterministic envelope presented as a statistical interval
  '±1σ',
  'Terrain Uncertainty Whiskers',
  // geometric conditions presented as operational feasibility windows
  'PRIME OVERLAP',
];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '__tests__' ? [] : walk(full);
    }
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (/\.test\.(ts|tsx)$/.test(entry.name)) return [];
    return [full];
  });
}

/** Comments are not user-facing, so only their removal makes the scan honest. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const SOURCES = walk(SRC_ROOT).map((file) => ({
  relative: path.relative(SRC_ROOT, file).split(path.sep).join('/'),
  text: stripComments(readFileSync(file, 'utf8')),
}));

describe('Observable labelling: geometric Earth line-of-sight is not RF link closure', () => {
  it('no source file displays an Earth-visibility figure as DTE comms', () => {
    const offenders = SOURCES.flatMap(({ relative, text }) =>
      FORBIDDEN_DISPLAY_PHRASES.filter((phrase) => text.includes(phrase)).map(
        (phrase) => `${relative}: "${phrase}"`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('the live KPI strip names Earth LoS and denies both energy and link-closure', () => {
    const metrics: SummaryMetrics = {
      cumulativeSunlitHours: 300,
      solarAccessPercentage: 89.3,
      longestContinuousSunlitWindowHours: 280,
      longestContinuousDarkWindowHours: 14,
      cumulativeDteHours: 210,
      dteAccessPercentage: 62.5,
      cumulativeOverlapHours: 190,
      overlapPercentage: 56.5,
      topographicShadowPenaltyHours: 36,
    } as SummaryMetrics;

    const html = renderToStaticMarkup(<ExecutiveKpiStrip metrics={metrics} />);
    const lower = html.toLowerCase();

    expect(html).toContain('Earth LoS Access (geom.)');
    expect(html).toContain('Sun∩Earth LoS Overlap');
    expect(lower).toContain('not generated electrical energy');
    expect(lower).toContain('not rf link closure');
    expect(lower).not.toContain('comms');
    expect(lower).not.toContain('power</');
    expect(lower).not.toContain('guaranteed');
  });

  it('the Gantt timeline labels sensitivity whiskers and never claims DTE', () => {
    const html = renderToStaticMarkup(
      <GanttTimelineCanvas
        intervals={[]}
        eventWhiskers={[]}
        startUtc="2026-11-01T00:00:00.000Z"
        stopUtc="2026-11-15T00:00:00.000Z"
      />,
    );

    expect(html).toContain('TERRAIN SENSITIVITY WHISKERS');
    expect(html).toContain('Earth Geometric LoS');
    expect(html).not.toContain('UNCERTAINTY WHISKERS');
    expect(html).not.toContain('Earth DTE');
  });

  it('the accessible Gantt mirror separates disk fraction, Earth LoS and overlap', () => {
    const html = renderToStaticMarkup(
      <GanttEventSequenceTable siteName="Connecting Ridge CR01" intervals={[]} />,
    );

    expect(html).toContain('Visible Solar Disk (geom.)');
    expect(html).toContain('Earth Geometric LoS');
    expect(html).toContain('Concurrent Geom. Overlap');
    expect(html).toContain('not generated electrical power');
    expect(html).toContain('not an RF link closure');
    expect(html).toContain('not by itself a mission feasibility window');
  });

  it('the Tier 2 funnel header names the geometric observable', () => {
    const html = renderToStaticMarkup(<Tier2TableHeader />);
    expect(html).toContain('Earth LoS (geom.)');
  });
});

describe('Observable labelling: geometry is not power, and vehicle limits are inputs', () => {
  it('no vehicle constraint pairs a sunlight duration with a power claim', () => {
    const phrases = VEHICLE_CONSTRAINT_CONFIGS.flatMap((config) => [
      config.purpose,
      config.tooltip,
      config.title,
    ]);
    const joined = phrases.join(' | ');

    expect(joined).not.toContain('Radio Comms');
    expect(joined).not.toContain('Solar Power');
    expect(joined).toContain('not an electrical energy or power estimate');
    expect(joined).toContain('not an RF link-closure');
  });

  it('the trade-study radar axis names Earth line-of-sight geometry', () => {
    const earthAxis = RADAR_AXES.find((axis) => axis.key === 'dte');
    expect(earthAxis?.label).toBe('Earth LoS');
    expect(earthAxis?.description).toContain('not an RF link budget');
  });
});

describe('Observable labelling: full-disk clearance is a bound, not exact geometry', () => {
  it('both sky-ribbon criterion vocabularies mark full-disk as a bound', () => {
    // The vocabulary moved out of the hook into the deck model when the model was extracted, so
    // the assertion follows the data rather than the filename.
    const deckModel = SOURCES.find((s) => s.relative === 'features/sky-ribbon/skyRibbonDeckModel.ts');
    const deck = SOURCES.find((s) => s.relative === 'features/sky-ribbon/SkyRibbonDeck.tsx');
    const table = SOURCES.find((s) => s.relative === 'features/sky-ribbon/SkyRibbonA11yTable.tsx');

    expect(deckModel?.text).toContain("fullDisk: 'full-disk bound'");
    expect(deck?.text).toContain("fullDisk: 'full-disk bound'");
    expect(table?.text).toContain('conservative upper bound on occlusion');
  });
});

describe('Observable labelling: sensitivity envelope is not a confidence interval', () => {
  it('the comparison export states the envelope is deterministic, not statistical', () => {
    const markdown = SOURCES.find((s) => s.relative === 'features/comparison/model/exportComparisonMarkdown.ts');
    const csv = SOURCES.find((s) => s.relative === 'features/comparison/model/exportComparisonCsv.ts');

    expect(markdown?.text).toContain('not a statistical confidence interval');
    expect(markdown?.text).toContain('Terrain Sensitivity Whiskers');
    expect(csv?.text).toContain('not a confidence interval');
    expect(csv?.text).toContain('Terrain_Sensitivity_Span_h');
  });

  it('the Tier 2 row abbreviates the terrain span as a sensitivity, not "unc"', () => {
    const row = SOURCES.find((s) => s.relative === 'features/comparison/components/Tier2CandidateRow.tsx');
    expect(row?.text).toContain('h sens.');
    expect(row?.text).not.toContain('h unc');
  });
});

describe('Observable labelling: nothing is "guaranteed"', () => {
  it('every mention of a guarantee in shipped source is a negation', () => {
    const offenders = SOURCES.filter(({ text }) =>
      /guarantee/i.test(text) && !/not guarantee|guarantees? no|never guarantee/i.test(text),
    ).map(({ relative }) => relative);

    expect(offenders).toEqual([]);
  });
});
