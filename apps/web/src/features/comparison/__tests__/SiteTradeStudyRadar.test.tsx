import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SiteTradeStudyRadar } from '../components/SiteTradeStudyRadar';
import type { RankedFeasibleCandidate } from '@luna/contracts';

describe('SiteTradeStudyRadar Component', () => {
  const mockCandidates: RankedFeasibleCandidate[] = [
    {
      rank: 1,
      siteId: 'site-cr',
      siteName: 'Connecting Ridge CR01',
      entityType: 'research_candidate_point',
      coordinates: { latitudeDeg: -89.5, longitudeEastDeg: 200.0, elevationMeters: 1800, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
      metrics: {
        longestContinuousSunlightHours: 190.0,
        maxContinuousDarknessHours: 12.0,
        cumulativeSunlitHours: 240.0,
        solarAccessPercentage: 71.4,
        cumulativeDteHours: 200.0,
        dteAccessPercentage: 59.5,
        cumulativeOverlapHours: 180.0,
        landingSlopeDeg: 6.5,
        terrainUncertaintySpanHours: 2.5,
      },
      sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 190.0, tieBroken: false }],
    },
    {
      rank: 2,
      siteId: 'site-shackleton',
      siteName: 'Shackleton Rim Peak',
      entityType: 'research_candidate_point',
      coordinates: { latitudeDeg: -89.9, longitudeEastDeg: 0.0, elevationMeters: 1200, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
      metrics: {
        longestContinuousSunlightHours: 280.0,
        maxContinuousDarknessHours: 8.0,
        cumulativeSunlitHours: 300.0,
        solarAccessPercentage: 89.2,
        cumulativeDteHours: 150.0,
        dteAccessPercentage: 44.6,
        cumulativeOverlapHours: 140.0,
        landingSlopeDeg: 12.0,
        terrainUncertaintySpanHours: 3.2,
      },
      sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 280.0, tieBroken: false }],
    },
  ];

  it('renders SVG radar chart and WCAG 2.1 AA accessible screen reader table', () => {
    const html = renderToStaticMarkup(
      <SiteTradeStudyRadar
        rankedCandidates={mockCandidates}
        totalEvaluationHours={336.0}
      />,
    );

    // SVG element with role="img"
    expect(html).toContain('role="img"');
    expect(html).toContain('polygon');
    expect(html).toContain('Continuous Sun');
    expect(html).toContain('Darkness Survival');
    expect(html).toContain('Earth LoS');
    expect(html).toContain('Slope Safety');
    expect(html).toContain('Elevation Advantage');

    // Screen reader accessible table
    expect(html).toContain('<table');
    expect(html).toContain('Connecting Ridge CR01');
    expect(html).toContain('Shackleton Rim Peak');
  });

  it('renders empty message when no feasible candidates survive', () => {
    const html = renderToStaticMarkup(
      <SiteTradeStudyRadar
        rankedCandidates={[]}
        totalEvaluationHours={336.0}
      />,
    );
    expect(html).toContain('No feasible candidate landing sites available for radar comparison');
  });
});
