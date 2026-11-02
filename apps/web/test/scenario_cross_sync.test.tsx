import { describe, it, expect } from 'bun:test';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';
import { GlobalScenarioProvider } from '@/app/state/GlobalScenarioContext';
import { useScenarioState } from '@/app/state/useScenarioState';
import { useScenario, useScenarioCommands } from '@/app/scenario/context/scenarioContext';
import { deriveScenarioState } from '@/app/scenario/state/scenarioState';
import {
  initialScenarioState,
  scenarioReducer,
  type ScenarioAction,
  type GlobalScenarioState,
} from '@/app/state/scenarioReducer';

/**
 * ADR-02 replaced the two competing scenario contexts (and the `useScenarioCrossSync`
 * bridge that kept them in step) with one authoritative store plus a pure projection.
 *
 * These tests pin the three properties that consolidation has to deliver, and that the
 * retired cross-sync test was trying to prove:
 *
 * 1. one store — the projection and the store can never disagree;
 * 2. map focus moves inspection only — `primarySiteId` is the mission target;
 * 3. no sync loop — replaying an intent is a no-op, so state settles after one render.
 */

interface Captured {
  store: GlobalScenarioState;
  inspectedSiteId: string;
  inspectedEpochMs: number;
  commands: ReturnType<typeof useScenarioCommands>;
}

function StoreProbe({ onRender }: { onRender: (data: Captured) => void }) {
  const { state } = useScenarioState();
  const projection = useScenario();
  const commands = useScenarioCommands();

  onRender({
    store: state,
    inspectedSiteId: projection.selectedSiteId,
    inspectedEpochMs: projection.epochMs,
    commands,
  });

  return (
    <div data-testid="single-store-consumer">
      <span data-testid="primary-site">{state.primarySiteId}</span>
      <span data-testid="inspected-site">{projection.selectedSiteId}</span>
    </div>
  );
}

/** Renders the production provider tree; asserts one store even with a nested provider. */
function renderWithNestedProviders(onRender: (data: Captured) => void): string {
  return renderToStaticMarkup(
    React.createElement(
      ScenarioProvider,
      null,
      React.createElement(
        GlobalScenarioProvider,
        null,
        React.createElement(StoreProbe, { onRender }),
      ),
    ),
  );
}

/**
 * Counts how many state transitions an intent produces before it settles.
 *
 * This is the exact rule `useReducer` applies: a reducer that returns the previous state
 * object makes React bail out without rendering. A hypothetical re-entrant sync loop
 * replaying the same intent therefore stops after one render instead of spinning.
 */
function transitionsUntilSettled(action: ScenarioAction, state: GlobalScenarioState = initialScenarioState): number {
  let current = state;
  for (let transitions = 0; transitions < 10; transitions++) {
    const next = scenarioReducer(current, action);
    if (next === current) return transitions;
    current = next;
  }
  throw new Error(`state never settled for action ${action.type}: runaway update loop`);
}

describe('Single authoritative scenario store (ADR-02) — replaces useScenarioCrossSync', () => {
  it('renders one store: the projection and the authoritative store agree on the same site', () => {
    let captured: Captured | null = null;
    const html = renderWithNestedProviders((data) => {
      captured = data;
    });

    expect(html).toContain('data-testid="single-store-consumer"');
    expect(captured).not.toBeNull();

    // The retired dual-store design could show two different sites here (a divergence).
    expect(captured!.inspectedSiteId).toBe(captured!.store.primarySiteId);
    expect(captured!.inspectedSiteId).toBe(initialScenarioState.primarySiteId);

    // No inspection is in progress on a cold render.
    expect(captured!.store.mapFocusSiteId).toBeNull();
    expect(captured!.inspectedEpochMs).toBe(Date.parse(initialScenarioState.activePlayheadUtc));
    expect(captured!.inspectedEpochMs).toBe(Date.parse(captured!.store.activePlayheadUtc));
  });

  it('exposes focusMapSite as a command distinct from selectSite, so a pin click cannot commit the mission target', () => {
    let captured: Captured | null = null;
    renderWithNestedProviders((data) => {
      captured = data;
    });

    const commands = captured!.commands;
    expect(typeof commands.focusMapSite).toBe('function');
    expect(typeof commands.selectSite).toBe('function');
    // Same function object would mean map focus commits the mission target (the V2 defect).
    expect(commands.focusMapSite).not.toBe(commands.selectSite);
  });

  it('map focus updates the inspected site while primarySiteId is unchanged', () => {
    const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });

    expect(focused.mapFocusSiteId).toBe('haworth-rim');
    expect(focused.primarySiteId).toBe(initialScenarioState.primarySiteId);
    expect(deriveScenarioState(focused).selectedSiteId).toBe('haworth-rim');
    expect(deriveScenarioState(initialScenarioState).selectedSiteId).toBe(initialScenarioState.primarySiteId);

    // Returning to no inspection restores the mission target with no extra state to sync.
    const cleared = scenarioReducer(focused, { type: 'SET_MAP_FOCUS', siteId: null });
    expect(cleared.mapFocusSiteId).toBeNull();
    expect(deriveScenarioState(cleared).selectedSiteId).toBe(initialScenarioState.primarySiteId);
  });

  it('has no sync loop: replaying an intent settles after exactly one transition', () => {
    expect(transitionsUntilSettled({ type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' })).toBe(1);
    expect(transitionsUntilSettled({ type: 'SET_PLAYHEAD_UTC', playheadUtc: '2026-11-05T06:00:00.000Z' })).toBe(1);
    expect(transitionsUntilSettled({ type: 'SET_CALCULATION_MODE', mode: 'geometry-only' })).toBe(1);

    // Replaying against an already-applied state is a no-op: zero further transitions.
    const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });
    expect(transitionsUntilSettled({ type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' }, focused)).toBe(0);

    // `SET_PRIMARY_SITE` is deliberately excluded from this invariant: it re-enters
    // 'loading' and clears the inspection on every dispatch, because committing a target
    // is a request for a new calculation rather than a convergent assignment.
    const committed = scenarioReducer(initialScenarioState, { type: 'SET_PRIMARY_SITE', siteId: 'nobile-rim-1' });
    expect(committed.calculationStatus).toBe('loading');
    expect(scenarioReducer(committed, { type: 'SET_PRIMARY_SITE', siteId: 'nobile-rim-1' }).calculationStatus).toBe(
      'loading',
    );
  });

  it('drops a stale map inspection when the operator leaves the spatial workspace', () => {
    // A map pin can only be clicked while /explore is the active projection.
    const exploring = scenarioReducer(initialScenarioState, { type: 'SET_PROJECTION', projection: 'explore' });
    const focused = scenarioReducer(exploring, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });
    expect(focused.mapFocusSiteId).toBe('haworth-rim');

    const analyzing = scenarioReducer(focused, { type: 'SET_PROJECTION', projection: 'analyze' });

    expect(analyzing.mapFocusSiteId).toBeNull();
    expect(deriveScenarioState(analyzing).selectedSiteId).toBe(analyzing.primarySiteId);
  });

  it('keeps the projection layer stateless: ScenarioProvider holds no state of its own', () => {
    const providerSource = fs.readFileSync(
      path.resolve(process.cwd(), 'apps/web/src/app/scenario/ScenarioProvider.tsx'),
      'utf8',
    );

    // A second useReducer/useState here would be a second copy of scenario state.
    expect(providerSource).not.toContain('useReducer(');
    expect(providerSource).not.toContain('useState(');
  });

  it('cannot regress to a dual-store design: no cross-store sync module exists', () => {
    const stateDir = path.resolve(process.cwd(), 'apps/web/src/app/state');
    const syncModules = fs
      .readdirSync(stateDir)
      .filter((entry) => /crosssync|useScenarioCrossSync/i.test(entry));

    expect(syncModules).toEqual([]);
    expect(fs.existsSync(path.join(stateDir, 'useScenarioCrossSync.ts'))).toBe(false);
  });
});
