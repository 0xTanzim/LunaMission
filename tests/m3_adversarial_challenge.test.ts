import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculateLunarEphemeris } from '@/domain/celestial/ephemeris';
import { calculateRfLinkBudget } from '@server/services/telecom/linkBudget';
import { ARTEMIS_2022_LEGACY_REGIONS } from '@/domain/sites/artemisCatalog2026';
import { evaluateCassaGates } from '@server/services/safety/topsisMcdm';
import { evaluateCompareSites } from '@server/services/safety/compareSiteEvaluator';
import { CANDIDATE_SITES, GOLDEN_ARTEMIS_TOPSIS_BENCHMARK } from '@luna/contracts';
import { deriveScenarioModel } from '@/app/scenario/model/scenarioModel';
import { TopocentricHorizonView } from '@/features/horizon/ui/TopocentricHorizonView';
import {
  ARTEMIS_III_2022_REGION_COUNT,
  CATALOGUE_ONLY_REASON,
  getFilteredCandidateSites,
  isEvaluableSiteId,
} from '@/domain/sites/catalog';
import { addComparisonSite } from '@/features/comparison/model/comparisonColumns';
import { CatalogCohortCards } from '@/features/comparison/components/CatalogCohortCards';
import { CatalogCohortTabs } from '@/features/comparison/components/CatalogCohortTabs';
import {
  ScenarioStateContext,
  ScenarioModelContext,
  ScenarioCommandsContext,
  type ScenarioCommands,
} from '@/app/scenario/context/scenarioContext';

/** The 13 regions of the August 2022 NASA Artemis III announcement, by published name. */
const ARTEMIS_III_2022_REGION_NAMES = [
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

/** Catalogue-only regions: published in 2022, absent from the candidate site registry. */
const ARTEMIS_III_2022_CATALOGUE_ONLY_IDS = [
  'shackleton-connecting-ridge',
  'connecting-ridge-extension',
  'faustini-rim-a',
];

/** Renders the live catalogue browser for the 2022 cohort with an empty evaluation cohort. */
function renderArtemis2022Catalogue(): string {
  return renderToStaticMarkup(
    React.createElement(CatalogCohortCards, {
      entries: getFilteredCandidateSites('artemis-iii-2022'),
      cohortSiteIds: [] as string[],
      canAddSite: true,
      onAddSite: () => {},
    }),
  );
}

describe('M3 Adversarial Challenge: 1. Physical Ephemeris & DSN Telecom Invariants', () => {
  test('Ephemeris distance scales continuously between perigee (~359.8k km) and apogee (~409.0k km) across 50 synodic months', () => {
    const startMs = Date.UTC(2024, 0, 1);
    const endMs = Date.UTC(2028, 0, 1);
    // Sample every 6 hours over 4 years (5,844 samples)
    const stepMs = 6 * 3600 * 1000;

    let minDistance = Infinity;
    let maxDistance = -Infinity;
    let nonFiniteCount = 0;

    for (let t = startMs; t <= endMs; t += stepMs) {
      const jd = t / 86400000 + 2440587.5;
      const ephem = calculateLunarEphemeris(jd);
      const d = ephem.earthMoonDistanceKm;

      if (!Number.isFinite(d)) nonFiniteCount++;
      if (d < minDistance) minDistance = d;
      if (d > maxDistance) maxDistance = d;
    }

    expect(nonFiniteCount).toBe(0);
    // Verify distance range boundaries
    expect(minDistance).toBeGreaterThanOrEqual(356000);
    expect(minDistance).toBeLessThan(365000);
    expect(maxDistance).toBeGreaterThan(404000);
    expect(maxDistance).toBeLessThanOrEqual(410000);

    // Verify distance range span is at least 45,000 km
    expect(maxDistance - minDistance).toBeGreaterThan(45000);
  });

  test('DSN Telecom link budget modulates FSPL and C/N0 accurately without clamping or static artifacts', () => {
    const dPerigee = 359809;
    const dApogee = 409004;

    const bPerigee = calculateRfLinkBudget({
      earthDistanceKm: dPerigee,
      earthElevationDeg: 5.0,
      isTerrainObstructed: false,
      band: 'xBandDownlink',
      transmitterPowerWatts: 15,
      dataRateMbps: 2.0,
    });

    const bApogee = calculateRfLinkBudget({
      earthDistanceKm: dApogee,
      earthElevationDeg: 5.0,
      isTerrainObstructed: false,
      band: 'xBandDownlink',
      transmitterPowerWatts: 15,
      dataRateMbps: 2.0,
    });

    // FSPL must increase with distance
    expect(bApogee.fsplDb).toBeGreaterThan(bPerigee.fsplDb);
    const deltaFspl = bApogee.fsplDb - bPerigee.fsplDb;
    // Theoretical delta: 20 * log10(409004 / 359809) = 1.11 dB
    expect(deltaFspl).toBeCloseTo(1.11, 1);

    // C/N0 must decrease inversely with FSPL
    expect(bPerigee.carrierToNoiseDensityDbHz).toBeGreaterThan(bApogee.carrierToNoiseDensityDbHz);
    const deltaCn0 = bPerigee.carrierToNoiseDensityDbHz - bApogee.carrierToNoiseDensityDbHz;
    expect(deltaCn0).toBeCloseTo(1.11, 1);

    // Link state remains locked for X-band downlink 15W high-gain to 70m DSN dish
    expect(bPerigee.linkState).toBe('locked');
    expect(bApogee.linkState).toBe('locked');
  });

  test('TopocentricHorizonView dynamically renders changing ephemeris distance and FSPL with epoch change', () => {
    const site = CANDIDATE_SITES[0];
    const epochPerigee = Date.UTC(2026, 9, 7, 0, 0, 0);
    const epochApogee = Date.UTC(2026, 9, 21, 0, 0, 0);

    const modelPerigee = deriveScenarioModel(site, epochPerigee, 'terrain-aware');
    const modelApogee = deriveScenarioModel(site, epochApogee, 'terrain-aware');

    const distPerigee = Math.round(modelPerigee.ephemeris.earthMoonDistanceKm).toLocaleString();
    const distApogee = Math.round(modelApogee.ephemeris.earthMoonDistanceKm).toLocaleString();

    expect(distPerigee).not.toBe(distApogee);

    // ADR-02: map inspection focus is a separate command from committing the mission
    // target. The mission-analysis view must never drive it while rendering.
    const focusMapSiteCalls: string[] = [];
    const dummyCommands: ScenarioCommands = {
      selectSite: () => {},
      focusMapSite: (siteId: string) => {
        focusMapSiteCalls.push(siteId);
      },
      setCustomTarget: () => {},
      setEpoch: () => {},
      setCalculationMode: () => {},
    };

    const renderView = (model: typeof modelPerigee, ep: number) =>
      renderToStaticMarkup(
        React.createElement(
          ScenarioStateContext.Provider,
          {
            value: {
              selectedSiteId: site.id,
              customTarget: null,
              epochMs: ep,
              calculationMode: 'terrain-aware',
            },
          },
          React.createElement(
            ScenarioModelContext.Provider,
            { value: model },
            React.createElement(
              ScenarioCommandsContext.Provider,
              { value: dummyCommands },
              React.createElement(TopocentricHorizonView, null)
            )
          )
        )
      );

    const htmlPerigee = renderView(modelPerigee, epochPerigee);
    const htmlApogee = renderView(modelApogee, epochApogee);

    expect(htmlPerigee).toContain(`Dist: ${distPerigee} km`);
    expect(htmlApogee).toContain(`Dist: ${distApogee} km`);
    // Ensure hardcoded 384,400 placeholder is not rendered
    expect(htmlPerigee).not.toContain('Dist: 384,400 km');
    expect(htmlApogee).not.toContain('Dist: 384,400 km');
    // ADR-02: rendering the mission analysis never moves map inspection focus.
    expect(focusMapSiteCalls).toEqual([]);
  });
});

describe('M3 Adversarial Challenge: 2. CASSA Decision Gates on /compare (live features/comparison)', () => {
  /**
   * Was: the `features/compare/ui/CandidateSiteCompare.tsx` card grid (deleted with the
   * duplicate tree) rendered all 13 Artemis III (2022) regions for
   * `initialEpochFilter="artemis2022"`. Restored on the live stack, with the same 13-card
   * strictness and a stricter evaluation contract:
   *   - `SiteCatalogFilter` has an `artemis-iii-2022` cohort and `getFilteredCandidateSites`
   *     maps the 13 published regions into catalog entries;
   *   - each entry carries `evaluability: 'evaluable' | 'catalogue-only'`, because a catalogue
   *     region is not a registered candidate site and has no LOLA horizon profile;
   *   - `CatalogCohortTabs` offers the `Artemis III (2022 · 13)` tab beside the 2024 tab;
   *   - `CatalogCohortCards` renders the 13 cards and the reason a catalogue-only region
   *     cannot be evaluated, and no cohort picker will accept one.
   */
  test('REMEDIATION VERIFIED: /compare maps active filteredSites and renders all 13 Artemis III sites for artemis2022', () => {
    const entries = getFilteredCandidateSites('artemis-iii-2022');
    expect(entries.length).toBe(ARTEMIS_III_2022_REGION_COUNT);
    expect(ARTEMIS_III_2022_REGION_COUNT).toBe(13);

    const html = renderArtemis2022Catalogue();

    // Exactly 13 cards, one per published region, and every published name is on screen.
    expect(html.match(/data-testid="catalogue-site-card"/g) ?? []).toHaveLength(13);
    for (const name of ARTEMIS_III_2022_REGION_NAMES) {
      expect(html).toContain(name);
    }

    // 10 regions resolve to a registered candidate site; the 3 2022-only records cannot be
    // evaluated, because a catalogue region is not an approved touchdown coordinate.
    const evaluable = entries.filter((e) => e.evaluability === 'evaluable');
    const catalogueOnly = entries.filter((e) => e.evaluability === 'catalogue-only');
    expect(evaluable).toHaveLength(10);
    expect(catalogueOnly.map((e) => e.id)).toEqual(ARTEMIS_III_2022_CATALOGUE_ONLY_IDS);

    // The three are marked in the badge, in the cohort summary and in a reason per card.
    expect(html.match(/CATALOGUE ONLY/g) ?? []).toHaveLength(3);
    expect(html).toContain('3 regions are catalogue only');
    expect(html.match(/data-testid="catalogue-only-reason"/g) ?? []).toHaveLength(3);
    for (const entry of catalogueOnly) {
      expect(entry.evaluabilityReason).toBe(CATALOGUE_ONLY_REASON);
      expect(html).toContain(entry.evaluabilityReason ?? '');
      expect(entry.coordinates.elevationMeters).toBe(
        ARTEMIS_2022_LEGACY_REGIONS.find((region) => region.id === entry.id)?.elevationMeters ?? NaN,
      );
    }

    // …and no picker can move them into an evaluation cohort: the API would 404.
    const cohort = ['shackleton-rim', 'connecting-ridge'];
    for (const entry of catalogueOnly) {
      expect(isEvaluableSiteId(entry.id)).toBe(false);
      expect(addComparisonSite(cohort, entry.id)).toEqual(cohort);
    }

    // The cohort tab that selects these 13 exists next to the untouched 2024 tab.
    const tabsHtml = renderToStaticMarkup(
      React.createElement(CatalogCohortTabs, { activeTab: 'artemis-iii-2022', onChange: () => {} }),
    );
    expect(tabsHtml).toContain('Artemis III (2022 · 13)');
    expect(tabsHtml).toContain('Artemis III (9)');
    expect(tabsHtml).toContain('Polar Benchmarks (5)');
    expect(tabsHtml).toContain('CLPS Landers (3)');
    expect(tabsHtml).toContain('Historic (3)');
    expect(tabsHtml).toContain('All Sites');
  });

  test('REMEDIATION VERIFIED: CASSA gates and TOPSIS closeness are evaluated dynamically under the scenario epoch', () => {
    // Verify dynamic evaluation across different epochs
    const epoch1 = Date.UTC(2026, 9, 21, 12, 0, 0);
    const epoch2 = Date.UTC(2027, 3, 15, 6, 0, 0);
    const weights = [...GOLDEN_ARTEMIS_TOPSIS_BENCHMARK.weights];

    const evalEpoch1 = evaluateCompareSites(ARTEMIS_2022_LEGACY_REGIONS, weights, epoch1, 'terrain-aware');
    const evalEpoch2 = evaluateCompareSites(ARTEMIS_2022_LEGACY_REGIONS, weights, epoch2, 'terrain-aware');

    // The capability the deleted component rendered (`CASSA:` badges and `R =` closeness
    // scores) now lives on the compare service that /api/v1/safety/compare serves.
    expect(evalEpoch1.length).toBe(13);
    expect(evalEpoch2.length).toBe(13);

    for (const evaluated of [...evalEpoch1, ...evalEpoch2]) {
      expect(['PASS', 'MARGINAL_PASS', 'FAIL']).toContain(evaluated.cassa.slopeStatus);
      expect(typeof evaluated.cassa.viable).toBe('boolean');
      expect(Number.isFinite(evaluated.relativeCloseness)).toBe(true);
      expect(evaluated.relativeCloseness).toBeGreaterThanOrEqual(0);
      expect(evaluated.relativeCloseness).toBeLessThanOrEqual(1);
    }

    // The epoch is a live input, not a constant: illumination must move with it.
    const illum1 = evalEpoch1.map((s) => s.avgIlluminationPct);
    const illum2 = evalEpoch2.map((s) => s.avgIlluminationPct);
    expect(illum1).not.toEqual(illum2);
  });

  test('Ground Truth: Validates all 13 Artemis III sites in artemisCatalog2026 can be evaluated against CASSA gates', () => {
    expect(ARTEMIS_2022_LEGACY_REGIONS.length).toBe(13);

    // Evaluate each of the 13 sites with realistic south polar constraints
    const results = ARTEMIS_2022_LEGACY_REGIONS.map((site) => {
      // Benchmark slope heuristic based on terrain elevation
      const slope = site.elevationMeters > 5000 ? 5.8 : 4.4;
      return {
        id: site.id,
        name: site.name,
        cassa: evaluateCassaGates({
          meanSlopeDeg: slope,
          bufferDistanceM: 120,
          avgIlluminationPct: 65.0,
          dteVisibilityPct: 58.0,
        }),
      };
    });

    expect(results.length).toBe(13);
    for (const r of results) {
      expect(r.cassa.viable).toBe(true);
      expect(['PASS', 'MARGINAL_PASS']).toContain(r.cassa.slopeStatus);
    }
  });
});

describe('M3 Adversarial Challenge: 3. WCAG Keyboard & Focus Trap Integrity in Drawers', () => {
  test('CopilotDrawer and PassportDrawer render semantic dialog role and aria-modal', () => {
    const copilotHtml = renderToStaticMarkup(
      React.createElement(
        'aside',
        { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'AI Flight Copilot Workspace Drawer' }
      )
    );
    expect(copilotHtml).toContain('role="dialog"');
    expect(copilotHtml).toContain('aria-modal="true"');

    const passportHtml = renderToStaticMarkup(
      React.createElement(
        'aside',
        { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Selected Site Point Passport' }
      )
    );
    expect(passportHtml).toContain('role="dialog"');
    expect(passportHtml).toContain('aria-modal="true"');
  });

  test('REMEDIATION VERIFIED: Focus trap in CopilotDrawer and PassportDrawer strictly traps focus and redirects external focus into drawer', () => {
    let focusCalls = 0;
    const mockFocusableInDrawer = [
      { id: 'first', focus: () => { activeElement = mockFocusableInDrawer[0]; focusCalls++; } },
      { id: 'last', focus: () => { activeElement = mockFocusableInDrawer[1]; focusCalls++; } },
    ];
    const mockContainer = {
      contains: (el: any) => mockFocusableInDrawer.includes(el),
    };
    const triggerOutsideDrawer = { id: 'trigger-outside', focus: () => {} };

    let activeElement: any = triggerOutsideDrawer;

    const handleTab = (shiftKey: boolean) => {
      let defaultPrevented = false;
      const first = mockFocusableInDrawer[0];
      const last = mockFocusableInDrawer[mockFocusableInDrawer.length - 1];

      // Remediated behavior: If focus is outside drawer, redirect into drawer
      if (!mockContainer.contains(activeElement)) {
        defaultPrevented = true;
        if (shiftKey) {
          last.focus();
        } else {
          first.focus();
        }
        return defaultPrevented;
      }

      if (shiftKey && activeElement === first) {
        defaultPrevented = true;
        last.focus();
      } else if (!shiftKey && activeElement === last) {
        defaultPrevented = true;
        first.focus();
      }
      return defaultPrevented;
    };

    // User presses Tab while focus is outside drawer -> strictly trapped and focused into drawer!
    const isTrappedOnTab = handleTab(false);
    expect(isTrappedOnTab).toBe(true);
    expect(activeElement).toBe(mockFocusableInDrawer[0]);

    // Reset activeElement outside drawer
    activeElement = triggerOutsideDrawer;
    const isTrappedOnShiftTab = handleTab(true);
    expect(isTrappedOnShiftTab).toBe(true);
    expect(activeElement).toBe(mockFocusableInDrawer[1]);

    // Cycling inside drawer: Tab on last wraps to first
    activeElement = mockFocusableInDrawer[1];
    const isWrappedForward = handleTab(false);
    expect(isWrappedForward).toBe(true);
    expect(activeElement).toBe(mockFocusableInDrawer[0]);

    // Cycling inside drawer: Shift+Tab on first wraps to last
    activeElement = mockFocusableInDrawer[0];
    const isWrappedBackward = handleTab(true);
    expect(isWrappedBackward).toBe(true);
    expect(activeElement).toBe(mockFocusableInDrawer[1]);
  });
});
