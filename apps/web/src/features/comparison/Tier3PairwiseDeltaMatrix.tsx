import React from 'react';
import type { Tier3PairwiseDelta } from '@luna/contracts';
import { HeadToHeadVersusBanner } from './components/HeadToHeadVersusBanner';
import { PairwiseBidirectionalBar } from './components/PairwiseBidirectionalBar';
import { calculateLunarGeodesicDistance } from './model/geodesicDistance';
import { siteDisplayName } from './model/siteDisplayName';

interface Tier3PairwiseDeltaMatrixProps {
  pairwiseDelta: Tier3PairwiseDelta | null;
  coordinatesA?: { latitudeDeg: number; longitudeEastDeg: number };
  coordinatesB?: { latitudeDeg: number; longitudeEastDeg: number };
  className?: string;
}

export const Tier3PairwiseDeltaMatrix: React.FC<Tier3PairwiseDeltaMatrixProps> = ({
  pairwiseDelta,
  coordinatesA,
  coordinatesB,
  className = '',
}) => {
  if (!pairwiseDelta) {
    return (
      <section
        role="region"
        aria-label="Tier 3 Pairwise Delta Matrix"
        className={`bg-[var(--lm-color-canvas)]/80 p-5 rounded-xl border border-[var(--lm-color-border-subtle)] font-mono text-xs text-[var(--lm-color-text-muted)] ${className}`}
      >
        <span className="italic">
          Fewer than 2 feasible candidates passed Tier 1 vehicle constraints. Pairwise comparison is unavailable.
        </span>
      </section>
    );
  }

  const { siteA, siteB, deltas, terrainSensitivityComparison, objectiveTradeOffNarrative } = pairwiseDelta;
  const nameA = siteDisplayName(siteA.siteName, siteA.siteId);
  const nameB = siteDisplayName(siteB.siteName, siteB.siteId);
  const lowerRiskName =
    terrainSensitivityComparison.lowerRiskSite === 'siteA'
      ? nameA
      : terrainSensitivityComparison.lowerRiskSite === 'siteB'
      ? nameB
      : 'Equal';

  const geodesic = coordinatesA && coordinatesB ? calculateLunarGeodesicDistance(coordinatesA, coordinatesB) : null;

  return (
    <section
      role="region"
      aria-label={`Tier 3 Focused Pairwise Delta Matrix: ${nameA} vs ${nameB}`}
      data-testid="tier3-pairwise-matrix"
      className={`bg-[var(--lm-color-canvas)]/90 p-5 rounded-xl border border-[var(--lm-color-border-subtle)]/90 shadow-xl flex flex-col gap-4 font-mono text-xs ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--lm-color-border-subtle)]/80 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[var(--lm-color-text-primary)] text-sm tracking-wider uppercase">
            TIER 3: FOCUSED PAIRWISE DELTA MATRIX
          </span>
          <span className="text-[11px] text-[var(--lm-color-success)] px-2 py-0.5 rounded-full bg-[var(--lm-color-success-surface-strong)] border border-[var(--lm-color-success-border)] font-bold">
            ZERO COMPOSITE SCORE
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-[var(--lm-color-text-muted)]">
          <span>
            Comparing <strong className="text-[var(--lm-color-info)] font-bold">{nameA}</strong> vs{' '}
            <strong className="text-[var(--lm-color-series-b)] font-bold">{nameB}</strong>
          </span>
          {geodesic && (
            <span className="px-2 py-0.5 rounded bg-[var(--lm-color-surface)] border border-[var(--lm-color-border)] text-[var(--lm-color-info)] font-bold">
              Geodesic Sep: {geodesic.distanceKm.toFixed(1)} km
            </span>
          )}
        </div>
      </div>

      {/* Head-to-Head Hero Matchup Banner */}
      <HeadToHeadVersusBanner
        siteA={siteA}
        siteB={siteB}
        lowerRiskSite={terrainSensitivityComparison.lowerRiskSite}
      />

      {/* Visual Pairwise Delta Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--lm-color-border-subtle)] bg-[var(--lm-color-surface)]/30">
        <table className="w-full text-left border-collapse">
          <thead className="bg-[var(--lm-color-surface)]/80 text-[var(--lm-color-text-muted)] uppercase text-[11px] tracking-wider border-b border-[var(--lm-color-border-subtle)]">
            <tr>
              <th scope="col" className="py-2.5 px-3 font-semibold">Operational Metric</th>
              <th scope="col" className="py-2.5 px-3 text-[var(--lm-color-info)] font-bold">Site A ({nameA})</th>
              <th scope="col" className="py-2.5 px-3 text-[var(--lm-color-series-b)] font-bold">Site B ({nameB})</th>
              <th scope="col" className="py-2.5 px-3 font-semibold text-[var(--lm-color-text-secondary)]">Delta (A − B)</th>
              <th scope="col" className="py-2.5 px-3 text-center font-semibold">Visual Advantage</th>
              <th scope="col" className="py-2.5 px-3 font-semibold">Advantage Status</th>
              <th scope="col" className="py-2.5 px-3 font-semibold text-[var(--lm-color-text-muted)]">Operational Significance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--lm-color-border-subtle)]/60">
            {deltas.map((d) => {
              const deltaPrefix = d.absoluteDelta > 0 ? '+' : '';
              const percentPrefix = d.percentDelta > 0 ? '+' : '';
              return (
                <tr key={d.metricKey} className="hover:bg-[var(--lm-color-surface-strong)]/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-[var(--lm-color-text-secondary)]">{d.metricLabel}</td>
                  <td className="py-2.5 px-3 text-[var(--lm-color-info)] font-bold">
                    {d.valueA.toFixed(1)} {d.unit}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--lm-color-series-b)] font-bold">
                    {d.valueB.toFixed(1)} {d.unit}
                  </td>
                  <td className="py-2.5 px-3 text-[var(--lm-color-text-secondary)]">
                    <span className="font-bold">{deltaPrefix}{d.absoluteDelta.toFixed(1)} {d.unit}</span>
                    <span className="text-[11px] text-[var(--lm-color-text-muted)] ml-1.5">({percentPrefix}{d.percentDelta.toFixed(1)}%)</span>
                  </td>
                  <td className="py-2.5 px-3 flex items-center justify-center pt-3.5">
                    <PairwiseBidirectionalBar
                      favoredSite={d.favoredSite}
                      percentDelta={d.percentDelta}
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                        d.favoredSite === 'siteA'
                          ? 'bg-[var(--lm-color-info-surface-strong)] text-[var(--lm-color-info)] border border-[var(--lm-color-info-border)]'
                          : d.favoredSite === 'siteB'
                          ? 'bg-[var(--lm-color-series-b-surface-strong)] text-[var(--lm-color-series-b)] border border-[var(--lm-color-series-b-border)]'
                          : 'bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-muted)] border border-[var(--lm-color-border)]'
                      }`}
                    >
                      {d.favoredSite === 'siteA' ? 'FAVOR SITE A' : d.favoredSite === 'siteB' ? 'FAVOR SITE B' : 'TIE'}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[var(--lm-color-text-muted)] text-[11px] leading-relaxed">
                    {d.operationalSignificance}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Terrain Sensitivity Whisker Comparison */}
      <div className="bg-[var(--lm-color-surface)]/60 p-4 rounded-xl border border-[var(--lm-color-border-subtle)] flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--lm-color-text-secondary)] text-xs">LOLA DEM Terrain Sensitivity Whiskers</span>
            <span className="text-[11px] px-1.5 py-0.2 rounded bg-[var(--lm-color-surface-strong)] text-[var(--lm-color-text-secondary)] border border-[var(--lm-color-border)] uppercase">
              Deterministic DEM perturbation · not a confidence interval
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--lm-color-text-muted)]">
            <span>Site A Sensitivity: <strong className="text-[var(--lm-color-info)] font-bold">±{terrainSensitivityComparison.uncertaintySpanHoursA.toFixed(1)}h</strong></span>
            <span className="text-[var(--lm-color-text-muted)]">|</span>
            <span>Site B Sensitivity: <strong className="text-[var(--lm-color-series-b)] font-bold">±{terrainSensitivityComparison.uncertaintySpanHoursB.toFixed(1)}h</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-[var(--lm-color-canvas)]/70 p-2.5 rounded-lg border border-[var(--lm-color-border-subtle)]/90">
          <div className="flex flex-col text-right">
            <span className="text-[11px] uppercase text-[var(--lm-color-text-muted)] font-semibold">Whisker Ratio</span>
            <span className="text-[var(--lm-color-warning)] font-bold text-sm">{terrainSensitivityComparison.whiskerRatio.toFixed(1)}×</span>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-[var(--lm-color-success-surface-strong)] text-[var(--lm-color-success)] border border-[var(--lm-color-success-border)] font-bold text-xs shadow-sm">
            Lower Risk: {lowerRiskName}
          </span>
        </div>
      </div>

      {/* Objective Multi-Dimensional Trade-Off Narrative */}
      <div className="p-4 bg-[var(--lm-color-info-surface)] border border-[var(--lm-color-info-border)] rounded-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 bottom-0 w-1 bg-[var(--lm-color-info)]" />
        <span className="text-[var(--lm-color-text-muted)] font-bold block mb-1 uppercase text-[11px] tracking-wider">
          Objective Flight Dynamics Trade-Off Synthesis:
        </span>
        <p className="text-[var(--lm-color-info)] text-xs leading-relaxed italic pl-1">
          "{objectiveTradeOffNarrative}"
        </p>
      </div>
    </section>
  );
};
