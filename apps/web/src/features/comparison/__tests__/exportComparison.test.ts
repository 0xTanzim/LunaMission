import { describe, it, expect } from 'bun:test';
import { buildComparisonCsvString } from '../model/exportComparisonCsv';
import { buildComparisonMarkdown } from '../model/exportComparisonMarkdown';
import type { ScenarioCompareResponse } from '@luna/contracts';

describe('Comparison Export Utilities', () => {
  const mockData: ScenarioCompareResponse = {
    calculationId: 'calc-test-123',
    status: 'valid',
    scenarioConfig: {
      startUtc: '2026-11-01T00:00:00Z',
      stopUtc: '2026-11-15T00:00:00Z',
      totalEvaluationHours: 336.0,
      launchSlipOffsetDays: 0,
      observerMastHeightM: 2.0,
      sunVisibilityCriterion: 'upperLimb',
      earthVisibilityCriterion: 'center',
    },
    tier1Gating: {
      totalEvaluatedSites: 3,
      feasibleSitesCount: 2,
      disqualifiedSitesCount: 1,
      feasibleSiteIds: ['site-1', 'site-2'],
      disqualifiedCandidates: [
        {
          siteId: 'site-culled',
          siteName: 'Culled Ridge',
          entityType: 'candidate_region',
          rejectionReasons: [
            {
              constraintName: 'maxLandingSlope',
              thresholdValue: 10.0,
              observedValue: 14.5,
              unit: 'deg',
              marginOfFailure: 4.5,
              narrative: 'Slope of 14.5 deg exceeds 10.0 deg limit.',
            },
          ],
        },
      ],
    },
    tier2Ranking: {
      priorityHierarchy: ['longestContinuousSunlight', 'maxContinuousDarkness', 'cumulativeOverlapHours'],
      rankedCandidates: [
        {
          rank: 1,
          siteId: 'site-1',
          siteName: 'Connecting Ridge CR01',
          entityType: 'research_candidate_point',
          coordinates: {
            latitudeDeg: -89.527,
            longitudeEastDeg: 205.408,
            elevationMeters: 1850,
            referenceDatum: 'IAU_MOON_ME',
            referenceRadiusKm: 1737.4,
          },
          metrics: {
            longestContinuousSunlightHours: 190.0,
            maxContinuousDarknessHours: 12.0,
            cumulativeSunlitHours: 240.0,
            solarAccessPercentage: 71.4,
            cumulativeDteHours: 210.0,
            dteAccessPercentage: 62.5,
            cumulativeOverlapHours: 180.0,
            landingSlopeDeg: 6.2,
            terrainUncertaintySpanHours: 2.8,
          },
          sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 190.0, tieBroken: false }],
        },
        {
          rank: 2,
          siteId: 'site-2',
          siteName: 'Malapert Massif Peak',
          entityType: 'research_candidate_point',
          coordinates: {
            latitudeDeg: -86.04,
            longitudeEastDeg: 2.7,
            elevationMeters: 5000,
            referenceDatum: 'IAU_MOON_ME',
            referenceRadiusKm: 1737.4,
          },
          metrics: {
            longestContinuousSunlightHours: 175.0,
            maxContinuousDarknessHours: 15.0,
            cumulativeSunlitHours: 220.0,
            solarAccessPercentage: 65.5,
            cumulativeDteHours: 280.0,
            dteAccessPercentage: 83.3,
            cumulativeOverlapHours: 165.0,
            landingSlopeDeg: 8.5,
            terrainUncertaintySpanHours: 3.5,
          },
          sortKeyTrace: [{ metric: 'longestContinuousSunlight', value: 175.0, tieBroken: false }],
        },
      ],
    },
    tier3Pairwise: {
      siteA: {
        siteId: 'site-1',
        siteName: 'Connecting Ridge CR01',
      },
      siteB: {
        siteId: 'site-2',
        siteName: 'Malapert Massif Peak',
      },
      deltas: [
        {
          metricKey: 'longestContinuousSunlight',
          metricLabel: 'Longest Continuous Sun',
          unit: 'hours',
          valueA: 190.0,
          valueB: 175.0,
          absoluteDelta: 15.0,
          percentDelta: 8.57,
          favoredSite: 'siteA',
          operationalSignificance: 'Site A provides 15.0h longer continuous power window.',
        },
      ],
      terrainSensitivityComparison: {
        uncertaintySpanHoursA: 2.8,
        uncertaintySpanHoursB: 3.5,
        whiskerRatio: 1.25,
        lowerRiskSite: 'siteA',
      },
      objectiveTradeOffNarrative: 'Site A provides longer continuous sunlight and safer slope, while Site B offers superior Earth visibility.',
    },
    provenance: {
      calculationId: 'calc-test-123',
      engineVersion: 'LunaMission-Engine-2.0.0',
      timestampUtc: '2026-11-06T12:00:00Z',
      ephemerisSource: 'NASA_JPL_HORIZONS_API_COORD_301',
      ephemerisDataset: 'DE421/DE440',
      timeScaleOffsetTtMinusUtcSec: 69.184,
      terrainModelSource: 'NASA_LOLA_PDS_LDEM_85S_20M',
      terrainSpatialResolutionM: 20.0,
      horizonProfileAzimuthBins: 360,
      solverAlgorithm: 'ROLLE_HERMITE_BRENT_EVENT_SPLITTER',
      rootBracketToleranceSec: 1.0,
      tangentialGrazeToleranceDeg: 1e-7,
      casCacheHit: false,
    },
  };

  it('buildComparisonCsvString generates valid RFC 4180 CSV with all sections', () => {
    const csv = buildComparisonCsvString(mockData);

    expect(csv).toContain('SCENARIO METADATA');
    expect(csv).toContain('calc-test-123');
    expect(csv).toContain('TIER 1 GATING AUDIT');
    expect(csv).toContain('Culled Ridge');
    expect(csv).toContain('TIER 2 LEXICOGRAPHIC RANKING');
    expect(csv).toContain('Connecting Ridge CR01');
    expect(csv).toContain('Malapert Massif Peak');
    expect(csv).toContain('TIER 3 PAIRWISE DELTA MATRIX');
    expect(csv).toContain('Longest Continuous Sun');
  });

  it('buildComparisonMarkdown generates structured Markdown Dossier with headers and tables', () => {
    const md = buildComparisonMarkdown(mockData);

    expect(md).toContain('# Lunar South Pole Landing Site Trade Study Dossier');
    expect(md).toContain('## 1. Scenario Context & Physical Datum');
    expect(md).toContain('## 2. Tier 1 Vehicle Gating Audit');
    expect(md).toContain('## 3. Tier 2 Lexicographic Priority Ranking');
    expect(md).toContain('## 4. Tier 3 Focused Pairwise Trade Study');
    expect(md).toContain('Connecting Ridge CR01');
    expect(md).toContain('Malapert Massif Peak');
    expect(md).toContain('Geodesic Surface Separation');
    expect(md).toContain('Terrain Sensitivity Whiskers');
    expect(md).toContain('not a statistical confidence interval');
  });
});
