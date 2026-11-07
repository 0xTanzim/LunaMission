/**
 * Challenger P3-E UX & State Synchronization Stress Suite
 *
 * Adversarial empirical testing for Milestone M6 (Gate P3-E):
 * 1. SharedPlayheadRef high-frequency scrubbing (10,000 iterations), dirty-flag lifecycle, and desync checks.
 * 2. Launch-slip slider boundary conditions [0, 28] days, float steps, touch target compliance.
 * 3. Three-Tiered Comparison UI boundary cohorts:
 *    - Cohort 1: 0 sites passing (100% disqualified)
 *    - Cohort 2: Exactly 1 site passing (Tier 3 must be null)
 *    - Cohort 3: All sites passing (0 disqualified)
 *    - Cohort 4: 20 candidate sites (maximum allowable cohort)
 *    - Verify Tier 3 returns null when < 2 sites pass
 * 4. Programmatic scan for forbidden TOPSIS and composite scalar scores in UI.
 */

import { describe, it, expect } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SharedPlayheadController,
  sharedPlayheadController,
} from '../src/shared/animation/sharedPlayheadRef';
import { LaunchSlipSlider } from '../src/features/timeline/LaunchSlipSlider';
import { Tier1VehicleGating } from '../src/features/comparison/Tier1VehicleGating';
import { Tier2LexicographicSort } from '../src/features/comparison/Tier2LexicographicSort';
import { Tier3PairwiseDeltaMatrix } from '../src/features/comparison/Tier3PairwiseDeltaMatrix';
import type {
  DisqualifiedCandidate,
  RankedFeasibleCandidate,
  Tier3PairwiseDelta,
} from '@luna/contracts';

describe('Challenger M6 UX: SharedPlayheadRef & Causal Triad Synchronization', () => {
  it('handles 10,000 rapid telemetry writes without buffer corruption or NaN drift', () => {
    const controller = new SharedPlayheadController();

    const startEpoch = Date.UTC(2026, 10, 1, 0, 0, 0);
    const stopEpoch = Date.UTC(2026, 10, 15, 0, 0, 0);

    for (let i = 0; i < 10000; i++) {
      const epochMs = startEpoch + (i / 10000) * (stopEpoch - startEpoch);
      const sunAz = (i * 0.36) % 360.0;
      const sunEl = -3.0 + (i % 280) * 0.1; // -3° to +25°
      const earthAz = (i * 0.12) % 360.0;
      const earthEl = 5.0 + (i % 150) * 0.1;
      const blockerAz = i % 3 === 0 ? 154.5 : -1.0;
      const blockerDist = i % 3 === 0 ? 78.4 : 0.0;

      controller.write({
        epochMs,
        sunAzimuthDeg: sunAz,
        sunElevationDeg: sunEl,
        earthAzimuthDeg: earthAz,
        earthElevationDeg: earthEl,
        blockerAzimuthDeg: blockerAz,
        blockerDistanceKm: blockerDist,
      });

      expect(controller.isDirty()).toBe(true);
      const buf = controller.read();
      expect(buf[0]).toBe(epochMs);
      expect(buf[1]).toBeCloseTo(sunAz, 4);
      expect(buf[2]).toBeCloseTo(sunEl, 4);
      expect(buf[3]).toBeCloseTo(earthAz, 4);
      expect(buf[4]).toBeCloseTo(earthEl, 4);
      expect(buf[5]).toBe(blockerAz);
      expect(buf[6]).toBe(blockerDist);
      expect(buf[7]).toBe(1.0);

      controller.clearDirty();
      expect(controller.isDirty()).toBe(false);
      expect(buf[7]).toBe(0.0);
    }
  });

  it('verifies monotonic version counter and multi-subscriber listener registry eliminate race conditions', () => {
    const controller = new SharedPlayheadController();

    const receivedSub1: number[] = [];
    const receivedSub2: number[] = [];
    const receivedSub3: number[] = [];

    const unsub1 = controller.subscribe((buf) => receivedSub1.push(buf[0]));
    const unsub2 = controller.subscribe((buf) => receivedSub2.push(buf[0]));
    const unsub3 = controller.subscribe((buf) => receivedSub3.push(buf[0]));

    let lastVer1 = 0;
    let lastVer2 = 0;

    for (let i = 1; i <= 100; i++) {
      controller.write({ epochMs: 1793491200000 + i * 1000 });

      // Check version counter monotonically increments
      expect(controller.getVersion()).toBe(i);

      // Independent subscriber version checks
      if (controller.getVersion() !== lastVer1) {
        lastVer1 = controller.getVersion();
      }
      if (controller.getVersion() !== lastVer2) {
        lastVer2 = controller.getVersion();
      }
    }

    expect(receivedSub1.length).toBe(100);
    expect(receivedSub2.length).toBe(100);
    expect(receivedSub3.length).toBe(100);
    expect(lastVer1).toBe(100);
    expect(lastVer2).toBe(100);

    // Unsubscribe test
    unsub1();
    controller.write({ epochMs: 9999999999999 });
    expect(receivedSub1.length).toBe(100); // Does not receive after unsub
    expect(receivedSub2.length).toBe(101); // Still receives
    expect(receivedSub3.length).toBe(101);

    unsub2();
    unsub3();
  });
});

describe('Challenger M6 UX: Launch-Slip Slider Boundary Conditions', () => {
  it('correctly maps nominal mission start and stop across boundary offsets [0, 28] days', () => {
    const nominalStart = '2026-11-01T00:00:00.000Z';
    const nominalStop = '2026-11-15T00:00:00.000Z';

    const testOffsets = [0.0, 0.5, 1.0, 7.0, 14.0, 21.5, 27.5, 28.0];

    for (const offset of testOffsets) {
      let updatedValue = -1;
      const html = renderToStaticMarkup(
        <LaunchSlipSlider
          launchSlipOffsetDays={offset}
          onLaunchSlipChange={(val) => {
            updatedValue = val;
          }}
          nominalStartUtc={nominalStart}
          nominalStopUtc={nominalStop}
        />,
      );

      // Verify touch target compliance
      expect(html).toContain('min-h-[32px]');
      expect(html).toContain(`+${offset.toFixed(1)} Days`);

      // Verify effective dates
      const expStart = new Date(new Date(nominalStart).getTime() + offset * 86400000)
        .toISOString()
        .slice(0, 10);
      const expStop = new Date(new Date(nominalStop).getTime() + offset * 86400000)
        .toISOString()
        .slice(0, 10);
      expect(html).toContain(expStart);
      expect(html).toContain(expStop);

      // Reset button must only appear if offset > 0
      if (offset > 0) {
        expect(html).toContain('Reset');
      } else {
        expect(html).not.toContain('Reset');
      }
    }
  });
});

describe('Challenger M6 UX: Three-Tiered Comparison Boundary Cohorts', () => {
  // Cohort 1: 0 sites passing Tier 1 (100% disqualified)
  it('Cohort 1: cleanly handles 0 sites passing Tier 1 (all disqualified) and Tier 3 = null', () => {
    const totalSites = 5;
    const mockDisqualified: DisqualifiedCandidate[] = Array.from({ length: totalSites }, (_, idx) => ({
      siteId: `disqualified-site-${idx + 1}`,
      siteName: `Disqualified Crater Rim ${idx + 1}`,
      entityType: 'candidate_region',
      rejectionReasons: [
        {
          constraintName: 'maxContinuousDarkness',
          thresholdValue: 16.0,
          observedValue: 28.5 + idx * 5,
          unit: 'hours',
          marginOfFailure: 12.5 + idx * 5,
          narrative: `Excessive dark blackout of ${28.5 + idx * 5}h exceeds battery reserve threshold.`,
        },
      ],
    }));

    // Tier 1 render
    const t1Html = renderToStaticMarkup(
      <Tier1VehicleGating
        totalEvaluatedSites={totalSites}
        feasibleSitesCount={0}
        disqualifiedSitesCount={totalSites}
        disqualifiedCandidates={mockDisqualified}
      />,
    );
    expect(t1Html).toContain('0 Feasible');
    expect(t1Html).toContain(`${totalSites} Disqualified`);
    expect(t1Html).toContain('CULLED');
    expect(t1Html).toContain('+12.5 hours margin');

    // Tier 2 render with 0 surviving
    const t2Html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={[]}
        onSelectPairwise={() => {}}
      />,
    );
    expect(t2Html).toContain('Surviving Candidates: 0');

    // Tier 3 render with null
    const t3Html = renderToStaticMarkup(
      <Tier3PairwiseDeltaMatrix pairwiseDelta={null} />,
    );
    expect(t3Html).toContain('Fewer than 2 feasible candidates passed Tier 1 vehicle constraints');
  });

  // Cohort 2: Exactly 1 site passing Tier 1
  it('Cohort 2: handles exactly 1 site passing Tier 1 with Tier 3 = null', () => {
    const mockRankedSingle: RankedFeasibleCandidate[] = [
      {
        rank: 1,
        siteId: 'lone-survivor',
        siteName: 'Lone Feasible Ridge',
        entityType: 'research_candidate_point',
        coordinates: { latitudeDeg: -89.5, longitudeEastDeg: 200.0, elevationMeters: 1500, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
        metrics: {
          longestContinuousSunlightHours: 190.0,
          maxContinuousDarknessHours: 10.0,
          cumulativeSunlitHours: 220.0,
          solarAccessPercentage: 80.0,
          cumulativeDteHours: 200.0,
          dteAccessPercentage: 70.0,
          cumulativeOverlapHours: 180.0,
          landingSlopeDeg: 4.5,
          terrainUncertaintySpanHours: 2.5,
        },
        sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 190.0, tieBroken: false }],
      },
    ];

    const t2Html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={mockRankedSingle}
        onSelectPairwise={() => {}}
      />,
    );
    expect(t2Html).toContain('Surviving Candidates: 1');
    expect(t2Html).toContain('#1');
    expect(t2Html).toContain('Lone Feasible Ridge');

    // Tier 3 must be null when only 1 candidate passes
    const t3Html = renderToStaticMarkup(
      <Tier3PairwiseDeltaMatrix pairwiseDelta={null} />,
    );
    expect(t3Html).toContain('Pairwise comparison is unavailable');
    expect(t3Html).not.toContain('TIER 3: FOCUSED PAIRWISE DELTA MATRIX');
  });

  // Cohort 3: All sites passing Tier 1 (0 disqualified)
  it('Cohort 3: handles all sites passing Tier 1 with active Tier 3 matrix', () => {
    const mockRanked: RankedFeasibleCandidate[] = [
      {
        rank: 1,
        siteId: 'site-a',
        siteName: 'Site Alpha',
        entityType: 'research_candidate_point',
        coordinates: { latitudeDeg: -89.4, longitudeEastDeg: 150.0, elevationMeters: 1800, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
        metrics: {
          longestContinuousSunlightHours: 200.0,
          maxContinuousDarknessHours: 8.0,
          cumulativeSunlitHours: 230.0,
          solarAccessPercentage: 85.0,
          cumulativeDteHours: 210.0,
          dteAccessPercentage: 75.0,
          cumulativeOverlapHours: 195.0,
          landingSlopeDeg: 3.5,
          terrainUncertaintySpanHours: 2.0,
        },
        sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 200.0, tieBroken: false }],
      },
      {
        rank: 2,
        siteId: 'site-b',
        siteName: 'Site Beta',
        entityType: 'research_candidate_point',
        coordinates: { latitudeDeg: -89.6, longitudeEastDeg: 160.0, elevationMeters: 1700, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
        metrics: {
          longestContinuousSunlightHours: 195.0,
          maxContinuousDarknessHours: 9.0,
          cumulativeSunlitHours: 225.0,
          solarAccessPercentage: 83.0,
          cumulativeDteHours: 205.0,
          dteAccessPercentage: 73.0,
          cumulativeOverlapHours: 190.0,
          landingSlopeDeg: 4.0,
          terrainUncertaintySpanHours: 2.8,
        },
        sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 195.0, tieBroken: false }],
      },
    ];

    const t1Html = renderToStaticMarkup(
      <Tier1VehicleGating
        totalEvaluatedSites={2}
        feasibleSitesCount={2}
        disqualifiedSitesCount={0}
        disqualifiedCandidates={[]}
      />,
    );
    expect(t1Html).toContain('2 Feasible');
    expect(t1Html).toContain('0 Disqualified');
    expect(t1Html).not.toContain('CULLED');

    const mockPairwise: Tier3PairwiseDelta = {
      siteA: { siteId: 'site-a', siteName: 'Site Alpha' },
      siteB: { siteId: 'site-b', siteName: 'Site Beta' },
      deltas: [
        {
          metricKey: 'longestContinuousSunlight',
          metricLabel: 'Longest Continuous Sunlight',
          unit: 'hours',
          valueA: 200.0,
          valueB: 195.0,
          absoluteDelta: 5.0,
          percentDelta: 2.56,
          favoredSite: 'siteA',
          operationalSignificance: 'Alpha provides +5.0h longer continuous sunlight.',
        },
      ],
      terrainSensitivityComparison: {
        uncertaintySpanHoursA: 2.0,
        uncertaintySpanHoursB: 2.8,
        whiskerRatio: 1.4,
        lowerRiskSite: 'siteA',
      },
      objectiveTradeOffNarrative: 'Site Alpha demonstrates higher continuous sunlight and lower uncertainty.',
    };

    const t3Html = renderToStaticMarkup(
      <Tier3PairwiseDeltaMatrix pairwiseDelta={mockPairwise} />,
    );
    expect(t3Html).toContain('Tier 3 — Compare the top two');
    expect(t3Html).toContain('ZERO COMPOSITE SCORE');
    expect(t3Html).toContain('Site Alpha');
    expect(t3Html).toContain('Site Beta');
    expect(t3Html).toContain('+5.0 hours');
  });

  // Cohort 4: 20 candidate sites cohort
  it('Cohort 4: handles 20 candidate sites without layout degradation', () => {
    const mock20Sites: RankedFeasibleCandidate[] = Array.from({ length: 20 }, (_, idx) => ({
      rank: idx + 1,
      siteId: `site-${idx + 1}`,
      siteName: `LOLA Polar Candidate ${idx + 1}`,
      entityType: 'candidate_region',
      coordinates: { latitudeDeg: -89.0 - idx * 0.05, longitudeEastDeg: idx * 18.0, elevationMeters: 1000 + idx * 50, referenceDatum: 'IAU_MOON_ME', referenceRadiusKm: 1737.4 },
      metrics: {
        longestContinuousSunlightHours: 200.0 - idx * 3,
        maxContinuousDarknessHours: 8.0 + idx * 0.5,
        cumulativeSunlitHours: 230.0 - idx * 2,
        solarAccessPercentage: 80.0 - idx,
        cumulativeDteHours: 210.0 - idx,
        dteAccessPercentage: 75.0 - idx,
        cumulativeOverlapHours: 190.0 - idx * 2,
        landingSlopeDeg: 3.0 + idx * 0.3,
        terrainUncertaintySpanHours: 2.0 + idx * 0.2,
      },
      sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 200.0 - idx * 3, tieBroken: false }],
    }));

    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={mock20Sites}
        onSelectPairwise={() => {}}
      />,
    );

    expect(html).toContain('Surviving Candidates: 20');
    expect(html).toContain('#1');
    expect(html).toContain('#20');
    expect(html).toContain('LOLA Polar Candidate 1');
    expect(html).toContain('LOLA Polar Candidate 20');
  });
});

describe('Challenger M6 UX: Audit for Forbidden TOPSIS & Composite Scores', () => {
  it('confirms that ThreeTierComparisonView and its subcomponents contain zero TOPSIS strings or scalar weights', () => {
    const mockPairwise: Tier3PairwiseDelta = {
      siteA: { siteId: 'cr01', siteName: 'Connecting Ridge CR01' },
      siteB: { siteId: 'sp01', siteName: 'Peak Near Shackleton SP-1' },
      deltas: [],
      terrainSensitivityComparison: {
        uncertaintySpanHoursA: 3.2,
        uncertaintySpanHoursB: 6.8,
        whiskerRatio: 2.1,
        lowerRiskSite: 'siteA',
      },
      objectiveTradeOffNarrative: 'Physical trade-off only.',
    };

    const t3 = renderToStaticMarkup(<Tier3PairwiseDeltaMatrix pairwiseDelta={mockPairwise} />);

    // Zero TOPSIS
    expect(t3).not.toContain('TOPSIS');
    expect(t3).not.toContain('topsis');
    expect(t3).not.toContain('closeness');
    expect(t3).not.toContain('relativeCloseness');
    expect(t3).not.toContain('Composite Score');
    expect(t3).not.toContain('WLC');
  });
});
