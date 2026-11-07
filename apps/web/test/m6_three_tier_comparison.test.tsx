import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tier1VehicleGating } from '../src/features/comparison/Tier1VehicleGating';
import { Tier2LexicographicSort } from '../src/features/comparison/Tier2LexicographicSort';
import { Tier3PairwiseDeltaMatrix } from '../src/features/comparison/Tier3PairwiseDeltaMatrix';
import type { DisqualifiedCandidate, RankedFeasibleCandidate, Tier3PairwiseDelta } from '@luna/contracts';

describe('Milestone M6: Three-Tiered Comparison Matrix', () => {
  const mockDisqualified: DisqualifiedCandidate[] = [
    {
      siteId: 'shackleton-floor',
      siteName: 'Shackleton Crater Floor (PSR)',
      entityType: 'negative_control',
      rejectionReasons: [
        {
          constraintName: 'minContinuousSunlight',
          thresholdValue: 120.0,
          observedValue: 0.0,
          unit: 'hours',
          marginOfFailure: 120.0,
          narrative: 'Zero solar illumination due to permanent deep crater rim occlusion.',
        },
      ],
    },
    {
      siteId: 'amundsen-rim',
      siteName: 'Amundsen Rim Crest',
      entityType: 'candidate_region',
      rejectionReasons: [
        {
          constraintName: 'maxContinuousDarkness',
          thresholdValue: 16.0,
          observedValue: 24.5,
          unit: 'hours',
          marginOfFailure: 8.5,
          narrative: 'Dark shadow blackout period of 24.5h exceeds 16.0h battery limit by 8.5h.',
        },
      ],
    },
  ];

  const mockRanked: RankedFeasibleCandidate[] = [
    {
      rank: 1,
      siteId: 'connecting-ridge',
      siteName: 'Connecting Ridge CR01',
      entityType: 'research_candidate_point',
      coordinates: { latitudeDeg: -89.527, longitudeEastDeg: 205.408, elevationMeters: 2085, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
      metrics: {
        longestContinuousSunlightHours: 182.5,
        maxContinuousDarknessHours: 14.2,
        cumulativeSunlitHours: 214.3,
        solarAccessPercentage: 74.4,
        cumulativeDteHours: 198.0,
        dteAccessPercentage: 68.8,
        cumulativeOverlapHours: 164.5,
        landingSlopeDeg: 4.8,
        terrainUncertaintySpanHours: 3.2,
      },
      sortKeyTrace: [
        { metric: 'longestContinuousSunlight', value: 182.5, tieBroken: false },
        { metric: 'maxContinuousDarkness', value: 14.2, tieBroken: false },
        { metric: 'cumulativeOverlapHours', value: 164.5, tieBroken: false },
      ],
    },
    {
      rank: 2,
      siteId: 'peak-near-shackleton',
      siteName: 'Peak Near Shackleton SP-1',
      entityType: 'research_candidate_point',
      coordinates: { latitudeDeg: -89.7, longitudeEastDeg: 120.0, elevationMeters: 1850, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
      metrics: {
        longestContinuousSunlightHours: 181.8,
        maxContinuousDarknessHours: 15.8,
        cumulativeSunlitHours: 205.1,
        solarAccessPercentage: 71.2,
        cumulativeDteHours: 210.5,
        dteAccessPercentage: 73.1,
        cumulativeOverlapHours: 152.0,
        landingSlopeDeg: 6.2,
        terrainUncertaintySpanHours: 6.8,
      },
      sortKeyTrace: [
        { metric: 'longestContinuousSunlight', value: 181.8, tieBroken: true },
        { metric: 'maxContinuousDarkness', value: 15.8, tieBroken: true },
        { metric: 'cumulativeOverlapHours', value: 152.0, tieBroken: false },
      ],
    },
  ];

  const mockPairwise: Tier3PairwiseDelta = {
    siteA: { siteId: 'connecting-ridge', siteName: 'Connecting Ridge CR01' },
    siteB: { siteId: 'peak-near-shackleton', siteName: 'Peak Near Shackleton SP-1' },
    deltas: [
      {
        metricKey: 'longestContinuousSunlight',
        metricLabel: 'Longest Continuous Sunlight',
        unit: 'hours',
        valueA: 182.5,
        valueB: 181.8,
        absoluteDelta: 0.7,
        percentDelta: 0.4,
        favoredSite: 'siteA',
        operationalSignificance: 'Site A provides slightly longer uninterrupted solar power generation.',
      },
      {
        metricKey: 'cumulativeDteHours',
        metricLabel: 'Direct-to-Earth (DTE) Comms',
        unit: 'hours',
        valueA: 198.0,
        valueB: 210.5,
        absoluteDelta: -12.5,
        percentDelta: -5.9,
        favoredSite: 'siteB',
        operationalSignificance: 'Site B provides 12.5h more communication coverage with DSN.',
      },
    ],
    terrainSensitivityComparison: {
      uncertaintySpanHoursA: 3.2,
      uncertaintySpanHoursB: 6.8,
      whiskerRatio: 2.1,
      lowerRiskSite: 'siteA',
    },
    objectiveTradeOffNarrative:
      'Connecting Ridge CR01 provides lower terrain uncertainty risk (2.1x lower), while Peak Near Shackleton SP-1 provides 12.5h more Direct-to-Earth communication.',
  };

  it('renders Tier 1 vehicle constraint gating with disqualified cards and positive marginOfFailure', () => {
    const html = renderToStaticMarkup(
      <Tier1VehicleGating
        totalEvaluatedSites={10}
        feasibleSitesCount={2}
        disqualifiedSitesCount={8}
        disqualifiedCandidates={mockDisqualified}
      />,
    );

    expect(html).toContain('Tier 1 — Can the vehicle survive here?');
    expect(html).toContain('2 Feasible');
    expect(html).toContain('8 Disqualified');
    expect(html).toContain('data-testid="disqualified-card-shackleton-floor"');
    expect(html).toContain('+120.0 hours margin');
    expect(html).toContain('+8.5 hours margin');
  });

  it('renders Tier 2 lexicographic priority ranking with tie indicators and traces', () => {
    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={mockRanked}
        selectedSiteAId="connecting-ridge"
        selectedSiteBId="peak-near-shackleton"
        onSelectPairwise={() => {}}
      />,
    );

    expect(html).toContain('Tier 2 — Rank the survivors');
    expect(html).toContain('#1');
    expect(html).toContain('#2');
    expect(html).toContain('TIE RESOLVED');
    expect(html).toContain('data-testid="ranked-row-connecting-ridge"');
  });

  it('renders Tier 3 Focused Pairwise Delta Matrix with whisker ratio and zero composite score', () => {
    const html = renderToStaticMarkup(<Tier3PairwiseDeltaMatrix pairwiseDelta={mockPairwise} />);

    expect(html).toContain('data-testid="tier3-pairwise-matrix"');
    expect(html).toContain('ZERO COMPOSITE SCORE');
    expect(html).toContain('FAVOR SITE A');
    expect(html).toContain('FAVOR SITE B');
    expect(html).toContain('2.1×');
    expect(html).toContain('Lower Risk: Connecting Ridge CR01');
    expect(html).toContain('Connecting Ridge CR01 provides lower terrain uncertainty risk');

    // Verify ZERO TOPSIS or single composite score
    expect(html).not.toContain('TOPSIS');
    expect(html).not.toContain('Composite Score');
  });

  it('renders fallback when pairwiseDelta is null (< 2 feasible sites)', () => {
    const html = renderToStaticMarkup(<Tier3PairwiseDeltaMatrix pairwiseDelta={null} />);
    expect(html).toContain('Fewer than 2 feasible candidates passed');
  });
});
