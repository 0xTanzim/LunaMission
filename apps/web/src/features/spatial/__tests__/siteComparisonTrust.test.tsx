import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteComparisonMatrixTable } from '../components/SiteComparisonMatrixTable';
import {
  getSiteInvestigation,
  isSiteIndividuallyCharacterized,
  REGISTRY,
  ScientificSiteInvestigation,
} from '@/domain/sites/siteInvestigationRegistry';
import { CandidateSite } from '@/domain/sites/candidateSite';

function makeDecorated(id: string, name: string, overrides: Partial<ScientificSiteInvestigation> = {}) {
  const inv = { ...getSiteInvestigation(id, name), ...overrides };
  const site = {
    id,
    code: 'SITE-TST',
    name,
    coordinates: { latitudeDeg: -89, longitudeDeg: 0, elevationMeters: 1000 },
  } as unknown as CandidateSite;
  return { site, inv };
}

test('L-02: registry exposes which sites are individually characterized', () => {
  // The registry ships NO per-site entries in the client bundle: every fallback is a
  // documented template. The predicate must make that visible to consumers instead of
  // letting template numbers masquerade as per-site science.
  assert.equal(isSiteIndividuallyCharacterized('shackleton-rim'), false);
  assert.equal(isSiteIndividuallyCharacterized('not-a-registered-site'), false);
});

test('L-02: uncharacterized rows render "Not individually characterized", not template metrics', () => {
  const rows = [makeDecorated('site-a', 'Template Site A'), makeDecorated('site-b', 'Template Site B')];
  const html = renderToStaticMarkup(
    React.createElement(SiteComparisonMatrixTable, {
      candidateList: rows,
      selectedSiteId: 'site-a',
      onSelectSite: () => {},
      onClose: () => {},
      onSort: () => {},
    }),
  );
  assert.ok(html.includes('Not individually characterized'), 'uncharacterized metric cells must say so');
  assert.ok(!html.includes('80.5'), 'template sunlight value must not render as per-site science');
  assert.ok(!html.includes('24.5'), 'template peak slope must not render as per-site science');
  assert.ok(!html.includes('Tier 1 Primary'), 'template HLS rating must not render as per-site rating');
});

test('L-30: traversable cell states the <15° definition and the peak-slope distinction', () => {
  // Register a genuine per-site entry so the characterized branch renders.
  REGISTRY['site-a'] = {
    ...getSiteInvestigation('site-a', 'Characterized Site A'),
    maxSlopeDeg: 18.2,
    traversableAreaPct: 62,
  };
  const rows = [makeDecorated('site-a', 'Characterized Site A')];
  const html = renderToStaticMarkup(
    React.createElement(SiteComparisonMatrixTable, {
      candidateList: rows,
      selectedSiteId: 'site-a',
      onSelectSite: () => {},
      onClose: () => {},
      onSort: () => {},
    }),
  );
  // The two numbers are different metrics: the fraction counts cells below 15°, the
  // peak is the site maximum. The copy must not let them read as a contradiction.
  assert.ok(html.includes('Site peak slope'), 'peak slope must be labeled as the site maximum');
  assert.ok(/cells.*15°|15°.*cells/.test(html), 'the <15° cell-exclusion definition must be stated');
});
