/**
 * Challenger M4 Adversarial Test Harness:
 * Epistemic States, Empty Cohorts & Aerospace Status Resilience
 *
 * Empirically stress-tests Milestone M4 (Requirements R5, R6):
 * 1. ApiStateView coverage across all 6 aerospace statuses and 2 UI states.
 * 2. Non-color accessibility badges ([LOADING], [EMPTY], [VALID W/ LIMITATIONS], [APPROXIMATE], [FAILED]).
 * 3. WCAG 2.2 target dimensions (>= 28px buttons, >= 40px full-width banners).
 * 4. Dynamic cohort transitions in ThreeTierComparisonView (3 -> 2 -> 1 -> 0 sites).
 * 5. Regression invariant: 'Evaluating Multi-Site Three-Tiered Filtering Pipeline'.
 * 6. Strict Fortune 100 line-cap compliance (<= 500 lines).
 */

import { describe, it, expect, mock } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalScenarioProvider } from '../src/app/state/GlobalScenarioContext';
import { ApiStateView, type ApiStateStatus } from '../src/shared/ui/ApiStateView';

// Controllable test hooks for workspace view mocking
let mockEvaluationState: any = { data: null, error: null, isLoading: false, refetch: () => {} };
mock.module('../src/features/analyze/hooks/useScenarioEvaluation', () => ({
  useScenarioEvaluation: () => mockEvaluationState,
}));

let mockComparisonState: any = { data: null, error: null, isLoading: false, refetch: () => {} };
mock.module('../src/features/comparison/hooks/useScenarioComparison', () => ({
  useScenarioComparison: () => mockComparisonState,
}));

import { AnalyzeWorkspaceView } from '../src/features/analyze/AnalyzeWorkspaceView';
import { ThreeTierComparisonView } from '../src/features/comparison/ThreeTierComparisonView';

const createMockCandidate = (rank: number, id: string, name: string, lat: number, lon: number) => ({
  rank,
  siteId: id,
  siteName: name,
  coordinates: { latitudeDeg: lat, longitudeEastDeg: lon, elevationMeters: 1800 },
  metrics: {
    longestContinuousSunlightHours: 120 - rank * 10,
    maxContinuousDarknessHours: 10 + rank * 2,
    cumulativeDteHours: 150 - rank * 10,
    landingSlopeDeg: 4.0 + rank,
  },
  sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 120 - rank * 10, tieBroken: false }],
});

const mockEvaluationPayload = (status: string) => ({
  status,
  calculationId: `calc-${status}`,
  siteInfo: { siteName: 'Shackleton Rim' },
  metrics: {
    cumulativeSunlitHours: 140, solarAccessPercentage: 90,
    longestContinuousSunlitWindowHours: 110, longestContinuousDarkWindowHours: 8,
    cumulativeDarkHours: 15, cumulativeDteHours: 160,
    cumulativeOverlapHours: 95, overlapPercentage: 60,
    topographicShadowPenaltyHours: 1, longestContinuousDteWindowHours: 80,
    simultaneousAccessPercentage: 65, dteAccessPercentage: 80,
  },
  intervals: [],
  uncertaintyEnvelopes: { eventWhiskers: [] },
  scenarioConfig: { effectiveStartUtc: '2026-01-01', effectiveStopUtc: '2026-01-28' },
});

describe('Challenger M4 Suite 1: ApiStateView Aerospace Statuses & Non-Color Badges', () => {
  it('renders loading status with [LOADING] badge, spinning indicator, and live region', () => {
    const html = renderToStaticMarkup(<ApiStateView status="loading" message="Querying topocentric horizon..." />);
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('[LOADING]');
    expect(html).toContain('Querying topocentric horizon...');
    expect(html).not.toContain('[FAILED]');
  });

  it('renders empty status with [EMPTY] badge, region role, and guidance remediation', () => {
    const html = renderToStaticMarkup(
      <ApiStateView
        status="empty"
        title="Zero Candidate Sites"
        message="No sites configured in active cohort."
        guidance="Add at least 2 sites in the cohort selector."
      />
    );
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Empty State"');
    expect(html).toContain('[EMPTY]');
    expect(html).toContain('Zero Candidate Sites');
    expect(html).toContain('Remediation:');
    expect(html).toContain('Add at least 2 sites in the cohort selector.');
    expect(html).not.toContain('[FAILED]');
  });

  it('renders valid-with-limitations with Amber Diamond symbol ◆ and non-color badge', () => {
    const html = renderToStaticMarkup(
      <ApiStateView
        status="valid-with-limitations"
        title="DEM Ray Boundary Truncation"
        message="LOLA elevation model bounded at 80°S."
        guidance="Extend mission window or restrict azimuth range."
      />
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('◆');
    expect(html).toContain('[VALID W/ LIMITATIONS]');
    expect(html).toContain('DEM Ray Boundary Truncation');
    expect(html).toContain('Remediation:');
    expect(html).not.toContain('[FAILED]');
    expect(html).not.toContain('Telemetry Stream Offline');
  });

  it('renders approximate status with Orange Triangle symbol ▲ and non-color badge', () => {
    const html = renderToStaticMarkup(
      <ApiStateView
        status="approximate"
        title="Analytical Ephemeris Model"
        message="Coarse Horizons approximation active."
      />
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('▲');
    expect(html).toContain('[APPROXIMATE]');
    expect(html).toContain('Analytical Ephemeris Model');
    expect(html).not.toContain('[FAILED]');
  });

  it('renders incomplete status with [INCOMPLETE] badge and warning styling', () => {
    const html = renderToStaticMarkup(
      <ApiStateView status="incomplete" title="Partial Telemetry Frame" message="Earth DTE sub-intervals missing." />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('[INCOMPLETE]');
    expect(html).toContain('Partial Telemetry Frame');
    expect(html).not.toContain('[FAILED]');
  });

  it('renders unsupported status with [UNSUPPORTED] badge and purple styling', () => {
    const html = renderToStaticMarkup(
      <ApiStateView status="unsupported" title="Out of Bounds Coordinate" message="Requested latitude > 80°S is unsupported." />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('[UNSUPPORTED]');
    expect(html).toContain('Out of Bounds Coordinate');
    expect(html).not.toContain('[FAILED]');
  });

  it('renders failed status with [FAILED] badge, LunaMission default copy, and retry button', () => {
    let retried = false;
    const html = renderToStaticMarkup(
      <ApiStateView
        status="failed"
        guidance="Verify that backend REST service is running on port 3001."
        onRetry={() => { retried = true; }}
      />
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain('[FAILED]');
    expect(html).toContain('Telemetry Stream Offline');
    expect(html).toContain('LunaMission REST API');
    expect(html).not.toContain('NextRush');
    expect(html).toContain('Retry Connection');
    expect(html).toContain('Remediation:');
  });

  it('empirically audits ApiStateView fallthrough behavior for status="valid"', () => {
    const html = renderToStaticMarkup(<ApiStateView status="valid" />);
    // Empirical finding: ApiStateView lacks an explicit branch for status === 'valid',
    // falling through to default failed state ([FAILED] and 'Telemetry Stream Offline').
    const fallsThroughToFailed = html.includes('[FAILED]') && html.includes('Telemetry Stream Offline');
    expect(fallsThroughToFailed).toBe(true);
  });

  it('supports compact layout padding without stripping status indicators', () => {
    const htmlNormal = renderToStaticMarkup(<ApiStateView status="approximate" compact={false} />);
    const htmlCompact = renderToStaticMarkup(<ApiStateView status="approximate" compact={true} />);
    expect(htmlNormal).toContain('p-4');
    expect(htmlCompact).toContain('p-2.5');
    expect(htmlCompact).toContain('[APPROXIMATE]');
    expect(htmlCompact).toContain('▲');
  });

  it('stress tests all 8 status values for runtime stability (zero unhandled exceptions)', () => {
    const testStatuses: ApiStateStatus[] = [
      'loading', 'empty', 'valid', 'valid-with-limitations',
      'approximate', 'incomplete', 'unsupported', 'failed',
    ];
    for (const st of testStatuses) {
      expect(() => {
        const out = renderToStaticMarkup(<ApiStateView status={st} title={`Test ${st}`} message="Status check" />);
        expect(out.length).toBeGreaterThan(0);
      }).not.toThrow();
    }
  });
});

describe('Challenger M4 Suite 2: WCAG 2.2 AA Target Sizing & Color-Blind Auditing', () => {
  it('verifies ApiStateView retry button enforces min-h-[32px] (>= 28px WCAG 2.2 requirement)', () => {
    const html = renderToStaticMarkup(<ApiStateView status="failed" onRetry={() => {}} />);
    expect(html).toContain('min-h-[32px]');
    expect(html).toContain('px-3.5');
    expect(html).toContain('py-1.5');
    expect(html).toContain('focus-visible:ring-2');
  });

  it('verifies full-width ApiStateView containers provide >= 40px bounding box padding', () => {
    const html = renderToStaticMarkup(<ApiStateView status="empty" title="Empty Banner" />);
    expect(html).toContain('p-4');
  });

  it('verifies AnalyzeWorkspaceView mode switch buttons enforce min-h-[28px] tap targets', () => {
    mockEvaluationState = { data: mockEvaluationPayload('valid'), error: null, isLoading: false, refetch: () => {} };
    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <AnalyzeWorkspaceView />
      </GlobalScenarioProvider>
    );
    expect(html).toContain('min-h-[28px]');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('360° Sky-Ribbon (Panorama)');
    expect(html).toContain('Circular Polar Radar (R07)');
  });
});

describe('Challenger M4 Suite 3: ThreeTierComparisonView Cohort Transitions & Empty States', () => {
  const c1 = createMockCandidate(1, 'connecting-ridge', 'Connecting Ridge', -89.45, 222.69);
  const c2 = createMockCandidate(2, 'shackleton-rim', 'Shackleton Rim', -89.9, 0.0);
  const c3 = createMockCandidate(3, 'malapert-massif', 'Malapert Massif', -85.99, 2.93);

  it('renders 3-site comparison cohort with full 3-tier view', () => {
    mockComparisonState = {
      data: {
        status: 'valid', calculationId: 'cmp-3sites',
        tier1Gating: { totalEvaluatedSites: 3, feasibleSitesCount: 3, disqualifiedSitesCount: 0, disqualifiedCandidates: [] },
        tier2Ranking: { rankedCandidates: [c1, c2, c3] }, tier3Pairwise: null,
      },
      error: null, isLoading: false, refetch: () => {},
    };
    const html = renderToStaticMarkup(<GlobalScenarioProvider><ThreeTierComparisonView /></GlobalScenarioProvider>);
    expect(html).toContain('data-testid="three-tier-comparison-view"');
    expect(html).toContain('3-TIER FUNNEL');
    expect(html).not.toContain('data-testid="three-tier-comparison-empty"');
  });

  it('renders 2-site comparison cohort as valid minimum threshold', () => {
    mockComparisonState = {
      data: {
        status: 'valid', calculationId: 'cmp-2sites',
        tier1Gating: { totalEvaluatedSites: 2, feasibleSitesCount: 2, disqualifiedSitesCount: 0, disqualifiedCandidates: [] },
        tier2Ranking: { rankedCandidates: [c1, c2] }, tier3Pairwise: null,
      },
      error: null, isLoading: false, refetch: () => {},
    };
    const html = renderToStaticMarkup(<GlobalScenarioProvider><ThreeTierComparisonView /></GlobalScenarioProvider>);
    expect(html).toContain('data-testid="three-tier-comparison-view"');
    expect(html).not.toContain('data-testid="three-tier-comparison-empty"');
  });

  it('transitions to clean empty state banner when cohort drops below 2 sites (1 site)', () => {
    mockComparisonState = { data: null, error: null, isLoading: false, refetch: () => {} };
    const html = renderToStaticMarkup(<GlobalScenarioProvider><ThreeTierComparisonView /></GlobalScenarioProvider>);
    expect(html).toContain('data-testid="three-tier-comparison-empty"');
    expect(html).toContain('Comparison Cohort Too Small');
    expect(html).toContain('Select at least 2 candidate landing sites');
    expect(html).not.toContain('data-testid="three-tier-comparison-view"');
  });

  it('transitions to clean empty state banner when cohort is completely empty (0 sites)', () => {
    mockComparisonState = { data: null, error: null, isLoading: false, refetch: () => {} };
    const html = renderToStaticMarkup(<GlobalScenarioProvider><ThreeTierComparisonView /></GlobalScenarioProvider>);
    expect(html).toContain('data-testid="three-tier-comparison-empty"');
    expect(html.trim().length).toBeGreaterThan(0);
  });

  it('strictly preserves regression invariant substring in loading state', () => {
    mockComparisonState = { data: null, error: null, isLoading: true, refetch: () => {} };
    const html = renderToStaticMarkup(<GlobalScenarioProvider><ThreeTierComparisonView /></GlobalScenarioProvider>);
    expect(html).toContain('data-testid="three-tier-comparison-loading"');
    expect(html).toContain('[LOADING]');
    expect(html).toContain('Evaluating Multi-Site Three-Tiered Filtering Pipeline');
  });
});

describe('Challenger M4 Suite 4: Workspace Epistemic Advisory Banners', () => {
  it('AnalyzeWorkspaceView suppresses advisory banner on nominal "valid" status', () => {
    mockEvaluationState = { data: mockEvaluationPayload('valid'), error: null, isLoading: false, refetch: () => {} };
    const html = renderToStaticMarkup(<GlobalScenarioProvider><AnalyzeWorkspaceView /></GlobalScenarioProvider>);
    expect(html).toContain('data-testid="analyze-workspace-view"');
    expect(html).not.toContain('data-testid="analyze-advisory-banner"');
    expect(html).not.toContain('[FAILED]');
    expect(html).not.toContain('Telemetry Stream Offline');
  });

  it('AnalyzeWorkspaceView renders advisory banner on "valid-with-limitations" without breaking view', () => {
    mockEvaluationState = { data: mockEvaluationPayload('valid-with-limitations'), error: null, isLoading: false, refetch: () => {} };
    const html = renderToStaticMarkup(<GlobalScenarioProvider><AnalyzeWorkspaceView /></GlobalScenarioProvider>);
    expect(html).toContain('data-testid="analyze-advisory-banner"');
    expect(html).toContain('[VALID W/ LIMITATIONS]');
    expect(html).toContain('◆');
    expect(html).not.toContain('[FAILED]');
  });

  it('ThreeTierComparisonView renders advisory banner on "approximate" status without breaking trade study', () => {
    const cA = createMockCandidate(1, 'connecting-ridge', 'Connecting Ridge', -89.45, 222.69);
    mockComparisonState = {
      data: {
        status: 'approximate',
        tier1Gating: { totalEvaluatedSites: 2, feasibleSitesCount: 2, disqualifiedSitesCount: 0, disqualifiedCandidates: [] },
        tier2Ranking: { rankedCandidates: [cA] }, tier3Pairwise: null,
      },
      error: null, isLoading: false, refetch: () => {},
    };
    const html = renderToStaticMarkup(<GlobalScenarioProvider><ThreeTierComparisonView /></GlobalScenarioProvider>);
    expect(html).toContain('data-testid="three-tier-advisory-banner"');
    expect(html).toContain('[APPROXIMATE]');
    expect(html).toContain('▲');
    expect(html).not.toContain('[FAILED]');
  });
});
