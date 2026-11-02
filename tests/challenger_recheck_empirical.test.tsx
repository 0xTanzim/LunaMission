import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToString } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import {
  ARTEMIS_2022_LEGACY_REGIONS,
  ARTEMIS_2024_CONFIRMED_REGIONS,
} from '@/domain/sites/artemisCatalog2026';
import { evaluateCompareSites } from '@server/services/safety/compareSiteEvaluator';
import { CANDIDATE_SITES, GOLDEN_ARTEMIS_TOPSIS_BENCHMARK } from '@luna/contracts';
import {
  ARTEMIS_III_2022_REGION_COUNT,
  CATALOGUE_ONLY_REASON,
  getCatalogueOnlyEntries,
  getFilteredCandidateSites,
  isEvaluableSiteId,
  type SiteCatalogFilter,
} from '@/domain/sites/catalog';
import { CatalogCohortTabs } from '@/features/comparison/components/CatalogCohortTabs';
import { CatalogCohortCards } from '@/features/comparison/components/CatalogCohortCards';
import { ComparisonCohortBar } from '@/features/comparison/ComparisonCohortBar';
import { addComparisonSite } from '@/features/comparison/model/comparisonColumns';

/**
 * The deleted `features/compare/**` tree was replaced by `features/comparison/**`.
 * These two files (`challenger_recheck_empirical`,
 * `regression/iteration4_remediation`) used to import the removed
 * `CandidateSiteCompare` card grid and `CompareWeightControls.WEIGHT_PRESETS`.
 *
 * - `WEIGHT_PRESETS.balanced.weights` survived the move: the identical six-criterion
 *   vector is the frozen `GOLDEN_ARTEMIS_TOPSIS_BENCHMARK.weights` in
 *   `@luna/contracts`, so the evaluator tests keep their exact expectations.
 * - The 13-card `artemis2022` grid was restored as the `artemis-iii-2022` catalog cohort
 *   plus `CatalogCohortCards`, with catalogue-only regions marked non-evaluable.
 */
const BALANCED_WEIGHTS = [...GOLDEN_ARTEMIS_TOPSIS_BENCHMARK.weights];

/** Cohort tabs rendered by the live `/compare` matrix, and the catalog filter each one means. */
const RENDERED_COHORT_LABELS: { label: string; filter: SiteCatalogFilter; count: number }[] = [
  { label: 'Artemis III', filter: 'artemis-iii-2024', count: 9 },
  { label: 'Polar Benchmarks', filter: 'polar-benchmark', count: 5 },
  { label: 'CLPS Landers', filter: 'clps', count: 3 },
  { label: 'Historic', filter: 'historic', count: 3 },
];

describe('Empirical Challenger: comparison cohort & compareSiteEvaluator invariants', () => {
  const all13ExpectedSites = [
    'Peak near Cabeus B',
    'Haworth',
    'Malapert Massif',
    'Mons Mouton Plateau',
    'Mons Mouton',
    'Nobile Rim 1',
    'Nobile Rim 2',
    'de Gerlache Rim 2',
    'Slater Plain',
    'Connecting Ridge',
    'Connecting Ridge Extension',
    'de Gerlache Rim 1',
    'Faustini Rim A',
  ];

  test('Verify all 13 Artemis III legacy sites are present in catalog', () => {
    expect(ARTEMIS_2022_LEGACY_REGIONS.length).toBe(13);
    const catalogNames = ARTEMIS_2022_LEGACY_REGIONS.map((s) => s.name);
    for (const expected of all13ExpectedSites) {
      expect(catalogNames).toContain(expected);
    }
  });

  /**
   * Restored capability: the 13-region Artemis III (2022) cohort, browseable on `/compare`
   * and split by evaluability.
   *
   * A candidate region is not an approved touchdown coordinate and catalogue membership is
   * not evaluability: 10 of the 13 regions resolve to a registered candidate site (and so to
   * a LOLA horizon profile), while the 3 2022-only records are catalogue-only and cannot
   * join an evaluation cohort because the API would 404 for them.
   */
  test('CandidateSiteCompare renders all 13 candidate site cards when epochFilter="artemis2022"', () => {
    expect(ARTEMIS_2022_LEGACY_REGIONS.length).toBe(13);
    expect(ARTEMIS_III_2022_REGION_COUNT).toBe(13);

    const entries = getFilteredCandidateSites('artemis-iii-2022');
    const html = renderToString(
      React.createElement(CatalogCohortCards, {
        entries,
        cohortSiteIds: [] as string[],
        canAddSite: true,
        onAddSite: () => {},
      }),
    );

    // All 13 published regions render as cards — the strict count the deleted grid had.
    expect(entries).toHaveLength(13);
    expect(html.match(/data-testid="catalogue-site-card"/g) ?? []).toHaveLength(13);
    for (const expected of all13ExpectedSites) {
      expect(html).toContain(expected);
    }

    // The 3 legacy-only records are visibly marked, with the reason spelled out per card.
    const catalogueOnly = entries.filter((e) => e.evaluability === 'catalogue-only');
    expect(catalogueOnly.map((e) => e.name)).toEqual([
      'Connecting Ridge',
      'Connecting Ridge Extension',
      'Faustini Rim A',
    ]);
    expect(html.match(/CATALOGUE ONLY/g) ?? []).toHaveLength(3);
    expect(html.match(/data-testid="catalogue-only-reason"/g) ?? []).toHaveLength(3);
    for (const entry of catalogueOnly) {
      expect(entry.evaluabilityReason).toBe(CATALOGUE_ONLY_REASON);
      expect(isEvaluableSiteId(entry.id)).toBe(false);
    }

    // The 10 evaluable cards offer the cohort action; the cohort picker refuses the rest.
    expect(html.match(/Add to cohort/g) ?? []).toHaveLength(10);
    for (const entry of catalogueOnly) {
      expect(addComparisonSite(['shackleton-rim'], entry.id)).toEqual(['shackleton-rim']);
    }

    // The live cohort bar states why the withheld regions are withheld.
    const barHtml = renderToString(
      React.createElement(ComparisonCohortBar, {
        cohortSiteIds: ['shackleton-rim', 'connecting-ridge'],
        activeSiteId: 'shackleton-rim',
        onAddSite: () => {},
        onRemoveSite: () => {},
      }),
    );
    expect(barHtml).toContain('Evaluation cohorts need a horizon profile');
    for (const entry of getCatalogueOnlyEntries()) {
      expect(barHtml).toContain(`${entry.name} (${entry.code})`);
    }
  });

  test('the live /compare cohort tabs advertise exactly the candidate counts the catalog registry returns', () => {
    const html = renderToString(React.createElement(CatalogCohortTabs, { activeTab: 'all', onChange: () => {} }));

    for (const { label, filter, count } of RENDERED_COHORT_LABELS) {
      const catalogCount = getFilteredCandidateSites(filter).length;
      expect(catalogCount).toBe(count);
      // The rendered tab must not advertise a count the matrix cannot show.
      expect(html).toContain(`${label} (${catalogCount})`);
    }

    // Artemis III cohort is exactly the 9 down-selected regions of the dual-epoch catalog.
    expect(getFilteredCandidateSites('artemis-iii-2024').length).toBe(ARTEMIS_2024_CONFIRMED_REGIONS.length);

    // "All Sites" covers the whole registered catalog (20 sites as of this revision).
    expect(getFilteredCandidateSites('all').length).toBe(CANDIDATE_SITES.length);
    expect(html).toContain('All Sites');
  });

  test('Dynamic CASSA evaluation shifts across distinct epoch dates (seasonal solar elevation changes)', () => {
    const weights = [...BALANCED_WEIGHTS];
    // Mid-winter vs mid-summer sub-solar latitude variations
    const winterEpoch = Date.UTC(2026, 0, 15, 12, 0, 0); // Jan 2026
    const summerEpoch = Date.UTC(2026, 6, 15, 12, 0, 0); // Jul 2026
    const autumnEpoch = Date.UTC(2027, 9, 21, 0, 0, 0);  // Oct 2027

    const evalWinter = evaluateCompareSites(ARTEMIS_2022_LEGACY_REGIONS, weights, winterEpoch, 'terrain-aware');
    const evalSummer = evaluateCompareSites(ARTEMIS_2022_LEGACY_REGIONS, weights, summerEpoch, 'terrain-aware');
    const evalAutumn = evaluateCompareSites(ARTEMIS_2022_LEGACY_REGIONS, weights, autumnEpoch, 'terrain-aware');

    expect(evalWinter.length).toBe(13);
    expect(evalSummer.length).toBe(13);
    expect(evalAutumn.length).toBe(13);

    // Verify non-identical illumination profiles across seasonal epochs
    const winterIllum = evalWinter.map((s) => s.avgIlluminationPct);
    const summerIllum = evalSummer.map((s) => s.avgIlluminationPct);
    const autumnIllum = evalAutumn.map((s) => s.avgIlluminationPct);

    expect(winterIllum).not.toEqual(summerIllum);
    expect(summerIllum).not.toEqual(autumnIllum);

    // Verify ranks are valid permutations from 1 to 13
    const winterRanks = evalWinter.map((s) => s.rank).sort((a, b) => a - b);
    expect(winterRanks).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);

    // Check CASSA gate invariants on all sites
    for (const site of evalWinter) {
      expect(['PASS', 'MARGINAL_PASS', 'FAIL']).toContain(site.cassa.slopeStatus);
      expect(typeof site.cassa.viable).toBe('boolean');
      expect(Array.isArray(site.cassa.violations)).toBe(true);
      expect(Number.isFinite(site.relativeCloseness)).toBe(true);
      expect(site.relativeCloseness).toBeGreaterThanOrEqual(0);
      expect(site.relativeCloseness).toBeLessThanOrEqual(1);
    }
  });

  test('live /compare entry components adhere strictly to the <= 200 line hard cap', () => {
    const liveCompareEntries = [
      'apps/web/src/features/comparison/ThreeTierComparisonView.tsx',
      'apps/web/src/features/comparison/ui/ComparisonMatrix.tsx',
    ];

    for (const relativePath of liveCompareEntries) {
      const text = fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
      const lineCount = text.split('\n').length;
      expect(lineCount).toBeLessThanOrEqual(200);
    }
  });
});
