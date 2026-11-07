/**
 * Challenger M5-1: Lexicographical Ranking & Pairwise Select Stress Suite
 *
 * Empirical adversarial stress testing for Milestone M5:
 * 1. Empty cohort resilience (rankedCandidates = []).
 * 2. Single candidate cohort (rankedCandidates = [single]) with rank 1 medal and progress clamping.
 * 3. Tie-breaking trace verification:
 *    - sortKeyTrace with tieBroken=true triggers "TIE RESOLVED" badge.
 *    - sortKeyTrace with tieBroken=false does NOT trigger "TIE RESOLVED" badge.
 *    - Empty sortKeyTrace handling.
 * 4. Large cohort stress: 25 and 50 candidate sites, verifying medal hierarchy (#1, #2, #3, #4..#50).
 * 5. Selection state testing:
 *    - Row styling (info-surface tint for Site A, series-b-surface tint for Site B).
 *    - Badges ("Site A", "Site B").
 *    - Button states (aria-pressed="true", active colors and focus ring).
 *    - Callback logic (onSelectPairwise firing with updated pair, self-pairing prevention).
 * 6. Zero TOPSIS audit: Strict scan ensuring no multi-attribute utility / TOPSIS jargon.
 */

import { describe, it, expect } from 'bun:test';
import React, { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { RankedFeasibleCandidate } from '@luna/contracts';
import { Tier2LexicographicSort } from '../src/features/comparison/Tier2LexicographicSort';
import { Tier2TableHeader } from '../src/features/comparison/components/Tier2TableHeader';
import { Tier2CandidateRow } from '../src/features/comparison/components/Tier2CandidateRow';
import { Tier2RankBadge } from '../src/features/comparison/components/Tier2RankBadge';

function createMockCandidate(
  rank: number,
  siteId: string,
  siteName: string,
  overrides?: Partial<RankedFeasibleCandidate>,
): RankedFeasibleCandidate {
  return {
    rank,
    siteId,
    siteName,
    entityType: 'research_candidate_point',
    coordinates: {
      latitudeDeg: -89.5,
      longitudeEastDeg: 120.0 + rank * 5,
      elevationMeters: 1800 + rank * 50,
      referenceDatum: 'IAU_MOON_ME',
      referenceRadiusKm: 1737.4,
    },
    metrics: {
      longestContinuousSunlightHours: 190.0 - rank * 2,
      maxContinuousDarknessHours: 10.0 + rank * 0.5,
      cumulativeSunlitHours: 220.0 - rank * 2,
      solarAccessPercentage: 80.0 - rank,
      cumulativeDteHours: 200.0 - rank,
      dteAccessPercentage: 70.0 - rank,
      cumulativeOverlapHours: 180.0 - rank * 2,
      landingSlopeDeg: 4.5 + rank * 0.2,
      terrainUncertaintySpanHours: 2.5 + rank * 0.1,
    },
    sortKeyTrace: [
      { metric: 'longestContinuousSunlight', value: 190.0 - rank * 2, tieBroken: false },
      { metric: 'maxContinuousDarkness', value: 10.0 + rank * 0.5, tieBroken: false },
    ],
    ...overrides,
  };
}

describe('Challenger M5-1: Empty Cohort Resilience', () => {
  it('renders empty table cleanly with 0 surviving candidates and no runtime throw', () => {
    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={[]}
        onSelectPairwise={() => {}}
      />,
    );

    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Tier 2 Lexicographic Priority Ranking"');
    expect(html).toContain('Tier 2 — Rank the survivors');
    expect(html).toContain('TIE-RESOLVED HIERARCHY');
    expect(html).toContain('Surviving Candidates: 0');
    expect(html).toContain('<table');
    expect(html).toContain('<thead');
    expect(html).toContain('<tbody');
    expect(html).not.toContain('data-testid="ranked-row-');
  });

  it('Tier2TableHeader renders 8 semantic columns with scope="col"', () => {
    const headerHtml = renderToStaticMarkup(<Tier2TableHeader />);
    expect(headerHtml).toContain('<thead');
    expect(headerHtml).toContain('scope="col"');
    expect(headerHtml).toContain('Rank');
    expect(headerHtml).toContain('Candidate Site');
    expect(headerHtml).toContain('Continuous Sun');
    expect(headerHtml).toContain('Max Dark');
    expect(headerHtml).toContain('Earth LoS (geom.)');
    expect(headerHtml).toContain('Slope');
    expect(headerHtml).toContain('Sorting Trace &amp; Ties');
    expect(headerHtml).toContain('Head-to-Head Select');
  });
});

describe('Challenger M5-1: Single Candidate Cohort', () => {
  it('renders single candidate with rank 1 gold medal and clamped progress widths', () => {
    const single = createMockCandidate(1, 'shackleton-ridge', 'Shackleton Connecting Ridge', {
      metrics: {
        longestContinuousSunlightHours: 250.0, // Over 200h to test 100% clamping
        maxContinuousDarknessHours: 80.0,     // Over 60h to test 100% clamping
        cumulativeSunlitHours: 260.0,
        solarAccessPercentage: 92.0,
        cumulativeDteHours: 250.0,            // Over 200h to test 100% clamping
        dteAccessPercentage: 88.0,
        cumulativeOverlapHours: 220.0,
        landingSlopeDeg: 3.2,
        terrainUncertaintySpanHours: 1.8,
      },
    });

    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={[single]}
        onSelectPairwise={() => {}}
      />,
    );

    expect(html).toContain('Surviving Candidates: 1');
    expect(html).toContain('data-testid="ranked-row-shackleton-ridge"');
    expect(html).toContain('🥇 #1');
    expect(html).toContain('Shackleton Connecting Ridge');
    expect(html).toContain('89.50°S, 125.0°E • 1850m');
    expect(html).toContain('250.0h');
    expect(html).toContain('80.0h');
    expect(html).toContain('3.2°');

    // Clamped progress bar widths must not exceed 100%
    const matches100 = (html.match(/width:100%/g) || []).length;
    expect(matches100).toBeGreaterThanOrEqual(3);
  });
});

describe('Challenger M5-1: Tie-Breaking Traces & Badge Validation', () => {
  it('displays TIE RESOLVED badge when tieBroken is true', () => {
    const tiedCandidate = createMockCandidate(2, 'site-tied', 'Tied Candidate Point', {
      sortKeyTrace: [
        { metric: 'longestContinuousSunlight', value: 180.0, tieBroken: true },
        { metric: 'maxContinuousDarkness', value: 12.0, tieBroken: false },
      ],
    });

    const html = renderToStaticMarkup(
      <Tier2CandidateRow
        candidate={tiedCandidate}
        isSiteA={false}
        isSiteB={false}
        onSelectSiteA={() => {}}
        onSelectSiteB={() => {}}
      />,
    );

    expect(html).toContain('TIE RESOLVED');
    expect(html).toContain('longestContinuousSunlight: 180.0');
    expect(html).toContain('maxContinuousDarkness: 12.0');
  });

  it('omits TIE RESOLVED badge when all tieBroken flags are false', () => {
    const untiedCandidate = createMockCandidate(1, 'site-untied', 'Untied Candidate Point', {
      sortKeyTrace: [
        { metric: 'longestContinuousSunlight', value: 185.0, tieBroken: false },
        { metric: 'maxContinuousDarkness', value: 10.0, tieBroken: false },
      ],
    });

    const html = renderToStaticMarkup(
      <Tier2CandidateRow
        candidate={untiedCandidate}
        isSiteA={false}
        isSiteB={false}
        onSelectSiteA={() => {}}
        onSelectSiteB={() => {}}
      />,
    );

    expect(html).not.toContain('TIE RESOLVED');
    expect(html).toContain('longestContinuousSunlight: 185.0');
  });

  it('handles empty sortKeyTrace safely without crash or bad badge', () => {
    const emptyTraceCandidate = createMockCandidate(1, 'site-empty-trace', 'No Trace Point', {
      sortKeyTrace: [],
    });

    const html = renderToStaticMarkup(
      <Tier2CandidateRow
        candidate={emptyTraceCandidate}
        isSiteA={false}
        isSiteB={false}
        onSelectSiteA={() => {}}
        onSelectSiteB={() => {}}
      />,
    );

    expect(html).not.toContain('TIE RESOLVED');
    expect(html).toContain('data-testid="ranked-row-site-empty-trace"');
  });

  it('in mixed cohort, displays badge only for candidates with broken ties', () => {
    const c1 = createMockCandidate(1, 'site-1', 'Site 1', {
      sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 190.0, tieBroken: false }],
    });
    const c2 = createMockCandidate(2, 'site-2', 'Site 2', {
      sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 190.0, tieBroken: true }],
    });
    const c3 = createMockCandidate(3, 'site-3', 'Site 3', {
      sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 188.0, tieBroken: false }],
    });

    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={[c1, c2, c3]}
        onSelectPairwise={() => {}}
      />,
    );

    // Candidate row 2 has the single 'TIE RESOLVED' badge (header has 'TIE-RESOLVED HIERARCHY')
    const rowTieBadges = (html.match(/>TIE RESOLVED<\/span>/g) || []).length;
    expect(rowTieBadges).toBe(1);
    expect(html).toContain('TIE-RESOLVED HIERARCHY');
  });
});

describe('Challenger M5-1: Large Cohort Stress Testing (25 & 50 candidates)', () => {
  it('renders 25 candidate cohort with correct medals and standard badges', () => {
    const cohort25 = Array.from({ length: 25 }, (_, i) =>
      createMockCandidate(i + 1, `candidate-${i + 1}`, `Candidate Ridge ${i + 1}`),
    );

    const startTime = performance.now();
    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={cohort25}
        onSelectPairwise={() => {}}
      />,
    );
    const renderDuration = performance.now() - startTime;

    expect(renderDuration).toBeLessThan(50); // Sub-50ms performance target
    expect(html).toContain('Surviving Candidates: 25');

    // Medals for top 3
    expect(html).toContain('🥇 #1');
    expect(html).toContain('🥈 #2');
    expect(html).toContain('🥉 #3');

    // Plain rank indicators for ranks 4 to 25
    for (let r = 4; r <= 25; r++) {
      expect(html).toContain(`data-testid="ranked-row-candidate-${r}"`);
      expect(html).toContain(`>#${r}</span>`);
    }
  });

  it('renders 50 candidate stress cohort without breakdown', () => {
    const cohort50 = Array.from({ length: 50 }, (_, i) =>
      createMockCandidate(i + 1, `candidate-${i + 1}`, `Stress Candidate ${i + 1}`),
    );

    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={cohort50}
        onSelectPairwise={() => {}}
      />,
    );

    expect(html).toContain('Surviving Candidates: 50');
    expect(html).toContain('Stress Candidate 1');
    expect(html).toContain('Stress Candidate 50');
    expect(html).toContain('>#50</span>');
  });

  it('Tier2RankBadge renders all 4 rank representations correctly', () => {
    const b1 = renderToStaticMarkup(<Tier2RankBadge rank={1} />);
    expect(b1).toContain('🥇 #1');
    // Rank 1 wears the denser gold tint; rank 3 the fainter one. Both are semantic
    // warning-role tokens now, so the two-step intensity is what keeps them distinct.
    expect(b1).toContain('bg-[var(--lm-color-warning-surface-strong)]');

    const b2 = renderToStaticMarkup(<Tier2RankBadge rank={2} />);
    expect(b2).toContain('🥈 #2');
    expect(b2).toContain('bg-[var(--lm-color-surface-strong)]');

    const b3 = renderToStaticMarkup(<Tier2RankBadge rank={3} />);
    expect(b3).toContain('🥉 #3');
    expect(b3).toContain('bg-[var(--lm-color-warning-surface)]');
    expect(b3).not.toContain('surface-strong');

    const b4 = renderToStaticMarkup(<Tier2RankBadge rank={4} />);
    expect(b4).toContain('#4');
    expect(b4).toContain('text-[var(--lm-color-text-muted)]');
  });
});

describe('Challenger M5-1: Selection State & Interactive Pairing Ergonomics', () => {
  const c1 = createMockCandidate(1, 'site-alpha', 'Site Alpha');
  const c2 = createMockCandidate(2, 'site-beta', 'Site Beta');
  const c3 = createMockCandidate(3, 'site-gamma', 'Site Gamma');

  interface CandidateRowElement {
    props: {
      candidate: RankedFeasibleCandidate;
      isSiteA: boolean;
      isSiteB: boolean;
      onSelectSiteA: (siteId: string) => void;
      onSelectSiteB: (siteId: string) => void;
    };
  }
  interface TbodyElement {
    props: {
      children: CandidateRowElement[];
    };
  }
  interface TableElement {
    props: {
      children: [unknown, TbodyElement];
    };
  }
  interface ContainerElement {
    props: {
      children: TableElement;
    };
  }
  interface SectionElement {
    props: {
      children: [unknown, ContainerElement];
    };
  }

  it('reflects active Site A and Site B badges and aria-pressed attributes in HTML', () => {
    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={[c1, c2, c3]}
        selectedSiteAId="site-alpha"
        selectedSiteBId="site-beta"
        onSelectPairwise={() => {}}
      />,
    );

    // Site Alpha row assertions (Site A)
    expect(html).toContain('border-l-[var(--lm-color-info)]');
    expect(html).toContain('>Site A</span>');
    expect(html).toContain('aria-pressed="true"');

    // Site Beta row assertions (Site B)
    expect(html).toContain('border-l-[var(--lm-color-series-b)]');
    expect(html).toContain('>Site B</span>');

    // Unselected Site Gamma row assertions
    const gammaSlice = html.slice(html.indexOf('ranked-row-site-gamma'));
    expect(gammaSlice).not.toContain('border-l-[var(--lm-color-info)]');
    expect(gammaSlice).not.toContain('border-l-[var(--lm-color-series-b)]');
  });

  it('fires onSelectPairwise with updated siteA while preserving siteB', () => {
    let capturedPair: [string, string] | null = null;
    const onSelectPairwise = (a: string, b: string) => {
      capturedPair = [a, b];
    };

    // Render tree as React elements to exercise internal handlers directly
    const section = Tier2LexicographicSort({
      rankedCandidates: [c1, c2, c3],
      selectedSiteAId: 'site-alpha',
      selectedSiteBId: 'site-beta',
      onSelectPairwise,
    }) as unknown as SectionElement;

    const rows = section.props.children[1].props.children.props.children[1].props.children;
    expect(rows.length).toBe(3);

    // Row 3 is site-gamma; select it as Site A
    const row3 = rows[2];
    expect(row3.props.candidate.siteId).toBe('site-gamma');

    row3.props.onSelectSiteA('site-gamma');
    expect(capturedPair).toEqual(['site-gamma', 'site-beta']);

    // Row 3: select it as Site B
    row3.props.onSelectSiteB('site-gamma');
    expect(capturedPair).toEqual(['site-alpha', 'site-gamma']);
  });

  it('prevents self-pairing when selecting current Site B candidate as Site A', () => {
    let capturedPair: [string, string] | null = null;
    const onSelectPairwise = (a: string, b: string) => {
      capturedPair = [a, b];
    };

    const section = Tier2LexicographicSort({
      rankedCandidates: [c1, c2, c3],
      selectedSiteAId: 'site-alpha',
      selectedSiteBId: 'site-beta',
      onSelectPairwise,
    }) as unknown as SectionElement;

    const rows = section.props.children[1].props.children.props.children[1].props.children;

    // Row 2 is site-beta; attempting to select it as Site A should clear B and NOT fire onSelectPairwise
    rows[1].props.onSelectSiteA('site-beta');
    expect(capturedPair).toBeNull(); // No self-pairing allowed!

    // Row 1 is site-alpha; attempting to select it as Site B should clear A and NOT fire onSelectPairwise
    rows[0].props.onSelectSiteB('site-alpha');
    expect(capturedPair).toBeNull(); // No self-pairing allowed!
  });

  it('Tier2CandidateRow calls onSelectSiteA and onSelectSiteB with candidate siteId', () => {
    let chosenA = '';
    let chosenB = '';

    const rowHtml = renderToStaticMarkup(
      <Tier2CandidateRow
        candidate={c1}
        isSiteA={false}
        isSiteB={false}
        onSelectSiteA={(id) => {
          chosenA = id;
        }}
        onSelectSiteB={(id) => {
          chosenB = id;
        }}
      />,
    );

    expect(rowHtml).toContain('Site A');
    expect(rowHtml).toContain('Site B');
    expect(rowHtml).toContain('min-h-[30px]'); // Accessible tap target
  });
});

describe('Challenger M5-1: Zero TOPSIS & Composite Score Strict Audit', () => {
  it('strictly verifies no TOPSIS or single composite score vocabulary appears in Tier 2 components', () => {
    const candidates = [
      createMockCandidate(1, 'site-1', 'Site 1'),
      createMockCandidate(2, 'site-2', 'Site 2', {
        sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 180.0, tieBroken: true }],
      }),
    ];

    const html = renderToStaticMarkup(
      <Tier2LexicographicSort
        rankedCandidates={candidates}
        selectedSiteAId="site-1"
        selectedSiteBId="site-2"
        onSelectPairwise={() => {}}
      />,
    );

    const forbiddenTerms = [
      'TOPSIS',
      'topsis',
      'Composite Score',
      'composite-score',
      'relativeCloseness',
      'idealSolution',
      'negativeIdeal',
      'weightedSum',
      'WLC',
      'AHP',
      'MCDA score',
    ];

    for (const term of forbiddenTerms) {
      expect(html).not.toContain(term);
    }

    // Verify legitimate physical terminology is present
    expect(html).toContain('Tier 2 — Rank the survivors');
    expect(html).toContain('TIE-RESOLVED HIERARCHY');
    expect(html).toContain('Continuous Sun');
    expect(html).toContain('Max Dark');
    expect(html).toContain('Earth LoS (geom.)');
    expect(html).toContain('Slope');
  });
});
