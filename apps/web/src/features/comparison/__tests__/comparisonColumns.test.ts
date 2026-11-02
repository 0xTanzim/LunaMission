import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_COMPARISON_SITE_IDS,
  MAX_COMPARISON_SITES,
  MIN_COMPARISON_SITES,
  addComparisonSite,
  buildComparisonColumns,
  comparisonSitesToAdd,
  removeComparisonSite,
  resolveComparisonSites,
} from '@/features/comparison/model/comparisonColumns';
import { CANDIDATE_SITES } from '@luna/contracts';

const EPOCH_MS = Date.parse('2026-10-21T12:00:00Z');

test('opening comparison is the three published south-pole sites, in order', () => {
  assert.deepEqual(DEFAULT_COMPARISON_SITE_IDS, ['shackleton-rim', 'connecting-ridge', 'malapert-massif']);
  assert.deepEqual(
    resolveComparisonSites(DEFAULT_COMPARISON_SITE_IDS).map((s) => s.id),
    DEFAULT_COMPARISON_SITE_IDS,
  );
});

test('adding a site appends it and the cap refuses a fifth column', () => {
  const three = DEFAULT_COMPARISON_SITE_IDS;
  assert.equal(three.length, 3);
  assert.equal(MAX_COMPARISON_SITES, 4);

  const four = addComparisonSite(three, 'de-gerlache-rim-1');
  assert.deepEqual(four, [...three, 'de-gerlache-rim-1']);

  const full = addComparisonSite(four, 'nobile-rim-1');
  assert.equal(full, four, 'a full comparison returns the same array so React skips the re-render');
});

test('an id that is no longer in the catalog yields no column', () => {
  assert.deepEqual(resolveComparisonSites(['shackleton-rim', 'was-never-a-site']), [CANDIDATE_SITES[0]]);
});

test('removing a site keeps at least one column and is a no-op below the floor', () => {
  assert.equal(MIN_COMPARISON_SITES, 1);
  const three = DEFAULT_COMPARISON_SITE_IDS;

  assert.deepEqual(removeComparisonSite(three, 'connecting-ridge'), [
    'shackleton-rim',
    'malapert-massif',
  ]);

  const one = ['shackleton-rim'];
  assert.equal(removeComparisonSite(one, 'shackleton-rim'), one);
});

test('the add-site picker offers exactly the sites not already compared', () => {
  const compared = DEFAULT_COMPARISON_SITE_IDS;
  const available = comparisonSitesToAdd(compared);

  assert.equal(available.length, CANDIDATE_SITES.length - compared.length);
  for (const site of available) assert.ok(!compared.includes(site.id));
  assert.deepEqual(
    available.map((s) => s.id),
    CANDIDATE_SITES.filter((s) => !compared.includes(s.id)).map((s) => s.id),
    'catalog order is preserved',
  );
});

test('every compared site is evaluated at one shared epoch', () => {
  const columns = buildComparisonColumns(CANDIDATE_SITES.map((s) => s.id), EPOCH_MS, 'terrain-aware');

  assert.equal(columns.length, CANDIDATE_SITES.length);
  const sharedEpochUtc = columns[0].conditions.epochUtc;
  for (const column of columns) {
    assert.equal(column.conditions.epochUtc, sharedEpochUtc);
    assert.equal(column.conditions.provenance.calculationMode, 'terrain-aware');
  }
});

test('columns for the same sites are stable when the epoch and mode are unchanged', () => {
  const first = buildComparisonColumns(DEFAULT_COMPARISON_SITE_IDS, EPOCH_MS, 'geometry-only');
  const second = buildComparisonColumns(DEFAULT_COMPARISON_SITE_IDS, EPOCH_MS, 'geometry-only');

  assert.deepEqual(
    second.map((c) => c.conditions.sunElevationDeg),
    first.map((c) => c.conditions.sunElevationDeg),
  );
});

test('the calculation mode is carried into every column', () => {
  const terrainAware = buildComparisonColumns(DEFAULT_COMPARISON_SITE_IDS, EPOCH_MS, 'terrain-aware');
  const geometryOnly = buildComparisonColumns(DEFAULT_COMPARISON_SITE_IDS, EPOCH_MS, 'geometry-only');

  assert.equal(terrainAware[0].conditions.provenance.terrainSource.includes('LOLA'), true);
  assert.equal(geometryOnly[0].conditions.provenance.terrainSource.includes('Mean Sphere'), true);
});
