import test from 'node:test';
import assert from 'node:assert/strict';

import { initialScenarioState, scenarioReducer } from '@/app/state/scenarioReducer';
import { deriveScenarioState } from '@/app/scenario/state/scenarioState';
import { createCustomLandingTarget } from '@/domain/target/customTargetModel';

test('customTargetCohesion: initializes customTarget as null in the authoritative store', () => {
  assert.equal(initialScenarioState.customTarget, null);
  assert.equal(deriveScenarioState(initialScenarioState).customTarget, null);
});

test('customTargetCohesion: commits a custom target without moving site or instant', () => {
  const target = createCustomLandingTarget({
    name: 'Connecting Ridge Outpost',
    latitudeDeg: -89.45,
    longitudeDeg: 222.0,
    elevationKm: 1.8,
  });

  const next = scenarioReducer(initialScenarioState, { type: 'SET_CUSTOM_TARGET', target });

  assert.equal(next.customTarget?.name, 'Connecting Ridge Outpost');
  assert.equal(next.customTarget?.elevationKm, 1.8);
  assert.equal(next.primarySiteId, initialScenarioState.primarySiteId);
  assert.equal(next.activePlayheadUtc, initialScenarioState.activePlayheadUtc);
  assert.equal(deriveScenarioState(next).customTarget, next.customTarget);
});

test('customTargetCohesion: clamps the target to the polar operational zone and normalizes longitude', () => {
  const target = {
    id: 'custom-out-of-zone',
    name: 'Out of zone',
    latitudeDeg: -75.0,
    longitudeDeg: 400.0,
    elevationKm: 1.0,
    createdAt: 1_800_000_000_000,
  };

  const next = scenarioReducer(initialScenarioState, { type: 'SET_CUSTOM_TARGET', target });

  assert.equal(next.customTarget?.latitudeDeg, -80.0);
  assert.equal(next.customTarget?.longitudeDeg, 40.0);
  assert.equal(next.customTarget?.name, 'Out of zone', 'the operator-supplied name survives normalization');
});

test('customTargetCohesion: resets customTarget to null on clearing', () => {
  const target = createCustomLandingTarget({
    name: 'Temporary Target',
    latitudeDeg: -88.0,
    longitudeDeg: 45.0,
  });

  const withTarget = scenarioReducer(initialScenarioState, { type: 'SET_CUSTOM_TARGET', target });
  assert.notEqual(withTarget.customTarget, null);

  const cleared = scenarioReducer(withTarget, { type: 'SET_CUSTOM_TARGET', target: null });
  assert.equal(cleared.customTarget, null);
});

test('customTargetCohesion: returns same state reference when there is nothing to clear', () => {
  assert.equal(scenarioReducer(initialScenarioState, { type: 'SET_CUSTOM_TARGET', target: null }), initialScenarioState);
});
