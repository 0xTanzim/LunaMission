import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComparisonDecisionSummary } from '../components/ComparisonDecisionSummary';
import type { RankedFeasibleCandidate } from '@luna/contracts';

describe('ComparisonDecisionSummary Component', () => {
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
    {
      rank: 3,
      siteId: 'site-malapert',
      siteName: 'Malapert Massif',
      entityType: 'research_candidate_point',
      coordinates: { latitudeDeg: -86.0, longitudeEastDeg: 2.7, elevationMeters: 5000, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
      metrics: {
        longestContinuousSunlightHours: 160.0,
        maxContinuousDarknessHours: 16.0,
        cumulativeSunlitHours: 210.0,
        solarAccessPercentage: 62.5,
        cumulativeDteHours: 320.0,
        dteAccessPercentage: 95.2,
        cumulativeOverlapHours: 155.0,
        landingSlopeDeg: 4.2,
        terrainUncertaintySpanHours: 3.8,
      },
      sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 160.0, tieBroken: false }],
    },
  ];

  it('reads the lead candidate one observable at a time, never as a composite score', () => {
    const html = renderToStaticMarkup(
      <ComparisonDecisionSummary
        rankedCandidates={mockCandidates}
        onPromotePrimary={() => {}}
      />,
    );

    expect(html).toContain('Lead candidate');
    expect(html).toContain('Rank 1 of 3');
    expect(html).toContain('Connecting Ridge CR01');

    // The four observables stay separate quantities, each with its own unit.
    expect(html).toContain('Longest continuous sunlight');
    expect(html).toContain('Longest continuous darkness');
    expect(html).toContain('Earth line-of-sight (geometric)');
    expect(html).toContain('Landing slope');
    expect(html).toContain('190.0');
    expect(html).toContain('6.5');

    // No blended score vocabulary.
    expect(html).not.toContain('composite score');
    expect(html).not.toContain('out of 100');
  });

  it('names the site that leads each observable the leader does not', () => {
    const html = renderToStaticMarkup(
      <ComparisonDecisionSummary rankedCandidates={mockCandidates} />,
    );

    expect(html).toContain('Another site leads on');
    expect(html).toContain('Shackleton Rim Peak');
    expect(html).toContain('280.0');
    // Malapert is published as "Malapert Massif" and shown as one unified name.
    expect(html).toContain('Malapert Mountain');
    expect(html).toContain('320.0');
  });

  it('marks the sole survivor as the only site to clear the vehicle limits', () => {
    const html = renderToStaticMarkup(
      <ComparisonDecisionSummary
        rankedCandidates={[mockCandidates[0]]}
        onPromotePrimary={() => {}}
      />,
    );

    expect(html).toContain('Rank 1 of 1');
    expect(html).toContain('The only site that cleared the vehicle limits');
    expect(html).toContain('Connecting Ridge CR01');
    expect(html).not.toContain('cohort best');
    expect(html).not.toContain('Another site leads on');
  });

  it('returns null when no candidates are provided', () => {
    const html = renderToStaticMarkup(<ComparisonDecisionSummary rankedCandidates={[]} />);
    expect(html).toBe('');
  });
});
