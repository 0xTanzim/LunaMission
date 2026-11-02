import { describe, expect, it } from 'bun:test';
import {
  createInitialGlobalScenarioState,
  initialScenarioState,
  scenarioReducer,
} from '../scenarioReducer';

const CUSTOM_TARGET = {
  id: 'custom-test',
  name: 'Test Target',
  latitudeDeg: -89.0,
  longitudeDeg: 120.0,
  elevationKm: 2.0,
  createdAt: 1_800_000_000_000,
};

describe('scenarioReducer: Single Authoritative Scenario Store (ADR-02)', () => {
  it('initializes with verified default parameters', () => {
    expect(initialScenarioState.primarySiteId).toBe('connecting-ridge');
    expect(initialScenarioState.mapFocusSiteId).toBeNull();
    expect(initialScenarioState.observerMastHeightM).toBe(2.0);
    expect(initialScenarioState.launchSlipOffsetDays).toBe(0.0);
    expect(initialScenarioState.activeProjection).toBe('analyze');
    expect(initialScenarioState.calculationMode).toBe('terrain-aware');
  });

  it('commits the primary site and rejects an unknown site id without side effects', () => {
    const next = scenarioReducer(initialScenarioState, { type: 'SET_PRIMARY_SITE', siteId: 'malapert-massif' });
    expect(next.primarySiteId).toBe('malapert-massif');

    expect(scenarioReducer(next, { type: 'SET_PRIMARY_SITE', siteId: 'not-a-catalog-site' })).toBe(next);
  });

  it('moves map focus without touching the mission target, and rejects an unknown focus id', () => {
    const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });

    expect(focused.mapFocusSiteId).toBe('haworth-rim');
    expect(focused.primarySiteId).toBe(initialScenarioState.primarySiteId);
    expect(scenarioReducer(focused, { type: 'SET_MAP_FOCUS', siteId: 'not-a-catalog-site' })).toBe(focused);
    expect(scenarioReducer(focused, { type: 'SET_MAP_FOCUS', siteId: null }).mapFocusSiteId).toBeNull();
  });

  it('ends a map inspection divergence when the operator commits a new mission target', () => {
    const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });
    const committed = scenarioReducer(focused, { type: 'SET_PRIMARY_SITE', siteId: 'nobile-rim-1' });

    expect(committed.primarySiteId).toBe('nobile-rim-1');
    expect(committed.mapFocusSiteId).toBeNull();
  });

  it('drops map focus when the projection leaves the spatial workspace', () => {
    const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });

    expect(scenarioReducer(focused, { type: 'SET_PROJECTION', projection: 'compare' }).mapFocusSiteId).toBeNull();
    expect(scenarioReducer(focused, { type: 'SET_PROJECTION', projection: 'analyze' }).mapFocusSiteId).toBeNull();
    expect(scenarioReducer(focused, { type: 'SET_PROJECTION', projection: 'explore' }).mapFocusSiteId).toBe(
      'haworth-rim',
    );
  });

  it('updates mast height strictly to precomputed anchors', () => {
    expect(scenarioReducer(initialScenarioState, { type: 'SET_MAST_HEIGHT', heightM: 5.0 }).observerMastHeightM).toBe(5.0);
  });

  it('updates launch slip offset within range [0, 28] days', () => {
    expect(scenarioReducer(initialScenarioState, { type: 'SET_LAUNCH_SLIP', offsetDays: 3.5 }).launchSlipOffsetDays).toBe(3.5);
    expect(scenarioReducer(initialScenarioState, { type: 'SET_LAUNCH_SLIP', offsetDays: -1.0 }).launchSlipOffsetDays).toBe(0.0);
    expect(scenarioReducer(initialScenarioState, { type: 'SET_LAUNCH_SLIP', offsetDays: 40.0 }).launchSlipOffsetDays).toBe(28.0);
  });

  it('clamps custom targets strictly to the polar zone [-90, -80]', () => {
    const next = scenarioReducer(initialScenarioState, {
      type: 'SET_CUSTOM_TARGET',
      target: { ...CUSTOM_TARGET, latitudeDeg: -75.0, longitudeDeg: 400.0 },
    });
    expect(next.customTarget?.latitudeDeg).toBe(-80.0);
    expect(next.customTarget?.longitudeDeg).toBe(40.0);
  });

  it('switches the calculation mode and ignores a repeated request', () => {
    const geometryOnly = scenarioReducer(initialScenarioState, { type: 'SET_CALCULATION_MODE', mode: 'geometry-only' });
    expect(geometryOnly.calculationMode).toBe('geometry-only');
    expect(scenarioReducer(geometryOnly, { type: 'SET_CALCULATION_MODE', mode: 'geometry-only' })).toBe(geometryOnly);
  });

  it('hydrates deep-link parameters and rejects out-of-contract values', () => {
    const hydrated = createInitialGlobalScenarioState(
      '?site=malapert-massif&epoch=1793577600000&mode=geometry-only&mast=5&slip=7',
    );

    expect(hydrated.primarySiteId).toBe('malapert-massif');
    expect(hydrated.activePlayheadUtc).toBe(new Date(1793577600000).toISOString());
    expect(hydrated.calculationMode).toBe('geometry-only');
    expect(hydrated.observerMastHeightM).toBe(5.0);
    expect(hydrated.launchSlipOffsetDays).toBe(7.0);

    const rejected = createInitialGlobalScenarioState('?site=ghost-crater&epoch=not-a-number&mode=warp&mast=3.5&slip=99');
    expect(rejected.primarySiteId).toBe(initialScenarioState.primarySiteId);
    expect(rejected.activePlayheadUtc).toBe(initialScenarioState.activePlayheadUtc);
    expect(rejected.calculationMode).toBe(initialScenarioState.calculationMode);
    expect(rejected.observerMastHeightM).toBe(initialScenarioState.observerMastHeightM);
    expect(rejected.launchSlipOffsetDays).toBe(initialScenarioState.launchSlipOffsetDays);
  });

  it('ignores an unrecognised action', () => {
    // @ts-expect-error deliberately exercising the defensive default branch
    expect(scenarioReducer(initialScenarioState, { type: 'unknown/action' })).toBe(initialScenarioState);
  });
});
