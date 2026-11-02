/**
 * Tier 3 Focused Pairwise Delta Matrix & Objective Narrative Engine
 * Milestone M5: Three-Tiered Filtering Pipeline (Tier 3)
 * Governed by docs/phase-3/API_CONTRACT.md § 4.1, § 4.3 and INFORMATION_ARCHITECTURE.md § 5.3.
 */

import type { PairwiseDeltaItem, Tier3PairwiseDelta } from '@luna/contracts';

export interface PairwiseCandidateData {
  siteId: string;
  siteName: string;
  longestContinuousSunlight: number;
  maxContinuousDarkness: number;
  cumulativeDteHours: number;
  cumulativeOverlapHours: number;
  uncertaintySpanHours: number;
}

export function buildTier3PairwiseDelta(
  candA: PairwiseCandidateData,
  candB: PairwiseCandidateData,
): Tier3PairwiseDelta {
  const metricsConfig: {
    key: string;
    label: string;
    unit: string;
    valA: number;
    valB: number;
    lowerIsBetter: boolean;
    sigA: (d: number, pct: number, valB: number, valA: number) => string;
    sigB: (d: number, pct: number, valB: number, valA: number) => string;
  }[] = [
    {
      key: 'longestContinuousSunlight',
      label: 'Longest Continuous Sunlight',
      unit: 'hours',
      valA: candA.longestContinuousSunlight,
      valB: candB.longestContinuousSunlight,
      lowerIsBetter: false,
      sigA: (d, pct, valB) =>
        valB === 0
          ? `Site A provides +${d.toFixed(1)} h continuous illumination (vs 0.0 h baseline).`
          : `Site A provides +${d.toFixed(1)} h (+${pct.toFixed(1)}%) longer continuous illumination.`,
      sigB: (d, pct, valB, valA) =>
        valA === 0
          ? `Site B provides +${Math.abs(d).toFixed(1)} h continuous illumination (vs 0.0 h baseline).`
          : `Site B provides +${Math.abs(d).toFixed(1)} h (+${Math.abs(pct).toFixed(1)}%) longer continuous illumination.`,
    },
    {
      key: 'maxContinuousDarkness',
      label: 'Maximum Continuous Darkness',
      unit: 'hours',
      valA: candA.maxContinuousDarkness,
      valB: candB.maxContinuousDarkness,
      lowerIsBetter: true,
      sigA: (d) => `Site A reduces maximum battery cold-soak duration by ${Math.abs(d).toFixed(1)} h.`,
      sigB: (d) => `Site B reduces maximum battery cold-soak duration by ${d.toFixed(1)} h.`,
    },
    {
      key: 'cumulativeDteHours',
      label: 'Direct-to-Earth (DTE) Comms',
      unit: 'hours',
      valA: candA.cumulativeDteHours,
      valB: candB.cumulativeDteHours,
      lowerIsBetter: false,
      sigA: (d, pct, valB) =>
        valB === 0
          ? `Site A provides +${d.toFixed(1)} h Earth line-of-sight (vs 0.0 h baseline).`
          : `Site A provides +${d.toFixed(1)} h (+${pct.toFixed(1)}%) additional Earth line-of-sight.`,
      sigB: (d, pct, valB, valA) =>
        valA === 0
          ? `Site B provides +${Math.abs(d).toFixed(1)} h Earth line-of-sight (vs 0.0 h baseline).`
          : `Site B provides +${Math.abs(d).toFixed(1)} h (+${Math.abs(pct).toFixed(1)}%) additional Earth line-of-sight.`,
    },
    {
      key: 'cumulativeOverlapHours',
      label: 'Combined Sun & Earth Overlap',
      unit: 'hours',
      valA: candA.cumulativeOverlapHours,
      valB: candB.cumulativeOverlapHours,
      lowerIsBetter: false,
      sigA: (d, pct, valB) =>
        valB === 0
          ? `Site A provides +${d.toFixed(1)} h concurrent power and comms (vs 0.0 h baseline).`
          : `Site A provides +${d.toFixed(1)} h (+${pct.toFixed(1)}%) more concurrent power and comms.`,
      sigB: (d, pct, valB, valA) =>
        valA === 0
          ? `Site B provides +${Math.abs(d).toFixed(1)} h concurrent power and comms (vs 0.0 h baseline).`
          : `Site B provides +${Math.abs(d).toFixed(1)} h (+${Math.abs(pct).toFixed(1)}%) more concurrent power and comms.`,
    },
  ];

  const deltas: PairwiseDeltaItem[] = metricsConfig.map((m) => {
    const rawDelta = m.valA - m.valB;
    const absDelta = Number(rawDelta.toFixed(2));
    const pct = m.valB !== 0 ? Number(((rawDelta / Math.abs(m.valB)) * 100.0).toFixed(2)) : 0.0;

    let favoredSite: 'siteA' | 'siteB' | 'tie' = 'tie';
    if (Math.abs(rawDelta) > 0.01) {
      if (m.lowerIsBetter) {
        favoredSite = rawDelta < 0 ? 'siteA' : 'siteB';
      } else {
        favoredSite = rawDelta > 0 ? 'siteA' : 'siteB';
      }
    }

    const sig =
      favoredSite === 'siteA'
        ? m.sigA(rawDelta, pct, m.valB, m.valA)
        : favoredSite === 'siteB'
          ? m.sigB(rawDelta, pct, m.valB, m.valA)
          : 'Both sites exhibit equivalent operational performance.';

    return {
      metricKey: m.key,
      metricLabel: m.label,
      unit: m.unit,
      valueA: Number(m.valA.toFixed(2)),
      valueB: Number(m.valB.toFixed(2)),
      absoluteDelta: absDelta,
      percentDelta: pct,
      favoredSite,
      operationalSignificance: sig,
    };
  });

  const spanA = candA.uncertaintySpanHours;
  const spanB = candB.uncertaintySpanHours;
  const whiskerRatio = Number((Math.max(0.01, spanA) / Math.max(0.01, spanB)).toFixed(3));
  const lowerRiskSite: 'siteA' | 'siteB' | 'tie' =
    Math.abs(spanA - spanB) <= 0.1 ? 'tie' : spanA < spanB ? 'siteA' : 'siteB';

  const dSun = candA.longestContinuousSunlight - candB.longestContinuousSunlight;
  const dDte = candA.cumulativeDteHours - candB.cumulativeDteHours;
  const narrative =
    `${candA.siteName} provides ${Math.abs(dSun).toFixed(1)} h ${dSun >= 0 ? 'more' : 'fewer'} continuous sunlight and a ${whiskerRatio.toFixed(1)}x sensitivity ratio compared to ${candB.siteName}, which provides ${Math.abs(dDte).toFixed(1)} h ${dDte >= 0 ? 'fewer' : 'more'} Direct-to-Earth telemetry.`;

  return {
    siteA: { siteId: candA.siteId, siteName: candA.siteName },
    siteB: { siteId: candB.siteId, siteName: candB.siteName },
    deltas,
    terrainSensitivityComparison: {
      uncertaintySpanHoursA: Number(spanA.toFixed(2)),
      uncertaintySpanHoursB: Number(spanB.toFixed(2)),
      whiskerRatio,
      lowerRiskSite,
    },
    objectiveTradeOffNarrative: narrative,
  };
}
