import { describe, expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopocentricHorizonView } from '@/features/horizon/ui/TopocentricHorizonView';
import {
  ScenarioStateContext,
  ScenarioModelContext,
  ScenarioCommandsContext,
  type ScenarioCommands,
} from '@/app/scenario/context/scenarioContext';
import { deriveScenarioModel } from '@/app/scenario/model/scenarioModel';
import { deriveScenarioState } from '@/app/scenario/state/scenarioState';
import { initialScenarioState, scenarioReducer } from '@/app/state/scenarioReducer';
import { getSiteById } from '@/domain/sites/catalog';
import { CANDIDATE_SITES } from '@luna/contracts';

describe('DEF-01 Regression: Dynamic Ephemeris Earth Distance in TopocentricHorizonView', () => {
  // `focusMapSite` is part of the command surface since ADR-02 split map inspection
  // focus from the mission target; the view under test never invokes it.
  const dummyCommands: ScenarioCommands = {
    selectSite: () => {},
    focusMapSite: () => {},
    setCustomTarget: () => {},
    setEpoch: () => {},
    setCalculationMode: () => {},
  };

  test('renders dynamic earthMoonDistanceKm from ScenarioModel rather than static 384,400 km', () => {
    const site = CANDIDATE_SITES[0];
    // Epoch near lunar apogee: Earth-Moon distance is ~405,000+ km
    const apogeeEpochMs = Date.UTC(2026, 9, 21, 12, 0, 0);
    const model = deriveScenarioModel(site, apogeeEpochMs, 'terrain-aware');

    // Ephemeris calculation yields dynamic distance != 384400
    const dynamicDistanceKm = model.ephemeris.earthMoonDistanceKm;
    const formattedDynamic = Math.round(dynamicDistanceKm).toLocaleString();
    expect(dynamicDistanceKm).not.toBe(384400);

    const state = {
      selectedSiteId: site.id,
      customTarget: null,
      epochMs: apogeeEpochMs,
      calculationMode: 'terrain-aware' as const,
    };

    const html = renderToStaticMarkup(
      React.createElement(
        ScenarioStateContext.Provider,
        { value: state },
        React.createElement(
          ScenarioModelContext.Provider,
          { value: model },
          React.createElement(
            ScenarioCommandsContext.Provider,
            { value: dummyCommands },
            React.createElement(TopocentricHorizonView, null),
          ),
        ),
      ),
    );

    // Should render the dynamic ephemeris distance
    expect(html).toContain(`Dist: ${formattedDynamic} km`);
    // Must NOT contain the hardcoded 384,400 km placeholder
    expect(html).not.toContain('Dist: 384,400 km');
  });

  test('updates DSN RF link budget path loss when epoch shifts between perigee and apogee', () => {
    const site = CANDIDATE_SITES[0];
    // Perigee epoch (~363,000 km) vs Apogee epoch (~405,000 km)
    // Lunar anomalistic month is ~27.55 days; half cycle is ~13.77 days
    const epoch1 = Date.UTC(2026, 9, 7, 0, 0, 0);
    const epoch2 = Date.UTC(2026, 9, 21, 0, 0, 0);

    const model1 = deriveScenarioModel(site, epoch1, 'terrain-aware');
    const model2 = deriveScenarioModel(site, epoch2, 'terrain-aware');

    const dist1Formatted = Math.round(model1.ephemeris.earthMoonDistanceKm).toLocaleString();
    const dist2Formatted = Math.round(model2.ephemeris.earthMoonDistanceKm).toLocaleString();

    expect(model1.ephemeris.earthMoonDistanceKm).not.toBe(model2.ephemeris.earthMoonDistanceKm);

    const renderWithModel = (m: typeof model1, ep: number) =>
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
            { value: m },
            React.createElement(
              ScenarioCommandsContext.Provider,
              { value: dummyCommands },
              React.createElement(TopocentricHorizonView, null),
            ),
          ),
        ),
      );

    const html1 = renderWithModel(model1, epoch1);
    const html2 = renderWithModel(model2, epoch2);

    expect(html1).toContain(`Dist: ${dist1Formatted} km`);
    expect(html2).toContain(`Dist: ${dist2Formatted} km`);
  });
});

describe('ADR-02: map inspection focus must not move the mission analysis target', () => {
  test('focusMapSite changes the inspected site while primarySiteId stays the mission target', () => {
    const missionTargetId = initialScenarioState.primarySiteId;
    const inspectedSiteId = 'haworth-rim';

    const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: inspectedSiteId });

    // The store's mission target is untouched ...
    expect(focused.primarySiteId).toBe(missionTargetId);
    expect(focused.mapFocusSiteId).toBe(inspectedSiteId);

    // ... while the map-facing projection follows the pin.
    expect(deriveScenarioState(focused).selectedSiteId).toBe(inspectedSiteId);
    expect(deriveScenarioState(initialScenarioState).selectedSiteId).toBe(missionTargetId);

    // A map inspection is not a scenario edit: instant, mode and target are unchanged.
    expect(deriveScenarioState(focused).epochMs).toBe(deriveScenarioState(initialScenarioState).epochMs);
    expect(focused.calculationMode).toBe(initialScenarioState.calculationMode);
    expect(focused.customTarget).toBe(initialScenarioState.customTarget);
  });

  test('the mission-target model that Analyze, Compare and the Dossier derive is unchanged by a map focus', () => {
    const missionTarget = getSiteById(initialScenarioState.primarySiteId);
    expect(missionTarget).toBeDefined();

    const baseline = deriveScenarioState(initialScenarioState);
    const baselineModel = deriveScenarioModel(
      missionTarget!,
      baseline.epochMs,
      baseline.calculationMode,
    );

    const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'malapert-massif' });
    // Mission consumers read `primarySiteId`, never the inspection focus.
    const missionSite = getSiteById(focused.primarySiteId)!;
    const focusedModel = deriveScenarioModel(
      missionSite,
      deriveScenarioState(focused).epochMs,
      deriveScenarioState(focused).calculationMode,
    );

    expect(missionSite.id).toBe(missionTarget!.id);
    expect(focusedModel).toEqual(baselineModel);
  });

  test('committing a new mission target ends the inspection divergence', () => {
    const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });
    const committed = scenarioReducer(focused, { type: 'SET_PRIMARY_SITE', siteId: 'nobile-rim-1' });

    expect(committed.primarySiteId).toBe('nobile-rim-1');
    expect(committed.mapFocusSiteId).toBeNull();
    expect(deriveScenarioState(committed).selectedSiteId).toBe('nobile-rim-1');
  });
});
