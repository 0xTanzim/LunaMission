import test from 'node:test';
import assert from 'node:assert/strict';
import { CANDIDATE_SITES } from '@luna/contracts';
import { ARTEMIS_2022_LEGACY_REGIONS } from '../artemisCatalog2026';
import {
  ARTEMIS_III_2022_REGION_COUNT,
  CATALOGUE_ONLY_REASON,
  getArtemis2022CatalogueEntries,
  getCatalogueOnlyEntries,
  getFilteredCandidateSites,
  getSiteEvaluability,
  isEvaluableSiteId,
  registerDynamicSites,
} from '../catalog';

registerDynamicSites(CANDIDATE_SITES);

/** The 2022 records that have no registered candidate site, and so no horizon profile. */
const CATALOGUE_ONLY_IDS = [
  'shackleton-connecting-ridge',
  'connecting-ridge-extension',
  'faustini-rim-a',
];

test('Artemis III 2022 cohort: the filter returns all 13 published regions', () => {
  const entries = getFilteredCandidateSites('artemis-iii-2022');

  assert.equal(ARTEMIS_III_2022_REGION_COUNT, 13);
  assert.equal(entries.length, 13);
  assert.deepEqual(
    entries.map((entry) => entry.catalogueRegion?.id),
    ARTEMIS_2022_LEGACY_REGIONS.map((region) => region.id),
    'catalogue order is the published order',
  );
  for (const entry of entries) {
    assert.equal(entry.catalogueRegion?.epoch, '2022-legacy');
    assert.ok(entry.catalogueRegion?.officialReference.includes('August 2022'));
  }
});

test('Artemis III 2022 cohort: regions with a registered candidate site are evaluable', () => {
  const entries = getFilteredCandidateSites('artemis-iii-2022');
  const evaluable = entries.filter((entry) => entry.evaluability === 'evaluable');

  assert.equal(evaluable.length, 10);
  // Required four (the 2022 catalogue adds de Gerlache Rim 1, already a polar benchmark here).
  const additions = ARTEMIS_2022_LEGACY_REGIONS.slice(9).map((region) => region.id);
  assert.deepEqual(additions, [
    'shackleton-connecting-ridge',
    'connecting-ridge-extension',
    'de-gerlache-rim-1',
    'faustini-rim-a',
  ]);
  assert.ok(evaluable.some((entry) => entry.id === 'de-gerlache-rim-1'));

  for (const entry of evaluable) {
    assert.equal(entry.evaluabilityReason, undefined, 'an evaluable entry states no reason');
    assert.ok(entry.meanTerrainHorizonDeg !== undefined, `${entry.id} has a horizon profile`);
    assert.equal(isEvaluableSiteId(entry.id), true);
  }
});

test('Artemis III 2022 cohort: registry-less regions are catalogue-only, with a stated reason', () => {
  const entries = getFilteredCandidateSites('artemis-iii-2022');
  const catalogueOnly = entries.filter((entry) => entry.evaluability === 'catalogue-only');

  assert.deepEqual(catalogueOnly.map((entry) => entry.id), CATALOGUE_ONLY_IDS);
  assert.deepEqual(getCatalogueOnlyEntries().map((entry) => entry.id), CATALOGUE_ONLY_IDS);

  for (const entry of catalogueOnly) {
    assert.equal(entry.evaluabilityReason, CATALOGUE_ONLY_REASON);
    assert.equal(entry.meanTerrainHorizonDeg, undefined, 'no horizon profile exists to report');
    assert.equal(entry.maxTerrainObstructionDeg, undefined);
    assert.equal(getSiteEvaluability(entry.id), 'catalogue-only');
    assert.equal(isEvaluableSiteId(entry.id), false);
    // A region is not a touchdown coordinate: the entry is tagged as a region centroid.
    assert.equal(entry.entityType, 'region-centroid');
  }
});

test('Artemis III 2022 cohort: catalogue-only entries carry the published record, not invented values', () => {
  for (const entry of getCatalogueOnlyEntries()) {
    const published = ARTEMIS_2022_LEGACY_REGIONS.find((region) => region.id === entry.id);
    assert.ok(published, `${entry.id} traces to the 2022 catalogue`);

    assert.equal(entry.name, published.name);
    assert.equal(entry.coordinates.latitudeDeg, published.coordinates.latitudeDeg);
    assert.equal(entry.coordinates.longitudeDeg, published.coordinates.longitudeDeg);
    assert.equal(entry.coordinates.elevationMeters, published.elevationMeters);
    assert.equal(entry.description, published.description);
    assert.equal(entry.officialRegionReference, published.officialReference);
  }
});

test('Artemis III 2022 cohort: the one renamed region resolves to its registry record', () => {
  const haworth = getFilteredCandidateSites('artemis-iii-2022').find(
    (entry) => entry.catalogueRegion?.id === 'haworth',
  );
  const published = ARTEMIS_2022_LEGACY_REGIONS.find((region) => region.id === 'haworth');
  const registry = CANDIDATE_SITES.find((site) => site.id === 'haworth-rim');

  assert.ok(haworth && published && registry);
  assert.equal(haworth.id, 'haworth-rim', 'the evaluable entry is addressed by its registry id');
  assert.equal(haworth.evaluability, 'evaluable');
  assert.equal(haworth.coordinates.latitudeDeg, published.coordinates.latitudeDeg);
  assert.equal(haworth.coordinates.longitudeDeg, published.coordinates.longitudeDeg);
  // The bare 2022 id is not a registry id, so no cohort may hold it.
  assert.equal(getSiteEvaluability('haworth'), 'catalogue-only');
  assert.equal(isEvaluableSiteId('haworth'), false);
});

test('Existing cohorts are unchanged by the additive 2022 branch', () => {
  assert.equal(getFilteredCandidateSites().length, CANDIDATE_SITES.length);
  assert.equal(getFilteredCandidateSites('all').length, CANDIDATE_SITES.length);
  assert.equal(getFilteredCandidateSites('artemis-iii-2024').length, 9);
  assert.equal(getFilteredCandidateSites('polar-benchmark').length, 5);
  assert.equal(getFilteredCandidateSites('clps').length, 3);
  assert.equal(getFilteredCandidateSites('historic').length, 3);

  for (const entry of getFilteredCandidateSites('all')) {
    assert.equal(entry.evaluability, 'evaluable', `${entry.id} stays evaluable`);
    assert.equal(entry.catalogueRegion, undefined, 'only the 2022 cohort names a catalogue record');
  }
});

test('Evaluability of an unknown id is undefined, never a silent default', () => {
  assert.equal(getSiteEvaluability('was-never-a-site'), undefined);
  assert.equal(isEvaluableSiteId('was-never-a-site'), false);
  assert.equal(getArtemis2022CatalogueEntries().length, 13);
});
