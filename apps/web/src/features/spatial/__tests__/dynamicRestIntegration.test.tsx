import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CandidateRibbon } from '../components/cards/CandidateRibbon';
import { MapCandidateRibbon } from '../map/components/MapCandidateRibbon';
import { CandidateLayer } from '../map/layers/CandidateLayer';
import { SiteIntelDrawer } from '../components/drawers/SiteIntelDrawer';
import { SiteComparisonMatrixModal } from '../components/SiteComparisonMatrixModal';
import { HeaderStatusControls } from '@/app/header/components/HeaderStatusControls';
import { ScenarioProvider } from '@/app/scenario/ScenarioProvider';

import { CANDIDATE_SITES } from '@luna/contracts';

function renderWithScenario(ui: React.ReactElement) {
  return renderToStaticMarkup(<ScenarioProvider>{ui}</ScenarioProvider>);
}

test('CandidateRibbon: renders dynamic REST API status badge and site buttons', () => {
  const html = renderWithScenario(<CandidateRibbon />);
  assert.ok(html.includes('data-testid="ribbon-api-status"'), 'Ribbon must render live API status badge');
  assert.ok(html.includes('Candidate Sites:'), 'Ribbon must render header label');
  assert.ok(html.includes('Shackleton Crater Rim'), 'Ribbon must render landing site buttons');
});

test('MapCandidateRibbon: renders dynamic candidate sites without static hardcoding', () => {
  const mockSite = CANDIDATE_SITES[0];

  const html = renderToStaticMarkup(
    <MapCandidateRibbon selectedSite={mockSite} onSelectSite={() => {}} />
  );
  assert.ok(html.includes('Candidate Sites:'), 'Must render Candidate Sites header');
  assert.ok(html.includes('Shackleton Crater Rim'), 'Must render candidate site name');
});

test('CandidateLayer: uses dynamic site catalog instead of static hardcoding', () => {
  const customSites = [
    {
      ...CANDIDATE_SITES[0],
      id: 'dynamic-test-site-alpha',
      code: 'ALPHA-01',
      name: 'Dynamic Alpha Massif',
    },
    {
      ...CANDIDATE_SITES[1],
      id: 'dynamic-test-site-beta',
      code: 'BETA-02',
      name: 'Dynamic Beta Ridge',
    },
  ];

  const html = renderToStaticMarkup(
    <svg>
      <CandidateLayer
        selectedSite={customSites[0]}
        onSelectSite={() => {}}
        hoveredSite={null}
        onHoverSite={() => {}}
        zoom={1}
        sites={customSites}
      />
    </svg>
  );

  assert.ok(html.includes('BETA-02') || html.includes('Dynamic Beta Ridge'), 'CandidateLayer must render dynamic sites provided via props');
  assert.ok(!html.includes('SITE-002'), 'Must not render unprovided static sites when dynamic sites are given');
});

test('SiteIntelDrawer: renders live API indicator in header', () => {
  const mockSite = CANDIDATE_SITES[0];
  const avail = <T,>(val: T) => ({ kind: 'available' as const, value: val, unit: '°' });

  const html = renderToStaticMarkup(
    <SiteIntelDrawer
      site={mockSite}
      isOpen={true}
      onClose={() => {}}
      sunElevationDeg={avail(1.2 as any)}
      sunAzimuthDeg={avail(45 as any)}
      earthElevationDeg={avail(5.8 as any)}
      earthAzimuthDeg={avail(12 as any)}
    />
  );

  assert.ok(html.includes('data-testid="intel-api-status"'), 'SiteIntelDrawer header must contain live API indicator badge');
});

test('SiteComparisonMatrixModal: loads and displays dynamic landing sites', () => {
  const html = renderToStaticMarkup(
    <SiteComparisonMatrixModal
      isOpen={true}
      onClose={() => {}}
      selectedSiteId="malapert-massif"
      onSelectSite={() => {}}
    />
  );
  assert.ok(html.includes('Comparison Matrix'), 'Must render modal title');
  assert.ok(html.includes('Malapert Mountain') || html.includes('SITE-005'), 'Must render landing site name or code');
  assert.ok(html.includes('data-testid="modal-api-status"'), 'Must render API status badge in modal header');
});

test('HeaderStatusControls: renders live REST API telemetry status badge', () => {
  const html = renderToStaticMarkup(
    <HeaderStatusControls
      isDemoMode={false}
      onOpenProvenance={() => {}}
      onOpenGuide={() => {}}
    />
  );
  assert.ok(html.includes('data-testid="header-api-status"'), 'Must render API status badge in header');
});
