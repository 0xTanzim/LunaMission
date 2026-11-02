import { describe, expect, test, afterEach } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialGlobalScenarioState, initialScenarioState } from '@/app/state/scenarioReducer';
import { deriveScenarioState } from '@/app/scenario/state/scenarioState';
import { getSiteById } from '@/domain/sites/catalog';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';
import { useScenario, useScenarioModel } from '@/app/scenario/context/scenarioContext';

/**
 * The single authoritative store owns the deep-link contract that the retired
 * `createInitialScenarioState` used to implement. The canonical defaults are read
 * off `initialScenarioState` rather than re-declared here, so this file cannot drift
 * from the store it is checking.
 */
const DEFAULT_EPOCH_MS = Date.parse(initialScenarioState.activePlayheadUtc);
const DEFAULT_CALCULATION_MODE = initialScenarioState.calculationMode;
const DEFAULT_SITE_ID = initialScenarioState.primarySiteId;

/**
 * Hydrates the canonical store from a URL search string and projects it exactly the
 * way the scientific views consume it (`deriveScenarioState`).
 *
 * A deep link may retarget the mission, but it must never open a map-inspection
 * divergence (ADR-02), so `mapFocusSiteId` is asserted null on every call.
 */
function initialScenario(search?: string) {
  const store = createInitialGlobalScenarioState(search);
  expect(store.mapFocusSiteId).toBeNull();
  return { ...deriveScenarioState(store), primarySiteId: store.primarySiteId };
}

function ConsumerProbe() {
  const state = useScenario();
  const model = useScenarioModel();
  return React.createElement(
    'div',
    { 'data-testid': 'scenario-probe' },
    `site:${state.selectedSiteId}|epoch:${state.epochMs}|modelSite:${model.site.id}|mode:${state.calculationMode}`,
  );
}

describe('DEF-05 Regression: Deep Link URL Query Parameter Synchronization on Page Load', () => {
  const hadWindow = typeof globalThis.window !== 'undefined';
  const originalWindow = (globalThis as any).window;

  afterEach(() => {
    if (hadWindow) {
      (globalThis as any).window = originalWindow;
    } else {
      delete (globalThis as any).window;
    }
  });

  test('createInitialGlobalScenarioState parses site, epoch, and mode query parameters directly', () => {
    const qs = '?site=connecting-ridge&epoch=1773532800000&mode=geometry-only';
    const state = initialScenario(qs);

    expect(state.selectedSiteId).toBe('connecting-ridge');
    expect(state.primarySiteId).toBe('connecting-ridge');
    expect(state.epochMs).toBe(1773532800000);
    expect(state.calculationMode).toBe('geometry-only');
  });

  test('createInitialGlobalScenarioState falls back to the store defaults when search is empty or params are missing', () => {
    const emptyState = initialScenario('');
    expect(emptyState.selectedSiteId).toBe(DEFAULT_SITE_ID);
    expect(emptyState.selectedSiteId).toBe(initialScenarioState.primarySiteId);
    expect(getSiteById(emptyState.selectedSiteId)).toBeDefined();
    expect(emptyState.epochMs).toBe(DEFAULT_EPOCH_MS);
    expect(emptyState.calculationMode).toBe('terrain-aware');
    expect(DEFAULT_CALCULATION_MODE).toBe('terrain-aware');

    const partialState = initialScenario('?unrelated=123');
    expect(partialState.selectedSiteId).toBe(DEFAULT_SITE_ID);
    expect(partialState.epochMs).toBe(DEFAULT_EPOCH_MS);
  });

  test('createInitialGlobalScenarioState falls back to the canonical default site when invalid site is provided', () => {
    const invalidSiteState = initialScenario('?site=non-existent-crater&epoch=1773532800000');
    expect(invalidSiteState.selectedSiteId).toBe(DEFAULT_SITE_ID);
    expect(invalidSiteState.primarySiteId).toBe(DEFAULT_SITE_ID);
    expect(invalidSiteState.epochMs).toBe(1773532800000);
  });

  test('ScenarioProvider initializes from window.location.search on page load', () => {
    (globalThis as any).window = {
      location: new URL('http://localhost:3000/explore?site=malapert-massif&epoch=1774000000000&mode=geometry-only'),
    };

    const html = renderToStaticMarkup(
      React.createElement(ScenarioProvider, null, React.createElement(ConsumerProbe, null)),
    );

    expect(html).toContain('site:malapert-massif');
    expect(html).toContain('epoch:1774000000000');
    expect(html).toContain('modelSite:malapert-massif');
    expect(html).toContain('mode:geometry-only');
  });
});
