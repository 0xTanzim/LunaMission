import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveScenarioState,
  resolveInspectedSiteId,
} from '@/app/scenario/state/scenarioState';
import { initialScenarioState, scenarioReducer } from '@/app/state/scenarioReducer';

/**
 * The scientific views render a projection of the authoritative store, not a copy of
 * it. These tests pin the projection contract: which site an inspecting view shows, and
 * that everything else is passed through untouched.
 */

test('Scenario projection: without map inspection the inspected site is the mission target', () => {
  const projected = deriveScenarioState(initialScenarioState);

  assert.equal(initialScenarioState.mapFocusSiteId, null);
  assert.equal(projected.selectedSiteId, initialScenarioState.primarySiteId);
});

test('Scenario projection: map inspection overrides the inspected site without moving the target', () => {
  const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });

  assert.equal(resolveInspectedSiteId(focused), 'haworth-rim');
  assert.equal(focused.primarySiteId, initialScenarioState.primarySiteId);
  assert.equal(deriveScenarioState(focused).selectedSiteId, 'haworth-rim');
});

test('Scenario projection: clearing map inspection returns the inspected site to the target', () => {
  const focused = scenarioReducer(initialScenarioState, { type: 'SET_MAP_FOCUS', siteId: 'haworth-rim' });
  const cleared = scenarioReducer(focused, { type: 'SET_MAP_FOCUS', siteId: null });

  assert.equal(deriveScenarioState(cleared).selectedSiteId, cleared.primarySiteId);
});

test('Scenario projection: epoch is the canonical playhead instant, not a re-derived default', () => {
  const projected = deriveScenarioState(initialScenarioState);

  assert.equal(projected.epochMs, Date.parse(initialScenarioState.activePlayheadUtc));
  assert.equal(initialScenarioState.activePlayheadUtc, initialScenarioState.missionEpoch.startUtc);
});

test('Scenario projection: a playhead move changes the instant and nothing else', () => {
  const playheadUtc = '2026-11-08T06:00:00.000Z';
  const moved = scenarioReducer(initialScenarioState, { type: 'SET_PLAYHEAD_UTC', playheadUtc });
  const before = deriveScenarioState(initialScenarioState);
  const after = deriveScenarioState(moved);

  assert.equal(after.epochMs, Date.parse(playheadUtc));
  assert.equal(after.selectedSiteId, before.selectedSiteId);
  assert.equal(after.customTarget, before.customTarget);
  assert.equal(after.calculationMode, before.calculationMode);
});

test('Scenario projection: an unparsable playhead cannot be committed', () => {
  const rejected = scenarioReducer(initialScenarioState, {
    type: 'SET_PLAYHEAD_UTC',
    playheadUtc: 'not-an-instant',
  });

  assert.equal(rejected, initialScenarioState);
});

test('Scenario projection: custom target and calculation mode pass through untouched', () => {
  const target = {
    id: 'custom-1',
    name: 'Outpost',
    latitudeDeg: -89.4,
    longitudeDeg: 222.0,
    elevationKm: 1.8,
    createdAt: 1_800_000_000_000,
  };
  const state = scenarioReducer(
    scenarioReducer(initialScenarioState, { type: 'SET_CUSTOM_TARGET', target }),
    { type: 'SET_CALCULATION_MODE', mode: 'geometry-only' },
  );
  const projected = deriveScenarioState(state);

  assert.deepEqual(projected.customTarget, target);
  assert.equal(projected.calculationMode, 'geometry-only');
});
