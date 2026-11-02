import test from 'node:test';
import assert from 'node:assert/strict';

import { deriveScenarioState } from '@/app/scenario/state/scenarioState';
import { deriveScenarioModel } from '@/app/scenario/model/scenarioModel';
import { initialScenarioState, scenarioReducer } from '@/app/state/scenarioReducer';
import { CANDIDATE_SITES } from '@luna/contracts';
import { getSiteById } from '@/domain/sites/catalog';

/**
 * The application keeps one canonical scenario store and derives every view from it, so
 * a single dispatch must leave the passport, the inspector, the Time Explorer cursor and
 * the comparison matrix agreeing on the same site and instant. These tests pin that
 * property at the state and derivation layer, which is where a stale frame could arise.
 */

function modelOf(state: Parameters<typeof deriveScenarioState>[0]) {
  const projected = deriveScenarioState(state);
  const site = getSiteById(projected.selectedSiteId);
  assert.ok(site, `state holds a site id the catalog cannot resolve: ${projected.selectedSiteId}`);
  return deriveScenarioModel(site, projected.epochMs, projected.calculationMode);
}

test('single source of truth: one dispatch updates every consumer-visible slice at once', () => {
  const before = initialScenarioState;
  const after = scenarioReducer(before, { type: 'SET_PRIMARY_SITE', siteId: 'haworth-rim' });

  const model = modelOf(after);
  assert.equal(model.site.id, 'haworth-rim');
  assert.equal(model.epochMs, Date.parse(before.activePlayheadUtc), 'the instant must not move with a site change');
  assert.equal(model.epochIsoUtc, modelOf(before).epochIsoUtc);
  assert.equal(model.calculationMode, before.calculationMode);
});

test('single source of truth: an epoch change leaves the selected site untouched', () => {
  const start = scenarioReducer(initialScenarioState, { type: 'SET_PRIMARY_SITE', siteId: 'malapert-massif' });
  const playheadUtc = '2026-10-21T18:00:00.000Z';
  const next = scenarioReducer(start, { type: 'SET_PLAYHEAD_UTC', playheadUtc });

  const model = modelOf(next);
  assert.equal(model.site.id, 'malapert-massif');
  assert.equal(model.epochMs, Date.parse(playheadUtc));
  assert.notEqual(model.ephemeris.subSolarLonDeg, modelOf(start).ephemeris.subSolarLonDeg);
});

test('single source of truth: a mode change moves the provenance without moving site or instant', () => {
  const next = scenarioReducer(initialScenarioState, { type: 'SET_CALCULATION_MODE', mode: 'geometry-only' });

  const model = modelOf(next);
  assert.equal(model.site.id, deriveScenarioState(initialScenarioState).selectedSiteId);
  assert.equal(model.epochMs, deriveScenarioState(initialScenarioState).epochMs);
  assert.equal(model.calculationMode, 'geometry-only');
});

test('single source of truth: redundant dispatches return the same object, so no extra render frame exists', () => {
  const state = scenarioReducer(initialScenarioState, { type: 'SET_PRIMARY_SITE', siteId: 'haworth-rim' });

  assert.equal(scenarioReducer(state, { type: 'SET_PRIMARY_SITE', siteId: 'haworth-rim' }).primarySiteId, 'haworth-rim');
  assert.equal(scenarioReducer(state, { type: 'SET_MAP_FOCUS', siteId: null }), state);
  assert.equal(scenarioReducer(state, { type: 'SET_PLAYHEAD_UTC', playheadUtc: state.activePlayheadUtc }), state);
  assert.equal(scenarioReducer(state, { type: 'SET_CALCULATION_MODE', mode: state.calculationMode }), state);
  assert.equal(scenarioReducer(state, { type: 'SET_PROJECTION', projection: state.activeProjection }), state);
});

test('single source of truth: the derived model is a pure function of state alone', () => {
  let state = initialScenarioState;
  for (const site of CANDIDATE_SITES) {
    state = scenarioReducer(state, { type: 'SET_PRIMARY_SITE', siteId: site.id });
    assert.deepEqual(modelOf(state), modelOf(state), 'the same state must derive the same numbers');
    assert.equal(deriveScenarioState(state).selectedSiteId, site.id);
  }
});

test('single source of truth: every view input is reachable from the canonical fields', () => {
  const model = modelOf(initialScenarioState);

  assert.deepEqual(Object.keys(model).sort(), [
    'calculationMode',
    'conditions',
    'ephemeris',
    'epochIsoUtc',
    'epochMs',
    'julianDate',
    'site',
  ]);
  assert.equal(model.conditions.epochUtc, model.epochIsoUtc, 'derived values serialize the one instant');
});
