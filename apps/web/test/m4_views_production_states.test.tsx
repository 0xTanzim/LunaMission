import { describe, it, expect, mock } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { GlobalScenarioProvider } from '../src/app/state/GlobalScenarioContext';

// Mock hooks before importing views
let mockEvaluationState: any = {
  data: null,
  error: null,
  isLoading: false,
  refetch: () => {},
};

mock.module('../src/features/analyze/hooks/useScenarioEvaluation', () => ({
  useScenarioEvaluation: () => mockEvaluationState,
}));

let mockComparisonState: any = {
  data: null,
  error: null,
  isLoading: false,
  refetch: () => {},
};

mock.module('../src/features/comparison/hooks/useScenarioComparison', () => ({
  useScenarioComparison: () => mockComparisonState,
}));

import { AnalyzeWorkspaceView } from '../src/features/analyze/AnalyzeWorkspaceView';
import { ThreeTierComparisonView } from '../src/features/comparison/ThreeTierComparisonView';

describe('Milestone M4: AnalyzeWorkspaceView Production States', () => {
  it('renders ApiStateView status="empty" when data is null and not loading/error', () => {
    mockEvaluationState = {
      data: null,
      error: null,
      isLoading: false,
      refetch: () => {},
    };

    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <AnalyzeWorkspaceView />
      </GlobalScenarioProvider>
    );
    expect(html).toContain('data-testid="analyze-view-empty"');
    expect(html).toContain('[EMPTY]');
    expect(html).toContain('No Scenario Data');
  });

  it('renders ApiStateView status="failed" with guidance and retryable button', () => {
    mockEvaluationState = {
      data: null,
      error: {
        title: 'Horizons Service Unavailable',
        detail: 'JPL query socket reset',
        code: 'HORIZONS_503',
        guidance: 'Retry connection in 30 seconds.',
        isRetryable: true,
      },
      isLoading: false,
      refetch: () => {},
    };

    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <AnalyzeWorkspaceView />
      </GlobalScenarioProvider>
    );
    expect(html).toContain('data-testid="analyze-view-error"');
    expect(html).toContain('[FAILED]');
    expect(html).toContain('Remediation:');
    expect(html).toContain('Retry connection in 30 seconds.');
    expect(html).toContain('Retry Connection');
  });

  it('renders advisory banner when data.status is valid-with-limitations', () => {
    mockEvaluationState = {
      data: {
        status: 'valid-with-limitations',
        calculationId: 'calc-123',
        siteInfo: { siteName: 'Connecting Ridge' },
        metrics: {
          cumulativeSunlitHours: 120,
          solarAccessPercentage: 85,
          longestContinuousSunlitWindowHours: 100,
          longestContinuousDarkWindowHours: 10,
          cumulativeDarkHours: 20,
          cumulativeDteHours: 150,
          cumulativeOverlapHours: 80,
          overlapPercentage: 50,
          topographicShadowPenaltyHours: 5,
          longestContinuousDteWindowHours: 70,
          simultaneousAccessPercentage: 60,
          dteAccessPercentage: 75,
        },
        intervals: [],
        uncertaintyEnvelopes: { eventWhiskers: [] },
        scenarioConfig: { effectiveStartUtc: '2026-01-01', effectiveStopUtc: '2026-01-28' },
      },
      error: null,
      isLoading: false,
      refetch: () => {},
    };

    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <AnalyzeWorkspaceView />
      </GlobalScenarioProvider>
    );
    expect(html).toContain('data-testid="analyze-advisory-banner"');
    expect(html).toContain('[VALID W/ LIMITATIONS]');
    expect(html).toContain('◆');
  });
});

describe('Milestone M4: ThreeTierComparisonView Production States', () => {
  it('renders the recoverable empty state when cohort is insufficient (<2 sites)', () => {
    mockComparisonState = {
      data: null,
      error: null,
      isLoading: false,
      refetch: () => {},
    };

    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <ThreeTierComparisonView />
      </GlobalScenarioProvider>
    );
    expect(html).toContain('data-testid="three-tier-comparison-empty"');
    expect(html).toContain('Comparison Cohort Too Small');
  });

  it('renders ApiStateView status="failed" with guidance', () => {
    mockComparisonState = {
      data: null,
      error: {
        title: 'Multi-Site Evaluation Failed',
        detail: 'Horizon ray intersection timed out',
        code: 'RAY_TIMEOUT',
        guidance: 'Remove sites with high latitude excursions.',
        isRetryable: true,
      },
      isLoading: false,
      refetch: () => {},
    };

    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <ThreeTierComparisonView />
      </GlobalScenarioProvider>
    );
    expect(html).toContain('data-testid="three-tier-comparison-error"');
    expect(html).toContain('[FAILED]');
    expect(html).toContain('Remediation:');
    expect(html).toContain('Remove sites with high latitude excursions.');
    expect(html).toContain('Retry Connection');
  });

  it('renders advisory banner when data.status is approximate', () => {
    mockComparisonState = {
      data: {
        status: 'approximate',
        tier1Gating: {
          totalEvaluatedSites: 2,
          feasibleSitesCount: 2,
          disqualifiedSitesCount: 0,
          disqualifiedCandidates: [],
        },
        tier2Ranking: {
          rankedCandidates: [],
        },
        tier3Pairwise: null,
      },
      error: null,
      isLoading: false,
      refetch: () => {},
    };

    const html = renderToStaticMarkup(
      <GlobalScenarioProvider>
        <ThreeTierComparisonView />
      </GlobalScenarioProvider>
    );
    expect(html).toContain('data-testid="three-tier-advisory-banner"');
    expect(html).toContain('[APPROXIMATE]');
    expect(html).toContain('▲');
  });
});
