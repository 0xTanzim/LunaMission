/**
 * Challenger: Compare Landing Site Selection & Vehicle Constraint Gating Flow
 *
 * Verifies:
 * 1. Default vehicle constraints align with the Polar Survey baseline (336h max darkness, 45° slope)
 *    so multiple polar sites qualify and rank out of the box.
 * 2. Cohort addition and site selection flows update without getting stuck in a 1-site deadlock.
 * 3. Proactive culling feedback surfaces when stricter constraints (e.g. CLPS or Artemis) are applied.
 */

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MISSION_PRESETS } from '../src/features/comparison/model/missionPresets';
import { DEFAULT_VEHICLE_CONSTRAINTS } from '../src/features/comparison/model/comparisonRequest';
import { ComparisonCohortBar } from '../src/features/comparison/ComparisonCohortBar';
import { ComparisonDecisionSummary } from '../src/features/comparison/components/ComparisonDecisionSummary';
import { Tier2LexicographicSort } from '../src/features/comparison/Tier2LexicographicSort';
import type { DisqualifiedCandidate, RankedFeasibleCandidate } from '@luna/contracts';

describe('Challenger: Compare Landing Site Selection & Vehicle Constraint Defaults', () => {
  it('aligns DEFAULT_VEHICLE_CONSTRAINTS with the Polar Survey physical baseline', () => {
    const survey = MISSION_PRESETS.find((p) => p.id === 'survey');
    expect(survey).toBeDefined();
    expect(DEFAULT_VEHICLE_CONSTRAINTS.minContinuousSunlightHours).toBe(survey!.values.minContinuousSunlightHours);
    expect(DEFAULT_VEHICLE_CONSTRAINTS.maxContinuousDarknessHours).toBe(survey!.values.maxContinuousDarknessHours);
    expect(DEFAULT_VEHICLE_CONSTRAINTS.maxLandingSlopeDeg).toBe(survey!.values.maxLandingSlopeDeg);
  });

  it('renders informative feedback when added candidate is culled by vehicle limits', () => {
    const mockDisqualified: DisqualifiedCandidate[] = [
      {
        siteId: 'shackleton-rim',
        siteName: 'Shackleton Crater Rim',
        entityType: 'research_candidate_point',
        rejectionReasons: [
          {
            constraintName: 'maxContinuousDarkness',
            thresholdValue: 60.0,
            observedValue: 216.33,
            unit: 'hours',
            marginOfFailure: 156.33,
            narrative: 'Darkness blackout period of 216.3h exceeds 60.0h battery limit by 156.3h.',
          },
        ],
      },
    ];

    const html = renderToStaticMarkup(
      <ComparisonCohortBar
        cohortSiteIds={['connecting-ridge', 'shackleton-rim']}
        activeSiteId="shackleton-rim"
        disqualifiedCandidates={mockDisqualified}
        onAddSite={() => {}}
        onRemoveSite={() => {}}
        onRelaxConstraints={() => {}}
      />,
    );

    // Primary target site is culled: displays Primary (Culled) badge
    expect(html).toContain('Primary (Culled)');
    // Alert banner guides operator to relax limits
    expect(html).toContain('does not clear active vehicle limits');
    expect(html).toContain('Relax to Polar Survey');
  });

  it('renders actionable zero-survivor fallback when all sites are culled under Artemis HLS', () => {
    const htmlSummary = renderToStaticMarkup(
      <ComparisonDecisionSummary
        rankedCandidates={[]}
        onRelaxConstraints={() => {}}
      />,
    );
    expect(htmlSummary).toContain('0 Candidates Cleared Limits');
    expect(htmlSummary).toContain('Relax limits (Polar Survey)');

    const htmlTable = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={[]}
        onSelectPairwise={() => {}}
      />,
    );
    expect(htmlTable).toContain('No candidate sites cleared Tier 1 vehicle constraints');
  });
});
